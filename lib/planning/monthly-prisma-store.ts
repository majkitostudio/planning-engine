import { Prisma, type PrismaClient } from "@/prisma/generated/client";
import { prisma as defaultPrisma } from "../db";
import { canConfirmPlanning, type PlanningActor } from "../auth/actor";
import { validateMonthlyInput } from "./domain/month-input";
import type { MonthlyValidation } from "./domain/month-validation";
import { loadMonthlyBoundary, loadMonthlyRosterSnapshot } from "./monthly-history-service";
import { isMonthlyPlanDraft, validateMonthlyDraft } from "./monthly-planning";
import { ensurePlanningActorRecord } from "./persistence";
import type { MonthlyDraftRecord, MonthlyReadResult, MonthlyRunSummary, StoredMonthlyRun } from "./monthly-store";

type StoredRow = { id: string; month: string; input: unknown; draft: unknown; mode: string; providerName: string; confirmedAt: Date | null; confirmedById: string | null; deletedAt: Date | null };
type ConfirmResult = { ok: true; alreadyConfirmed: boolean; run: StoredMonthlyRun } | { ok: false; code: "forbidden" | "not_found" | "confirmation_blocked" | "month_conflict" | "account_changed"; validation?: MonthlyValidation };

function isKnownStoredMode(mode: string): mode is StoredMonthlyRun["mode"] {
  return mode === "simulated" || mode === "gemini" || mode === "cloudflare" || mode === "ortools";
}

function fromRow(row: StoredRow): StoredMonthlyRun | null {
  const input = validateMonthlyInput(row.input);
  if (row.deletedAt || !input.ok || input.value.month !== row.month || !isMonthlyPlanDraft(row.draft, row.month, { allowLegacyEmptyAlternativeId: true }) || !isKnownStoredMode(row.mode) || (!!row.confirmedAt !== !!row.confirmedById)) return null;
  return { id: row.id, input: input.value, draft: row.draft, mode: row.mode, providerName: row.providerName, confirmed: row.confirmedAt && row.confirmedById ? { by: row.confirmedById, at: row.confirmedAt.toISOString() } : null };
}

export class PrismaMonthlyStore {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async create(record: MonthlyDraftRecord): Promise<void> {
    if (!record.id || !validateMonthlyInput(record.input).ok || !isMonthlyPlanDraft(record.draft, record.input.month)) throw new Error("Neplatný měsíční návrh.");
    await this.db.monthlyPlanningRun.create({ data: { id: record.id, month: record.input.month, providerName: record.providerName, mode: record.mode, input: record.input as unknown as Prisma.InputJsonValue, draft: record.draft as unknown as Prisma.InputJsonValue } });
  }

  async get(id: string): Promise<StoredMonthlyRun | null> {
    const row = await this.db.monthlyPlanningRun.findUnique({ where: { id } });
    return row ? fromRow(row) : null;
  }

  async list(month: string): Promise<MonthlyRunSummary[]> {
    const rows = await this.db.monthlyPlanningRun.findMany({ where: { month, deletedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, month: true, confirmedAt: true, createdAt: true } });
    return rows.map((row) => ({ id: row.id, month: row.month, confirmed: !!row.confirmedAt, createdAt: row.createdAt.toISOString() }));
  }

  async getConfirmed(month: string): Promise<MonthlyReadResult> {
    const rows = await this.db.monthlyPlanningRun.findMany({ where: { month, confirmedAt: { not: null }, deletedAt: null }, take: 2 });
    if (rows.length > 1) return { ok: false, code: "ambiguous" };
    if (rows.length === 0) return { ok: true, run: null };
    const run = fromRow(rows[0]);
    return run?.confirmed ? { ok: true, run } : { ok: false, code: "ambiguous" };
  }

  async remove(id: string, actor: PlanningActor, now: Date, expectedConfirmed: boolean): Promise<{ ok: true } | { ok: false; code: "forbidden" | "not_found" | "changed" }> {
    if (!canConfirmPlanning(actor)) return { ok: false, code: "forbidden" };
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.db.$transaction(async (tx) => {
          let databaseActor: { id: string } | null = null;
          if (process.env.PLANNING_AUTH_MODE?.trim().toLowerCase() === "database") {
            const account = await tx.appUser.findUnique({ where: { id: actor.userId }, select: { id: true, active: true, role: true, mustChangePassword: true, passwordHash: true } });
            if (!account?.active || account.role !== "manager" || account.mustChangePassword || !account.passwordHash) return { ok: false, code: "forbidden" } as const;
            databaseActor = account;
          }
          const row = await tx.monthlyPlanningRun.findUnique({ where: { id } });
          if (!row || row.deletedAt) return { ok: false, code: "not_found" } as const;
          if (!!row.confirmedAt !== expectedConfirmed) return { ok: false, code: "changed" } as const;
          const changed = await tx.monthlyPlanningRun.updateMany({ where: { id, deletedAt: null, confirmedAt: row.confirmedAt }, data: { deletedAt: now } });
          if (changed.count !== 1) return { ok: false, code: "changed" } as const;
          const actorRecord = databaseActor ?? await ensurePlanningActorRecord(tx, actor);
          await tx.auditEvent.create({ data: { action: "planning.removed", entityType: "monthly_planning_run", entityId: id, actorId: actorRecord.id, createdAt: now, details: { month: row.month, confirmed: expectedConfirmed, email: actor.email } } });
          return { ok: true } as const;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        const retryable = typeof error === "object" && error !== null && "code" in error && error.code === "P2034";
        if (!retryable || attempt >= 2) throw error;
      }
    }
  }

  async confirm(id: string, actor: PlanningActor, now: Date): Promise<ConfirmResult> {
    if (!canConfirmPlanning(actor)) return { ok: false, code: "forbidden" };
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.confirmTransaction(id, actor, now);
      } catch (error) {
        const retryable = typeof error === "object" && error !== null && "code" in error && error.code === "P2034";
        if (!retryable || attempt >= 2) throw error;
      }
    }
  }

  private async confirmTransaction(id: string, actor: PlanningActor, now: Date): Promise<ConfirmResult> {
    return this.db.$transaction(async (tx) => {
      let databaseActor: { id: string } | null = null;
      if (process.env.PLANNING_AUTH_MODE?.trim().toLowerCase() === "database") {
        const account = await tx.appUser.findUnique({ where: { id: actor.userId }, select: { id: true, active: true, role: true, mustChangePassword: true, passwordHash: true } });
        if (!account?.active || account.role !== "manager" || account.mustChangePassword || !account.passwordHash) return { ok: false, code: "forbidden" } as const;
        databaseActor = account;
      }
      const row = await tx.monthlyPlanningRun.findUnique({ where: { id } });
      if (!row || row.deletedAt) return { ok: false, code: "not_found" } as const;
      const run = fromRow(row);
      if (!run) return { ok: false, code: "confirmation_blocked" } as const;
      if (run.confirmed) return { ok: true, alreadyConfirmed: true, run } as const;
      const other = await tx.monthlyPlanningRun.findFirst({ where: { month: run.input.month, confirmedAt: { not: null }, deletedAt: null, id: { not: id } }, select: { id: true } });
      if (other) return { ok: false, code: "month_conflict" } as const;
      const boundary = await loadMonthlyBoundary(run.input.month, run.input.employees.map((employee) => employee.id), tx);
      const currentRoster = run.input.planningRange ? await loadMonthlyRosterSnapshot(run.input.month, run.input.employees.map((employee) => employee.id), tx) : undefined;
      const validation = validateMonthlyDraft(run.input, run.draft, boundary, run.mode, currentRoster);
      if (!validation.canConfirm) return { ok: false, code: "confirmation_blocked", validation } as const;
      const actorRecord = databaseActor ?? await ensurePlanningActorRecord(tx, actor);
      const changed = await tx.monthlyPlanningRun.updateMany({ where: { id, confirmedAt: null, deletedAt: null }, data: { confirmedAt: now, confirmedById: actorRecord.id } });
      if (changed.count !== 1) {
        const current = await tx.monthlyPlanningRun.findUnique({ where: { id } });
        const currentRun = current ? fromRow(current) : null;
        return currentRun?.confirmed ? { ok: true, alreadyConfirmed: true, run: currentRun } as const : { ok: false, code: "account_changed" } as const;
      }
      await tx.auditEvent.create({ data: { action: "planning.confirmed", entityType: "monthly_planning_run", entityId: id, actorId: actorRecord.id, createdAt: now, details: { month: run.input.month, email: actor.email } } });
      return { ok: true, alreadyConfirmed: false, run: { ...run, confirmed: { by: actorRecord.id, at: now.toISOString() } } } as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
