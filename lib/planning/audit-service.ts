import { canConfirmPlanning, type PlanningActor } from "../auth/actor";
import type { PlanningPersistence } from "./persistence";

export interface PlanningAuditEntry {
  readonly proposalId: string;
  readonly weekStart: string | null;
  readonly confirmedByEmail: string | null;
  readonly confirmedAt: string;
}

export type PlanningAuditResult =
  | { readonly ok: true; readonly entries: readonly PlanningAuditEntry[] }
  | { readonly ok: false; readonly code: "forbidden" };

/**
 * Čtecí audit je v prvním řezu dostupný jen managerovi, stejně jako potvrzení.
 * Vrací výhradně již uložené události `planning.confirmed`.
 */
export async function readPlanningAudit(
  persistence: PlanningPersistence,
  actor: PlanningActor,
): Promise<PlanningAuditResult> {
  if (!canConfirmPlanning(actor)) return { ok: false, code: "forbidden" };

  const events = await persistence.listAuditEvents();

  return {
    ok: true,
    entries: events.map((event) => ({
      proposalId: event.entityId,
      weekStart: event.details.weekStart ?? null,
      confirmedByEmail: event.details.email ?? null,
      confirmedAt: event.createdAt,
    })),
  };
}
