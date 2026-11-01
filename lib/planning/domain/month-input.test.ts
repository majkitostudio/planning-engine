import { describe, expect, it } from "vitest";
import { validateMonthlyInput } from "./month-input";

const input = {
  month: "2026-02",
  employees: [{ id: "e1", displayName: "Test", employmentType: "full_time" }],
  absences: [],
  availability: [{ employeeId: "e1", date: "2026-02-01", shiftKind: "morning", available: false }],
  staffingRequirements: [{ date: "2026-02-01", shiftKind: "morning", requiredEmployees: 0 }],
  instructions: "Pokyn pro AI",
};

describe("monthly planning input", () => {
  it("accepts valid input and keeps advisory instructions", () => {
    expect(validateMonthlyInput(input)).toEqual({ ok: true, value: input });
  });

  it.each([
    { ...input, month: "2026-13" },
    { ...input, employees: [] },
    { ...input, employees: [...input.employees, ...input.employees] },
    { ...input, availability: [{ ...input.availability[0], date: "2026-03-01" }] },
    { ...input, availability: [{ ...input.availability[0], employeeId: "unknown" }] },
    { ...input, staffingRequirements: [{ ...input.staffingRequirements[0], requiredEmployees: -1 }] },
    { ...input, staffingRequirements: [...input.staffingRequirements, ...input.staffingRequirements] },
    { ...input, absences: [{ id: "a", employeeId: "unknown", from: "2026-02-01", to: "2026-02-02", type: "vacation", status: "approved" }] },
  ])("rejects malformed or inconsistent input %#", (value) => {
    expect(validateMonthlyInput(value).ok).toBe(false);
  });
});
