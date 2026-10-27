/**
 * Mapování výsledku orchestrátoru na serializovatelný model pro UI.
 *
 * Model je záměrně jen čtecí: neobsahuje žádné odvozené „schváleno“.
 * `ready_for_review` zůstává „připraveno ke kontrole“, dokud manažer
 * neprovede samostatné potvrzení.
 */

import {
  evaluateConfirmation,
  type ConfirmationState,
} from "./confirmation";
import type {
  Alternative,
  AssignmentChange,
  ConfirmedPlan,
  CoverageLine,
  Explanation,
  IsoDate,
  PlanValidationResult,
  PlanningFailure,
  PlanningFailureCode,
  PlanningRunResult,
  PlanningRunStatus,
  ProposedAssignment,
} from "./domain/types";
import type { PlanningProviderMode } from "./runtime-types";

export type PlanningViewTone = "neutral" | "info" | "warning" | "danger";

export interface PlanningEmployeeView {
  readonly id: string;
  readonly displayName: string;
}

export interface PlanningProposalLayer {
  readonly assignments: readonly ProposedAssignment[];
  readonly explanations: readonly Explanation[];
  readonly alternatives: readonly Alternative[];
  readonly assumptions: readonly string[];
}

export interface CoverageSummary {
  readonly required: number;
  readonly assigned: number;
  readonly missing: number;
  readonly understaffedSlots: number;
  readonly overstaffedSlots: number;
}

export interface ChangesSummary {
  readonly added: number;
  readonly removed: number;
  readonly unchanged: number;
}

export interface PlanningRunView {
  readonly proposalId: string;
  readonly weekStart: IsoDate;
  readonly scenarioId: string;
  readonly scenarioLabel: string;
  readonly providerName: string;
  readonly mode: PlanningProviderMode;
  readonly status: PlanningRunStatus;
  readonly statusLabel: string;
  readonly statusTone: PlanningViewTone;
  readonly completeness: "complete" | "partial";
  readonly completenessLabel: string;
  readonly completenessTone: PlanningViewTone;
  readonly employees: readonly PlanningEmployeeView[];
  readonly proposal: PlanningProposalLayer;
  readonly changes: readonly AssignmentChange[];
  readonly changesSummary: ChangesSummary;
  readonly coverage: readonly CoverageLine[];
  readonly coverageSummary: CoverageSummary;
  readonly validation: PlanValidationResult;
  readonly confirmation: ConfirmationState;
  readonly confirmationLabel: string;
  readonly confirmationTone: PlanningViewTone;
}

export interface PlanningFailureView {
  readonly code: PlanningFailureCode;
  readonly title: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, string | number | boolean>>;
}

export interface PlanningRunViewContext {
  readonly scenarioId: string;
  readonly scenarioLabel: string;
  readonly providerName: string;
  readonly mode: PlanningProviderMode;
  readonly employees: readonly PlanningEmployeeView[];
  readonly confirmedPlan?: ConfirmedPlan | null;
}

const STATUS_LABELS: Record<PlanningRunStatus, string> = {
  not_verified: "Nepodařilo se ověřit",
  needs_changes: "Vyžaduje změny",
  ready_for_review: "Připraveno ke kontrole",
};

const STATUS_TONES: Record<PlanningRunStatus, PlanningViewTone> = {
  not_verified: "warning",
  needs_changes: "danger",
  ready_for_review: "info",
};

const FAILURE_TITLES: Record<PlanningFailureCode, string> = {
  invalid_input: "Vstup plánování je neplatný",
  ai_not_configured: "AI není nakonfigurovaná",
  ai_failed: "Volání AI selhalo",
  ai_invalid_output: "AI vrátila neplatný návrh",
  validation_failed: "Validaci nešlo provést",
};

export function toPlanningRunView(
  result: PlanningRunResult,
  context: PlanningRunViewContext,
): PlanningRunView {
  const confirmation = evaluateConfirmation(
    result,
    context.confirmedPlan ?? null,
  );

  return {
    proposalId: result.proposal.id,
    weekStart: result.weekStart,
    scenarioId: context.scenarioId,
    scenarioLabel: context.scenarioLabel,
    providerName: context.providerName,
    mode: context.mode,
    status: result.status,
    statusLabel: STATUS_LABELS[result.status],
    statusTone: STATUS_TONES[result.status],
    completeness: result.completeness,
    completenessLabel:
      result.completeness === "complete" ? "Úplný návrh" : "Částečný návrh",
    completenessTone:
      result.completeness === "complete" ? "neutral" : "warning",
    employees: context.employees,
    proposal: {
      assignments: result.proposal.plan.assignments,
      explanations: result.proposal.plan.explanations,
      alternatives: result.proposal.plan.alternatives,
      assumptions: result.proposal.plan.assumptions,
    },
    changes: result.changes,
    changesSummary: summarizeChanges(result.changes),
    coverage: result.coverage,
    coverageSummary: summarizeCoverage(result.coverage),
    validation: result.validation,
    confirmation,
    confirmationLabel: confirmation.alreadyConfirmed
      ? "Potvrzeno"
      : confirmation.allowed
        ? "Připraveno k potvrzení"
        : "Potvrzení blokováno",
    confirmationTone: confirmation.alreadyConfirmed
      ? "info"
      : confirmation.allowed
        ? "info"
        : "warning",
  };
}

export function toPlanningFailureView(
  failure: PlanningFailure,
): PlanningFailureView {
  const view: PlanningFailureView = {
    code: failure.code,
    title: FAILURE_TITLES[failure.code],
    message: failure.message,
    ...(failure.details ? { details: failure.details } : {}),
  };
  return view;
}

export function summarizeCoverage(
  coverage: readonly CoverageLine[],
): CoverageSummary {
  return coverage.reduce<CoverageSummary>(
    (summary, line) => ({
      required: summary.required + line.requiredEmployees,
      assigned: summary.assigned + line.assignedEmployees,
      missing: summary.missing + line.missingEmployees,
      understaffedSlots:
        summary.understaffedSlots + (line.missingEmployees > 0 ? 1 : 0),
      overstaffedSlots:
        summary.overstaffedSlots +
        (line.assignedEmployees > line.requiredEmployees ? 1 : 0),
    }),
    {
      required: 0,
      assigned: 0,
      missing: 0,
      understaffedSlots: 0,
      overstaffedSlots: 0,
    },
  );
}

export function summarizeChanges(
  changes: readonly AssignmentChange[],
): ChangesSummary {
  return changes.reduce<ChangesSummary>(
    (summary, change) => ({
      added: summary.added + (change.type === "added" ? 1 : 0),
      removed: summary.removed + (change.type === "removed" ? 1 : 0),
      unchanged: summary.unchanged + (change.type === "unchanged" ? 1 : 0),
    }),
    { added: 0, removed: 0, unchanged: 0 },
  );
}
