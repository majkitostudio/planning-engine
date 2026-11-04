import { canConfirmPlanning, type PlanningActor } from "../auth/actor";
import type { PlanningPersistence } from "./persistence";

export interface PlanningAuditEntry {
  readonly action?: "removed";
  readonly proposalId: string;
  readonly weekStart: string | null;
  readonly month?: string | null;
  readonly confirmedByEmail: string | null;
  readonly confirmedAt: string;
}

export type PlanningAuditResult =
  | { readonly ok: true; readonly entries: readonly PlanningAuditEntry[] }
  | { readonly ok: false; readonly code: "forbidden" };

/**
 * Čtecí audit je v prvním řezu dostupný jen managerovi, stejně jako potvrzení.
 * Vrací uložená potvrzení a odstranění měsíčních rozpisů.
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
      ...(event.action === "planning.removed" ? { action: "removed" as const } : {}),
      weekStart: event.details.weekStart ?? null,
      ...(event.entityType === "monthly_planning_run" ? { month: event.details.month ?? null } : {}),
      confirmedByEmail: event.details.email ?? null,
      confirmedAt: event.createdAt,
    })),
  };
}
