import { isIsoDate } from "./domain/time";
import { DEFAULT_TIME_ZONE } from "./domain/confirmed";
import { getZonedDateTimeStatus } from "./domain/time";
import { createHash, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@/prisma/generated/client";
import { prisma as defaultPrisma } from "../db";
import { canConfirmPlanning, type PlanningActor } from "../auth/actor";
import { ensurePlanningActorRecord } from "./persistence";

export type RosterHistorySource = "copied_roster" | "manual";
export type RosterHistoryStatus = "shift" | "off";

export interface RosterHistoryEntry {
  readonly employeeId: string;
  readonly date: string;
  readonly status: RosterHistoryStatus;
  readonly startTime?: string;
  readonly endTime?: string;
}

export interface RosterHistoryImport {
  readonly startDate: string;
  readonly endDate: string;
  readonly source: RosterHistorySource;
  readonly employeeIds: readonly string[];
  readonly entries: readonly RosterHistoryEntry[];
}

export type RosterHistoryImportResult =
  | { readonly ok: true; readonly value: RosterHistoryImport }
  | { readonly ok: false; readonly code: "invalid_period" | "invalid_scope" | "invalid_entry" | "entry_outside_period" | "duplicate_entry" | "invalid_shift_time" };

type RosterHistoryImportError = Extract<RosterHistoryImportResult, { readonly ok: false }>["code"];
export type SaveRosterHistoryResult =
  | { readonly ok: true; readonly id: string; readonly version: number; readonly duplicate: boolean }
  | { readonly ok: false; readonly code: "forbidden" | RosterHistoryImportError };

export type DeleteRosterHistoryResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: "forbidden" | "not_found" };

export type RosterHistoryDay =
  | { readonly status: "unknown" }
  | { readonly status: "conflict" }
  | { readonly status: "off" }
  | { readonly status: "shift"; readonly startTime: string; readonly endTime: string };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isClockTime = (value: unknown): value is string => typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

/** Validuje pouze managerem potvrzené buňky; chybějící buňky zůstávají neznámé. */
export function validateRosterHistoryImport(value: unknown): RosterHistoryImportResult {
  if (!isRecord(value) || typeof value.startDate !== "string" || typeof value.endDate !== "string"
    || !isIsoDate(value.startDate) || !isIsoDate(value.endDate) || value.startDate > value.endDate) {
    return { ok: false, code: "invalid_period" };
  }
  if ((value.source !== "copied_roster" && value.source !== "manual") || !Array.isArray(value.employeeIds)
    || !value.employeeIds.length || value.employeeIds.some((id) => typeof id !== "string" || !id.trim())
    || new Set(value.employeeIds).size !== value.employeeIds.length || !Array.isArray(value.entries)) {
    return { ok: false, code: "invalid_scope" };
  }

  const employees = new Set(value.employeeIds as string[]);
  const seen = new Set<string>();
  const entries: RosterHistoryEntry[] = [];
  for (const entry of value.entries) {
    if (!isRecord(entry) || typeof entry.employeeId !== "string" || !employees.has(entry.employeeId)
      || typeof entry.date !== "string" || !isIsoDate(entry.date)
      || (entry.status !== "shift" && entry.status !== "off")) {
      return { ok: false, code: "invalid_entry" };
    }
    if (entry.date < value.startDate || entry.date > value.endDate) return { ok: false, code: "entry_outside_period" };
    const key = `${entry.employeeId}|${entry.date}`;
    if (seen.has(key)) return { ok: false, code: "duplicate_entry" };
    seen.add(key);

    if (entry.status === "off") {
      if (entry.startTime !== undefined || entry.endTime !== undefined) return { ok: false, code: "invalid_entry" };
      entries.push({ employeeId: entry.employeeId, date: entry.date, status: "off" });
      continue;
    }
    if (!isClockTime(entry.startTime) || !isClockTime(entry.endTime) || entry.startTime >= entry.endTime
      || getZonedDateTimeStatus(entry.date, entry.startTime, DEFAULT_TIME_ZONE) !== "valid"
      || getZonedDateTimeStatus(entry.date, entry.endTime, DEFAULT_TIME_ZONE) !== "valid") {
      return { ok: false, code: "invalid_shift_time" };
    }
    entries.push({ employeeId: entry.employeeId, date: entry.date, status: "shift", startTime: entry.startTime, endTime: entry.endTime });
  }

  return { ok: true, value: { startDate: value.startDate, endDate: value.endDate, source: value.source, employeeIds: [...employees], entries } };
}

/** Sloučí shodná překrytí; při rozdílných zdrojích nevybírá vítěze. */
export function resolveRosterHistoryDay(employeeId: string, date: string, imports: readonly RosterHistoryImport[]): RosterHistoryDay {
  if (!employeeId || !isIsoDate(date)) return { status: "unknown" };
  const matches = imports.flatMap((item) => item.entries.filter((entry) => entry.employeeId === employeeId && entry.date === date));
  if (matches.length === 0) return { status: "unknown" };
  const fingerprints = new Set(matches.map((entry) => `${entry.status}|${entry.startTime ?? ""}|${entry.endTime ?? ""}`));
  if (fingerprints.size > 1) return { status: "conflict" };
  const entry = matches[0];
  return entry.status === "off" ? { status: "off" } : { status: "shift", startTime: entry.startTime!, endTime: entry.endTime! };
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/** Ukládá pouze výslovné buňky; chybějící dny se nikdy nedoplní jako volno. */
export class PrismaRosterHistoryStore {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  /** Trvale odstraní jeden import a jeho navázané řádky; ostatní importy ani rozpisy nemění. */
  async delete(actor: PlanningActor, id: string): Promise<DeleteRosterHistoryResult> {
    if (!canConfirmPlanning(actor)) return { ok: false, code: "forbidden" };
    const importId = typeof id === "string" ? id.trim() : "";
    if (!importId) return { ok: false, code: "not_found" };

    return this.db.$transaction(async (tx) => {
      if (process.env.PLANNING_AUTH_MODE?.trim().toLowerCase() === "database") {
        const account = await tx.appUser.findUnique({
          where: { id: actor.userId },
          select: { role: true, active: true, passwordHash: true, mustChangePassword: true },
        });
        if (!account || account.role !== "manager" || !account.active || !account.passwordHash || account.mustChangePassword) {
          return { ok: false, code: "forbidden" } as const;
        }
      }

      const record = await tx.rosterHistoryImport.findUnique({ where: { id: importId }, select: { id: true } });
      if (!record) return { ok: false, code: "not_found" } as const;

      await tx.rosterHistoryEntry.deleteMany({ where: { importId } });
      await tx.rosterHistoryImportEmployee.deleteMany({ where: { importId } });
      await tx.rosterHistoryImport.delete({ where: { id: importId } });
      return { ok: true } as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async save(actor: PlanningActor, raw: unknown): Promise<SaveRosterHistoryResult> {
    if (!canConfirmPlanning(actor)) return { ok: false, code: "forbidden" };
    const parsed = validateRosterHistoryImport(raw);
    if (!parsed.ok) return parsed;

    const input = parsed.value;
    const employeeIds = [...input.employeeIds].sort();
    const entries = [...input.entries].sort((a, b) => a.employeeId.localeCompare(b.employeeId) || a.date.localeCompare(b.date));
    const scopeKey = hash({ startDate: input.startDate, endDate: input.endDate, employeeIds });
    const fingerprint = hash({ scopeKey, source: input.source, entries });

    return this.db.$transaction(async (tx) => {
      if (process.env.PLANNING_AUTH_MODE?.trim().toLowerCase() === "database") {
        const account = await tx.appUser.findUnique({
          where: { id: actor.userId },
          select: { role: true, active: true, passwordHash: true, mustChangePassword: true },
        });
        if (!account || account.role !== "manager" || !account.active || !account.passwordHash || account.mustChangePassword) {
          return { ok: false, code: "forbidden" } as const;
        }
      }

      const latest = await tx.rosterHistoryImport.findFirst({
        where: { scopeKey },
        orderBy: { version: "desc" },
        select: { id: true, version: true, fingerprint: true },
      });
      if (latest && (latest.fingerprint === fingerprint || latest.fingerprint === hash({ fingerprint, version: latest.version }))) {
        return { ok: true, id: latest.id, version: latest.version, duplicate: true } as const;
      }
      const existing = await tx.rosterHistoryImport.findUnique({ where: { fingerprint }, select: { id: true } });
      const version = (latest?.version ?? 0) + 1;
      const versionFingerprint = existing ? hash({ fingerprint, version }) : fingerprint;
      const createdBy = await ensurePlanningActorRecord(tx, actor);
      const record = await tx.rosterHistoryImport.create({
        data: {
          id: randomUUID(),
          scopeKey,
          fingerprint: versionFingerprint,
          version,
          periodStart: input.startDate,
          periodEnd: input.endDate,
          source: input.source,
          createdById: createdBy.id,
        },
        select: { id: true, version: true },
      });
      await tx.rosterHistoryImportEmployee.createMany({ data: employeeIds.map((employeeId) => ({ importId: record.id, employeeId })) });
      await tx.rosterHistoryEntry.createMany({ data: entries.map((entry) => ({
        importId: record.id,
        employeeId: entry.employeeId,
        date: entry.date,
        status: entry.status,
        startTime: entry.status === "shift" ? entry.startTime! : null,
        endTime: entry.status === "shift" ? entry.endTime! : null,
      })) });
      return { ok: true, id: record.id, version: record.version, duplicate: false } as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
