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
import type { PlanningActor } from "../auth/actor";
import type { PlanningPersistence } from "./persistence";
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

export async function confirmPersistedRun(
  persistence: PlanningPersistence,
  proposalId: string,
  actor: PlanningActor,
  confirmedAtMs: number = Date.now(),
): Promise<ConfirmRunResult> {
  const snapshot = await persistence.getRun(proposalId);

  if (!snapshot) {
    return {
      ok: false,
      code: "unknown_proposal",
      message: `Návrh "${proposalId}" není v úložišti známý.`,
      blockers: [],
    };
  }

  if (snapshot.confirmedPlan) {
    return {
      ok: true,
      view: buildPersistedView(snapshot),
      alreadyConfirmed: true,
    };
  }

  const confirmation = evaluateConfirmation(snapshot.result);
  if (!confirmation.allowed) {
    return {
      ok: false,
      code: "confirmation_blocked",
      message: confirmation.blockers.map((blocker) => blocker.message).join(" "),
      blockers: confirmation.blockers,
    };
  }

  const persisted = await persistence.confirmRun(
    proposalId,
    snapshot.result.proposal.plan.assignments,
    actor,
    new Date(confirmedAtMs),
  );

  if (!persisted) {
    return {
      ok: false,
      code: "unknown_proposal",
      message: `Návrh "${proposalId}" zmizel z úložiště před potvrzením.`,
      blockers: [],
    };
  }

  return {
    ok: true,
    view: buildPersistedView(persisted.snapshot),
    alreadyConfirmed: persisted.alreadyConfirmed,
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

function buildPersistedView(
  snapshot: import("./persistence").PlanningRunSnapshot,
): PlanningRunView {
  return toPlanningRunView(snapshot.result, {
    scenarioId: snapshot.scenarioId,
    scenarioLabel: snapshot.scenarioLabel,
    providerName: snapshot.providerName,
    mode: snapshot.mode,
    employees: snapshot.input.employees.map(({ id, displayName }) => ({
      id,
      displayName,
    })),
    confirmedPlan: snapshot.confirmedPlan,
  });
}
