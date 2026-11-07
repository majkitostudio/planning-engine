import { describe, expect, it } from "vitest";
import { datesInMonth } from "../lib/planning/domain/month";
import { validateMonthlyInput } from "../lib/planning/domain/month-input";
import { validateMonthlyPlan } from "../lib/planning/domain/month-validation";
import { syntheticMonthlyAssignments, syntheticMonthlyBoundary, syntheticMonthlyInput } from "./fixtures/synthetic-monthly-nov-2026";

describe("offline synthetic November 2026 monthly witness", () => {
  it("proves the 29-person weekday/weekend profile with explicit availability and a complete boundary", () => {
    const dates = datesInMonth("2026-11");
    expect(syntheticMonthlyInput.employees).toHaveLength(29);
    expect(syntheticMonthlyInput.availability).toHaveLength(29 * dates.length * 2);
    expect(syntheticMonthlyInput.absences.length).toBeGreaterThanOrEqual(20);
    expect(syntheticMonthlyInput.availability.filter((cell) => !cell.available).length).toBeGreaterThan(300);
    for (const date of dates) {
      const weekend = [0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay());
      expect(syntheticMonthlyInput.staffingRequirements.find((row) => row.date === date && row.shiftKind === "morning")?.requiredEmployees).toBe(weekend ? 7 : 15);
      expect(syntheticMonthlyInput.staffingRequirements.find((row) => row.date === date && row.shiftKind === "afternoon")?.requiredEmployees).toBe(weekend ? 3 : 7);
    }
    expect(syntheticMonthlyBoundary).toEqual({ before: { complete: true, assignments: [] }, after: { complete: true, assignments: [] } });
    expect(validateMonthlyInput(syntheticMonthlyInput).ok).toBe(true);

    const expectedShiftCount = syntheticMonthlyInput.staffingRequirements.reduce((sum, row) => sum + row.requiredEmployees, 0);
    expect(syntheticMonthlyAssignments).toHaveLength(expectedShiftCount);
    expect(validateMonthlyPlan(syntheticMonthlyInput, syntheticMonthlyAssignments, syntheticMonthlyBoundary)).toMatchObject({
      status: "valid",
      problems: [],
      unverified: [],
      canConfirm: true,
    });
  });

  it("preserves the witness shape for a possible UI input without invoking a provider", () => {
    expect(syntheticMonthlyInput.month).toBe("2026-11");
    expect(syntheticMonthlyInput.staffingRequirements).toHaveLength(60);
    expect(syntheticMonthlyAssignments.every((assignment) => syntheticMonthlyInput.employees.some((employee) => employee.id === assignment.employeeId))).toBe(true);
  });
});
