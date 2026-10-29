/**
 * Pravidla pro potvrzení návrhu manažerem.
 *
 * Potvrzení je samostatný krok mimo AI i validaci. `ready_for_review` není
 * schválení a `ConfirmedPlan` vzniká až tady. Částečně neúplný návrh zůstává
 * blokovaný podle rozhodnutí OQ23.
 */

import type { ConfirmedPlan, PlanningRunResult } from "./domain/types";

export type ConfirmationBlockerCode =
  | "run_not_verified"
  | "run_needs_changes"
  | "partial_blocked_by_oq23"
  | "not_ready_for_review"
  | "replacement_not_verified"
  | "replacement_needs_changes"
  | "replacement_partial_blocked"
  | "replacement_option_missing"
  | "replacement_base_stale"
  | "replacement_revalidation_failed";

export interface ConfirmationBlocker {
  readonly code: ConfirmationBlockerCode;
  readonly message: string;
}

export interface ConfirmationState {
  readonly allowed: boolean;
  readonly blockers: readonly ConfirmationBlocker[];
  readonly confirmedPlan: ConfirmedPlan | null;
  readonly alreadyConfirmed: boolean;
}

/**
 * Vyhodnotí, zda smí manažer potvrdit daný běh.
 *
 * Podmínka je záměrně přísná: `ready_for_review` + `complete`. Cokoli jiného
 * je blokované s konkrétním důvodem. Blokátory se nevydávají za nález validace.
 */
export function evaluateConfirmation(
  result: PlanningRunResult,
  confirmedPlan: ConfirmedPlan | null = null,
): ConfirmationState {
  const blockers: ConfirmationBlocker[] = [];

  if (result.status === "not_verified") {
    blockers.push({
      code: "run_not_verified",
      message:
        "Validace neproběhla spolehlivě. Návrh nelze potvrdit, dokud se neověří.",
    });
  }

  if (result.status === "needs_changes") {
    blockers.push({
      code: "run_needs_changes",
      message:
        "Validace našla problémy nebo chybí obsazení. Nejprve je potřeba návrh upravit.",
    });
  }

  if (result.completeness !== "complete") {
    blockers.push({
      code: "partial_blocked_by_oq23",
      message:
        "Návrh je částečně neúplný. Podle rozhodnutí OQ23 je potvrzení neúplného návrhu zakázané.",
    });
  }

  if (result.status === "ready_for_review" && blockers.length === 0) {
    // `ready_for_review` je jediný stav, který smí do potvrzení.
  } else if (blockers.length === 0) {
    blockers.push({
      code: "not_ready_for_review",
      message: "Návrh není připravený ke kontrole.",
    });
  }

  return {
    allowed: blockers.length === 0 && confirmedPlan === null,
    blockers,
    confirmedPlan,
    alreadyConfirmed: confirmedPlan !== null,
  };
}

/** Vytvoří potvrzený plán až po ověření; čas dodává volající. */
export function createConfirmedPlan(
  result: PlanningRunResult,
  confirmedAtMs: number,
): ConfirmedPlan {
  return {
    proposalId: result.proposal.id,
    weekStart: result.weekStart,
    assignments: result.proposal.plan.assignments,
    confirmedAt: new Date(confirmedAtMs).toISOString(),
  };
}
