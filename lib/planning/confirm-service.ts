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
import type { ReplacementRunSnapshot } from "./persistence";
import type { PlanningRunRegistry, StoredPlanningRun } from "./run-registry";
import { evaluateReplacementOption } from "./replacement-service";
import { timeOffChangeId } from "./replacement-service";
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

export type ConfirmReplacementResult =
  | {
      readonly ok: true;
      readonly snapshot: ReplacementRunSnapshot;
      readonly alreadyConfirmed: boolean;
    }
  | {
      readonly ok: false;
      readonly code: "unknown_replacement" | "replacement_confirmation_blocked";
      readonly message: string;
      readonly blockers: readonly ConfirmationBlocker[];
    };

/**
 * Znovu načte pracovní snapshot, zkontroluje základ a deterministicky přepočte
 * vybranou variantu těsně před uložením nové verze týdne.
 */
export async function confirmPersistedReplacementRun(
  persistence: PlanningPersistence,
  replacementId: string,
  selectedOptionId: string,
  actor: PlanningActor,
  confirmedAtMs: number = Date.now(),
  acceptedTimeOffChangeIds: readonly string[] = [],
): Promise<ConfirmReplacementResult> {
  const snapshot = await persistence.getReplacementRun(replacementId);
  if (!snapshot) {
    return {
      ok: false,
      code: "unknown_replacement",
      message: `Návrh náhrady "${replacementId}" není v úložišti známý.`,
      blockers: [],
    };
  }

  if (snapshot.confirmedPlan) {
    return { ok: true, snapshot, alreadyConfirmed: true };
  }

  const blockers: ConfirmationBlocker[] = [];
  if (snapshot.staffingSource !== "saved") {
    blockers.push({
      code: "replacement_not_verified",
      message: "U tohoto staršího návrhu nelze ověřit zdroj potřebného obsazení. Zkontrolujte nastavení a vytvořte náhradu znovu.",
    });
  }
  if (snapshot.basePlan.proposalId !== snapshot.result.request.baseProposalId) {
    blockers.push({
      code: "replacement_base_stale",
      message: "Výchozí verze týdne už neodpovídá základu incidentu.",
    });
  }

  const option = snapshot.result.options.find(
    (candidate) => candidate.id === selectedOptionId,
  );
  if (!option) {
    blockers.push({
      code: "replacement_option_missing",
      message: "Vybraná varianta náhrady v pracovním snapshotu neexistuje.",
    });
  }

  if (snapshot.result.completeness !== "complete") {
    blockers.push({
      code: "replacement_partial_blocked",
      message: "Návrh náhrady nemá tři odlišné dostupné varianty.",
    });
  }

  const requiredTimeOffAcceptances = option?.impact.timeOffChanges
    .filter((change) => change.kind === "approved_vacation")
    .map((change) => timeOffChangeId(change.employeeId, change.originalDate)) ?? [];
  const suppliedAcceptances = [...new Set(acceptedTimeOffChangeIds)].sort();
  const expectedAcceptances = [...new Set(requiredTimeOffAcceptances)].sort();
  if (
    option &&
    (suppliedAcceptances.length !== expectedAcceptances.length ||
      suppliedAcceptances.some((id, index) => id !== expectedAcceptances[index]))
  ) {
    blockers.push({
      code: "replacement_time_off_acceptance_required",
      message:
        "Každou změnu schválené dovolené musí manager výslovně přijmout. Datum náhradního volna zůstává nevyplněné a musí být domluveno samostatně.",
    });
  }

  let confirmedOption = option;
  if (option && blockers.length === 0) {
    const revalidated = evaluateReplacementOption(
      snapshot.input,
      snapshot.basePlan,
      snapshot.result.request,
      option.draft,
      suppliedAcceptances,
    );
    confirmedOption = revalidated;
    if (revalidated.validation.status === "not_verified") {
      blockers.push({
        code: "replacement_not_verified",
        message: "Vybraná varianta náhrady obsahuje neověřenou kontrolu.",
      });
    } else if (revalidated.validation.status !== "valid") {
      blockers.push({
        code: "replacement_needs_changes",
        message: "Vybraná varianta náhrady porušuje pravidla nebo pokrytí.",
      });
    }
    if (blockers.length > 0) {
      blockers.push({
        code: "replacement_revalidation_failed",
        message: "Vybranou variantu se před potvrzením nepodařilo znovu ověřit.",
      });
    }
  }

  if (blockers.length > 0 || !option) {
    return {
      ok: false,
      code: "replacement_confirmation_blocked",
      message: blockers.map((blocker) => blocker.message).join(" "),
      blockers,
    };
  }

  const persisted = await persistence.confirmReplacementRun(
    replacementId,
    selectedOptionId,
    confirmedOption?.draft.assignments ?? option.draft.assignments,
    actor,
    new Date(confirmedAtMs),
    suppliedAcceptances,
    confirmedOption,
  );
  if (!persisted) {
    return {
      ok: false,
      code: "unknown_replacement",
      message: `Návrh náhrady "${replacementId}" zmizel z úložiště před potvrzením.`,
      blockers: [],
    };
  }

  return {
    ok: true,
    snapshot: persisted.snapshot,
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
