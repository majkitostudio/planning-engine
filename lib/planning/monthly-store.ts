import { canConfirmPlanning, type PlanningActor } from "../auth/actor";
import { validateMonthlyInput, type MonthlyPlanningInput } from "./domain/month-input";
import type { MonthlyBoundaryData, MonthlyValidation } from "./domain/month-validation";
import { isMonthlyPlanDraft, validateMonthlyDraft, type MonthlyPlanDraft } from "./monthly-planning";
import type { MonthlyPlanningMode } from "./runtime-types";

export interface MonthlyDraftRecord {
  readonly id: string;
  readonly input: MonthlyPlanningInput;
  readonly draft: MonthlyPlanDraft;
  readonly providerName: string;
  readonly mode: MonthlyPlanningMode;
}
export interface StoredMonthlyRun extends MonthlyDraftRecord {
  readonly confirmed: { readonly by: string; readonly at: string } | null;
}
export type MonthlyConfirmationResult =
  | { readonly ok: true; readonly alreadyConfirmed: boolean; readonly run: StoredMonthlyRun }
  | { readonly ok: false; readonly code: "forbidden" | "not_found" | "confirmation_blocked" | "month_conflict"; readonly validation?: MonthlyValidation };

export type MonthlyReadResult = { readonly ok: true; readonly run: StoredMonthlyRun | null } | { readonly ok: false; readonly code: "ambiguous" };
export type MonthlyRunSummary = { readonly id: string; readonly month: string; readonly confirmed: boolean; readonly createdAt: string };

/** Paměťový režim je pouze pro izolované testy; nenahrazuje databázové úložiště. */
export class InMemoryMonthlyStore {
  private readonly runs = new Map<string, StoredMonthlyRun>();
  private readonly deleted = new Set<string>();
  private readonly createdAt = new Map<string, string>();
  private readonly audit: { id: string; actorId: string; at: string; action: "confirmed" | "removed" }[] = [];

  async create(record: MonthlyDraftRecord): Promise<void> {
    if (this.runs.has(record.id)) throw new Error("Návrh už existuje.");
    if (!record.id || !validateMonthlyInput(record.input).ok || !isMonthlyPlanDraft(record.draft, record.input.month)) throw new Error("Neplatný měsíční návrh.");
    this.runs.set(record.id, structuredClone({ ...record, confirmed: null }));
    this.createdAt.set(record.id, new Date().toISOString());
  }

  async list(month: string): Promise<MonthlyRunSummary[]> {
    return [...this.runs.values()].filter((run) => !this.deleted.has(run.id) && run.input.month === month)
      .map((run) => ({ id: run.id, month, confirmed: !!run.confirmed, createdAt: this.createdAt.get(run.id)! })).reverse();
  }

  async get(id: string): Promise<StoredMonthlyRun | null> {
    const run = this.runs.get(id);
    return run && !this.deleted.has(id) ? structuredClone(run) : null;
  }

  async remove(id: string, actor: PlanningActor, now: Date, expectedConfirmed: boolean): Promise<{ ok: true } | { ok: false; code: "forbidden" | "not_found" | "changed" }> {
    if (!canConfirmPlanning(actor)) return { ok: false, code: "forbidden" };
    if (!this.runs.has(id) || this.deleted.has(id)) return { ok: false, code: "not_found" };
    if (!!this.runs.get(id)?.confirmed !== expectedConfirmed) return { ok: false, code: "changed" };
    this.deleted.add(id);
    this.audit.push({ id, actorId: actor.userId, at: now.toISOString(), action: "removed" });
    return { ok: true };
  }

  async getConfirmed(month: string): Promise<MonthlyReadResult> {
    const rows = [...this.runs.values()].filter((run) => !this.deleted.has(run.id) && run.input.month === month && run.confirmed);
    if (rows.length > 1) return { ok: false, code: "ambiguous" };
    return { ok: true, run: rows[0] ? structuredClone(rows[0]) : null };
  }

  async confirm(id: string, actor: PlanningActor, boundary: MonthlyBoundaryData, now: Date): Promise<MonthlyConfirmationResult> {
    if (!canConfirmPlanning(actor)) return { ok: false, code: "forbidden" };
    const run = this.runs.get(id);
    if (!run || this.deleted.has(id)) return { ok: false, code: "not_found" };
    if (run.confirmed) return { ok: true, alreadyConfirmed: true, run: structuredClone(run) };
    if ([...this.runs.values()].some((other) => other.id !== id && !this.deleted.has(other.id) && other.input.month === run.input.month && other.confirmed)) return { ok: false, code: "month_conflict" };
    const validation = validateMonthlyDraft(run.input, run.draft, boundary, run.mode);
    if (!validation.canConfirm) return { ok: false, code: "confirmation_blocked", validation };
    const at = now.toISOString();
    const confirmed = { ...run, confirmed: { by: actor.userId, at } };
    this.runs.set(id, confirmed);
    this.audit.push({ id, actorId: actor.userId, at, action: "confirmed" });
    return { ok: true, alreadyConfirmed: false, run: structuredClone(confirmed) };
  }

  auditEvents() { return structuredClone(this.audit); }
}
