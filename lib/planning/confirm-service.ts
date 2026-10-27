/**
 * Potvrzení návrhu manažerem.
 *
 * Bere proposal z in-memory registru, znovu vyhodnotí blokátory a teprve potom
 * vytvoří `ConfirmedPlan`. Neznámé proposal ID se nepotvrzuje.
 */

import {
  createConfirmedPlan,
  evaluateConfirmation,
  type ConfirmationBlocker,
} from "./confirmation";
import type { PlanningRunRegistry, StoredPlanningRun } from "./run-registry";
import { toPlanningRunView, type PlanningRunView } from "./view-model";

export type ConfirmRunResult =
  | {
      readonly ok: true;
      readonly view: PlanningRunView;
      readonly alreadyConfirmed: boolean;
    }
  | {
      readonly ok: false;
      readonly code: "unknown_proposal" | "confirmation_blocked";
      readonly message: string;
      readonly blockers: readonly ConfirmationBlocker[];
    };

export function confirmRun(
  registry: PlanningRunRegistry,
  proposalId: string,
  confirmedAtMs: number = Date.now(),
): ConfirmRunResult {
  const stored = registry.get(proposalId);

  if (!stored) {
    return {
      ok: false,
      code: "unknown_proposal",
      message: `Návrh "${proposalId}" není v tomto procesu známý.`,
      blockers: [],
    };
  }

  if (stored.confirmedPlan) {
    return {
      ok: true,
      view: buildView(stored),
      alreadyConfirmed: true,
    };
  }

  const confirmation = evaluateConfirmation(stored.result);
  if (!confirmation.allowed) {
    return {
      ok: false,
      code: "confirmation_blocked",
      message: confirmation.blockers.map((blocker) => blocker.message).join(" "),
      blockers: confirmation.blockers,
    };
  }

  const confirmedPlan = createConfirmedPlan(
    stored.result,
    confirmedAtMs,
  );
  const updated = registry.setConfirmedPlan(proposalId, confirmedPlan);

  if (!updated) {
    return {
      ok: false,
      code: "unknown_proposal",
      message: `Návrh "${proposalId}" zmizel z registru před potvrzením.`,
      blockers: [],
    };
  }

  return {
    ok: true,
    view: buildView(updated),
    alreadyConfirmed: false,
  };
}

function buildView(stored: StoredPlanningRun): PlanningRunView {
  return toPlanningRunView(stored.result, {
    scenarioId: stored.scenarioId,
    scenarioLabel: stored.scenarioLabel,
    providerName: stored.providerName,
    mode: stored.mode,
    employees: stored.input.employees.map(({ id, displayName }) => ({
      id,
      displayName,
    })),
    confirmedPlan: stored.confirmedPlan,
  });
}
