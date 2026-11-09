/** Syntetický test skutečného HTTP klienta a nezávislého validátoru; nečte DB. */
import { datesInMonth } from "../lib/planning/domain/month";
import type { MonthlyPlanningInput } from "../lib/planning/domain/month-input";
import { executeMonthlyPlanning } from "../lib/planning/monthly-planning";
import { MonthlyOrtoolsProvider } from "../lib/planning/monthly-ortools-provider";

async function main() {
  const url = process.env.PLANNING_ORTOOLS_URL ?? "";
  const token = process.env.PLANNING_ORTOOLS_TOKEN ?? "";
  const dates = datesInMonth("2026-11");
  const employees = Array.from({ length: 100 }, (_, index) => ({ id: `synthetic-${index}`, displayName: `Synthetic ${index}`, employmentType: "full_time" as const }));
  const kinds = ["morning", "afternoon"] as const;
  const input: MonthlyPlanningInput = {
    month: "2026-11", employees, absences: [], instructions: "",
    availability: employees.flatMap((employee) => dates.flatMap((date) => kinds.map((shiftKind) => ({ employeeId: employee.id, date, shiftKind, available: true })))),
    staffingRequirements: dates.flatMap((date) => kinds.map((shiftKind) => ({ date, shiftKind, requiredEmployees: 20 }))),
  };
  const boundary = { before: { complete: true, assignments: [] }, after: { complete: true, assignments: [] } };
  const result = await executeMonthlyPlanning(input, boundary, new MonthlyOrtoolsProvider({ url, token }));
  if (!result.ok) throw new Error(`Solver test failed: ${result.code}`);
  console.log(JSON.stringify({ status: result.draft.solverStatus, modelVersion: result.draft.solverModelVersion, assignments: result.draft.assignments.length, validation: result.validation.status, canConfirm: result.validation.canConfirm, problems: result.validation.problems.length, unverified: result.validation.unverified.length }));
  if (result.draft.assignments.length !== 1200 || result.validation.status !== "valid" || !result.validation.canConfirm) process.exitCode = 1;
}

main().catch(() => { console.error("Synthetic solver HTTP verification failed."); process.exitCode = 1; });
