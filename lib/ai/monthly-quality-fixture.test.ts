import { describe, expect, it } from "vitest";
import { monthlyQualityBoundary, monthlyQualityDraft, monthlyQualityInput } from "./fixtures/monthly-quality-fixture";
import { validateMonthlyInput } from "../planning/domain/month-input";
import { validateMonthlyPlan } from "../planning/domain/month-validation";

describe("synthetic monthly quality fixture (offline)", () => {
  it("contains complete explicit availability, feasible coverage and synthetic full boundary history", () => {
    const parsed = validateMonthlyInput(monthlyQualityInput);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(monthlyQualityInput.availability).toHaveLength(monthlyQualityInput.employees.length * 30 * 2);
    expect(monthlyQualityBoundary).toEqual({
      before: { complete: true, assignments: [] },
      after: { complete: true, assignments: [] },
    });
    expect(validateMonthlyPlan(monthlyQualityInput, monthlyQualityDraft.assignments, monthlyQualityBoundary)).toMatchObject({
      status: "valid",
      problems: [],
      unverified: [],
      canConfirm: true,
    });
  });

  it("rejects an incomplete explicit availability matrix and duplicate availability cells", () => {
    const incomplete = { ...monthlyQualityInput, availability: monthlyQualityInput.availability.slice(1) };
    const duplicate = { ...monthlyQualityInput, availability: [...monthlyQualityInput.availability, monthlyQualityInput.availability[0]] };

    expect(validateMonthlyInput(incomplete).ok).toBe(true); // Missing data is represented by validation findings, not malformed shape.
    const assignment = monthlyQualityDraft.assignments.find((item) => item.employeeId === monthlyQualityInput.availability[0].employeeId
      && item.date === monthlyQualityInput.availability[0].date && item.shiftKind === monthlyQualityInput.availability[0].shiftKind);
    expect(assignment).toBeDefined();
    if (assignment) {
      const result = validateMonthlyPlan(incomplete, [assignment], monthlyQualityBoundary);
      expect(result.unverified.some((finding) => finding.code === "AVAILABILITY_MISSING")).toBe(true);
    }
    expect(validateMonthlyInput(duplicate)).toMatchObject({ ok: false, message: "Dostupnost je duplicitní." });
  });

  it("reports missing boundary history as a warning without blocking confirmation", () => {
    const incompleteBoundary = {
      before: { complete: false, assignments: [] },
      after: { complete: false, assignments: [] },
    };
    const result = validateMonthlyPlan(monthlyQualityInput, monthlyQualityDraft.assignments, incompleteBoundary);

    expect(result.status).toBe("valid");
    expect(result.warnings.some((finding) => finding.code === "BOUNDARY_HISTORY_INCOMPLETE")).toBe(true);
    expect(result.canConfirm).toBe(true);
  });

  it("marks a boundary assignment inside the month as invalid boundary history", () => {
    const boundary = {
      ...monthlyQualityBoundary,
      before: {
        complete: true,
        assignments: [{ employeeId: "synthetic-afternoon-b", date: "2026-11-01", shiftKind: "morning" as const }],
      },
    };
    const result = validateMonthlyPlan(monthlyQualityInput, monthlyQualityDraft.assignments, boundary);

    expect(result.unverified.some((finding) => finding.code === "BOUNDARY_HISTORY_INVALID")).toBe(true);
    expect(result.canConfirm).toBe(false);
  });
});
