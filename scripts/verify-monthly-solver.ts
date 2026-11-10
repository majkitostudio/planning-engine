/** Synthetic cross-check only; not an application provider or a deployment entry point. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { datesInMonth } from "../lib/planning/domain/month";
import type { MonthlyPlanningInput } from "../lib/planning/domain/month-input";
import { validateMonthlyPlan, type MonthlyBoundaryData } from "../lib/planning/domain/month-validation";
import type { ProposedAssignment } from "../lib/planning/domain/types";

const month = "2026-11";
const dates = datesInMonth(month);
const kinds = ["morning", "afternoon"] as const;
const employees = Array.from({ length: 8 }, (_, i) => ({ id: `e${i}`, displayName: `Synthetic ${i}`, employmentType: "full_time" as const }));
const input: MonthlyPlanningInput = {
  month, employees, instructions: "", absences: [],
  staffingRequirements: dates.flatMap((date) => kinds.map((shiftKind) => ({ date, shiftKind, requiredEmployees: 1 }))),
  availability: employees.flatMap(({ id: employeeId }) => dates.flatMap((date) => kinds.map((shiftKind) => ({ employeeId, date, shiftKind, available: true })))),
};
const completeBoundary: MonthlyBoundaryData = { before: { complete: true, assignments: [] }, after: { complete: true, assignments: [] } };

function runSolver(value: MonthlyPlanningInput, boundary: MonthlyBoundaryData) {
  // Solver DTO deliberately excludes display names and free text.
  const request = { input: { month: value.month, employees: value.employees.map(({ id, employmentType }) => ({ id, employmentType })),
    absences: value.absences.map(({ employeeId, from, to, status, type }) => ({ employeeId, from, to, status, type })),
    availability: value.availability, staffingRequirements: value.staffingRequirements }, boundary, timeoutSeconds: 10 };
  const program = "import json,sys; sys.path.insert(0,'scripts'); import monthly_solver; print(json.dumps(monthly_solver.solve(json.load(sys.stdin))))";
  const result = spawnSync(process.env.MONTHLY_SOLVER_TEST_PYTHON || "python", ["-c", program], {
    input: JSON.stringify(request), encoding: "utf8", timeout: 30000, maxBuffer: 2_000_000,
  });
  assert.equal(result.status, 0, `Synthetic solver process failed: ${result.error?.message ?? result.stderr}`);
  return JSON.parse(result.stdout) as { status: string; assignments: ProposedAssignment[]; shortages: { date: string; shiftKind: string; missing: number }[] };
}

function check(value: MonthlyPlanningInput, boundary: MonthlyBoundaryData, expected: "valid" | "invalid" | "not_verified") {
  const result = runSolver(value, boundary);
  assert.ok(result.status === "OPTIMAL" || result.status === "FEASIBLE", `Unexpected solver status: ${result.status}`);
  const validation = validateMonthlyPlan(value, result.assignments, boundary);
  assert.equal(validation.status, expected, JSON.stringify({ problems: validation.problems, unverified: validation.unverified }));
  assert.equal(validation.canConfirm, expected === "valid");
  return result;
}

const complete = check(input, completeBoundary, "valid");
assert.equal(complete.shortages.length, 0);

const partialInput = { ...input, staffingRequirements: input.staffingRequirements.map((r) => ({ ...r, requiredEmployees: 8 })) };
const partial = check(partialInput, completeBoundary, "invalid");
assert.ok(partial.shortages.some(({ missing }) => missing > 0));
const coverageProblems = validateMonthlyPlan(partialInput, partial.assignments, completeBoundary).problems.filter(({ code }) => code === "COVERAGE_UNDERSTAFFED");
assert.deepEqual(
  partial.shortages.map(({ date, shiftKind }) => `${date}|${shiftKind}`).sort(),
  coverageProblems.map(({ date, shiftKind }) => `${date}|${shiftKind}`).sort(),
);

check({ ...input, staffingRequirements: input.staffingRequirements.slice(1) }, completeBoundary, "not_verified");
check({ ...input, availability: [] }, completeBoundary, "not_verified");
const missingBoundary: MonthlyBoundaryData = { ...completeBoundary, before: { complete: false, assignments: [] } };
const missingBoundaryRun = check(input, missingBoundary, "valid");
const missingBoundaryValidation = validateMonthlyPlan(input, missingBoundaryRun.assignments, missingBoundary);
assert.ok(missingBoundaryValidation.warnings.some(({ code }) => code === "BOUNDARY_HISTORY_INCOMPLETE"));

const customBoundary: MonthlyBoundaryData = { ...completeBoundary, before: { complete: true, assignments:
  [25, 26, 27, 28, 29, 30].map((day) => ({ employeeId: "e0", date: `2026-10-${day}`, startTime: "12:00", endTime: "21:00" })) } };
const custom = check(input, customBoundary, "valid");
assert.ok(!custom.assignments.some((a) => a.employeeId === "e0" && a.date === "2026-11-01"));
console.log("Synthetic solver/validator cross-check: 6 scenarios passed.");
