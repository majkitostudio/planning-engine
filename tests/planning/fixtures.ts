/**
 * Testovací fixtures pro plánovací služby.
 *
 * Nejsou to doménová data ani vzorový rozpis; slouží jen k izolovanému testu
 * mapování stavů a potvrzovacích pravidel.
 */

import type {
  AssignmentChange,
  CoverageLine,
  PlanValidationStatus,
  PlanningRunResult,
  PlanningRunStatus,
  ProposedAssignment,
} from "../../lib/planning/domain/types";

const TEST_WEEK = "2026-10-05";

export interface RunResultOverrides {
  readonly id?: string;
  readonly status?: PlanningRunStatus;
  readonly completeness?: "complete" | "partial";
  readonly validationStatus?: PlanValidationStatus;
  readonly assignments?: readonly ProposedAssignment[];
  readonly changes?: readonly AssignmentChange[];
  readonly coverage?: readonly CoverageLine[];
}

export function makeRunResult(
  overrides: RunResultOverrides = {},
): PlanningRunResult {
  const proposalId = overrides.id ?? "plan-test";
  const status = overrides.status ?? "ready_for_review";
  const completeness = overrides.completeness ?? "complete";
  const validationStatus =
    overrides.validationStatus ??
    (status === "not_verified"
      ? "not_verified"
      : status === "needs_changes"
        ? "invalid"
        : "valid");

  return {
    weekStart: TEST_WEEK,
    proposal: {
      id: proposalId,
      source: { kind: "ai", note: "test" },
      plan: {
        weekStart: TEST_WEEK,
        assignments: overrides.assignments ?? [],
        explanations: [],
        alternatives: [],
        assumptions: [],
      },
    },
    changes: overrides.changes ?? [],
    coverage: overrides.coverage ?? [],
    validation: {
      status: validationStatus,
      weekStart: TEST_WEEK,
      proposalId,
      problems: [],
      unverifiedChecks: [],
      checkedRuleIds: [],
      assumptions: [],
    },
    completeness,
    status,
    confirmed: false,
  };
}
