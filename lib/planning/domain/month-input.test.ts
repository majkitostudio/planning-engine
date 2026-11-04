import { describe, expect, it } from "vitest";
import { validateMonthlyInput } from "./month-input";
import { datesInMonth } from "./month";

const input = {
  month: "2026-02",
  employees: [{ id: "e1", displayName: "Test", employmentType: "full_time" }],
  absences: [],
  availability: [{ employeeId: "e1", date: "2026-02-01", shiftKind: "morning", available: false }],
  staffingRequirements: [{ date: "2026-02-01", shiftKind: "morning", requiredEmployees: 0 }],
  instructions: "Pokyn pro AI",
};

describe("monthly planning input", () => {
  it("přijme nejvýše 200 zaměstnanců a další odmítne srozumitelnou chybou", () => {
    const employees = Array.from({ length: 200 }, (_, index) => ({
      id: `e${index + 1}`,
      displayName: `Test ${index + 1}`,
      employmentType: "full_time",
    }));

    expect(validateMonthlyInput({ ...input, employees }).ok).toBe(true);
    expect(validateMonthlyInput({ ...input, employees: [...employees, {
      id: "e201",
      displayName: "Test 201",
      employmentType: "full_time",
    }] })).toEqual({ ok: false, message: "Plán lze připravit nejvýše pro 200 zaměstnanců." });
  });

  it("accepts valid input and keeps advisory instructions", () => {
    expect(validateMonthlyInput(input)).toEqual({ ok: true, value: input });
  });

  it("accepts only a continuous range inside the selected month", () => {
    expect(validateMonthlyInput({ ...input, planningRange: { startDate: "2026-02-14", endDate: "2026-02-28" } }).ok).toBe(true);
    for (const planningRange of [
      { startDate: "2026-01-31", endDate: "2026-02-10" },
      { startDate: "2026-02-20", endDate: "2026-02-19" },
      { startDate: "2026-02-30", endDate: "2026-02-30" },
      { startDate: "2026-02-01", endDate: "2026-03-01" },
    ]) expect(validateMonthlyInput({ ...input, planningRange }).ok).toBe(false);
  });

  it("validates a server roster snapshot as one explicit cell per employee and month day", () => {
    const snapshot = {
      imports: [{ id: "import-1", version: 1, fingerprint: "a".repeat(64) }],
      days: datesInMonth("2026-02").map((date) => ({ employeeId: "e1", date, status: "off" as const })),
    };
    expect(validateMonthlyInput({ ...input, planningRange: { startDate: "2026-02-15", endDate: "2026-02-28" }, rosterHistory: snapshot }).ok).toBe(true);
    expect(validateMonthlyInput({ ...input, planningRange: { startDate: "2026-02-15", endDate: "2026-02-28" }, rosterHistory: { ...snapshot, days: snapshot.days.slice(1) } }).ok).toBe(false);
    expect(validateMonthlyInput({ ...input, planningRange: { startDate: "2026-02-15", endDate: "2026-02-28" }, rosterHistory: { ...snapshot, days: [...snapshot.days, snapshot.days[0]] } }).ok).toBe(false);
    expect(validateMonthlyInput({ ...input, rosterHistory: { imports: [], days: [] } }).ok).toBe(false);
  });

  it("odmítne měsíční podklady s nejednoznačným nebo neexistujícím vlastním časem", () => {
    const dates = datesInMonth("2026-10");
    const snapshot = {
      imports: [],
      days: dates.map((date) => date === "2026-10-25"
        ? { employeeId: "e1", date, status: "shift" as const, startTime: "02:30", endTime: "04:00" }
        : { employeeId: "e1", date, status: "off" as const }),
    };

    const monthlyInput = (month: string, rosterHistory: unknown) => ({
      ...input,
      month,
      availability: [],
      staffingRequirements: [{ date: `${month}-01`, shiftKind: "morning", requiredEmployees: 0 }],
      rosterHistory,
    });

    expect(validateMonthlyInput(monthlyInput("2026-10", snapshot))).toEqual({
      ok: false,
      message: "Historie rosteru musí mít právě jeden platný záznam pro každý den každého zaměstnance.",
    });
    expect(validateMonthlyInput(monthlyInput("2026-03", {
      imports: [],
      days: datesInMonth("2026-03").map((date) => date === "2026-03-29"
        ? { employeeId: "e1", date, status: "shift" as const, startTime: "02:30", endTime: "04:00" }
        : { employeeId: "e1", date, status: "off" as const }),
    }))).toMatchObject({ ok: false, message: "Historie rosteru musí mít právě jeden platný záznam pro každý den každého zaměstnance." });
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
    { ...input, shiftRotationPreference: "yes" },
  ])("rejects malformed or inconsistent input %#", (value) => {
    expect(validateMonthlyInput(value).ok).toBe(false);
  });
});
