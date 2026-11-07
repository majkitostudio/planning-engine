import type { MonthlyPlanDraft } from "../planning/monthly-planning";
import type { MonthlyValidation } from "../planning/domain/month-validation";
import type { MonthlyPlanningInput } from "../planning/domain/month-input";

/** Souhrn bez jmen, přiřazení nebo volného textu; nejde o měření AI kvóty. */
export function summarizeIntegrationRun(input: MonthlyPlanningInput, draft: MonthlyPlanDraft, validation: MonthlyValidation, durationMs: number) {
  const coverage = input.staffingRequirements.map((requirement) => {
    const employees = new Set(draft.assignments.filter((assignment) => assignment.date === requirement.date && assignment.shiftKind === requirement.shiftKind).map((assignment) => assignment.employeeId));
    return { required: requirement.requiredEmployees, covered: Math.min(requirement.requiredEmployees, employees.size) };
  });
  return {
    assignments: draft.assignments.length,
    daysWithAssignments: new Set(draft.assignments.map((assignment) => assignment.date)).size,
    requiredSlots: coverage.reduce((sum, item) => sum + item.required, 0),
    coveredSlots: coverage.reduce((sum, item) => sum + item.covered, 0),
    understaffedShifts: coverage.filter((item) => item.covered < item.required).length,
    status: validation.status,
    canConfirm: validation.canConfirm,
    problemCounts: countCodes(validation.problems),
    unverifiedCounts: countCodes(validation.unverified),
    preferenceCounts: countCodes(validation.preferenceFindings),
    workFundCounts: countCodes(validation.workFundFindings),
    durationMs: Math.round(durationMs),
  };
}

function countCodes(findings: readonly { readonly code: string }[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const { code } of findings) result[code] = (result[code] ?? 0) + 1;
  return result;
}
