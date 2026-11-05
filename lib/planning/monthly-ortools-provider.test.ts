import { describe, expect, it, vi } from "vitest";
import { MonthlyOrtoolsProvider } from "./monthly-ortools-provider";
import type { MonthlyPlanningInput } from "./domain/month-input";
import { datesInMonth } from "./domain/month";
import { validateMonthlyDraft } from "./monthly-planning";

const input: MonthlyPlanningInput = {
  month: "2026-11",
  employees: [{ id: "private-id", displayName: "Private Name", employmentType: "full_time" }],
  absences: [],
  availability: [],
  staffingRequirements: [{ date: "2026-11-02", shiftKind: "morning", requiredEmployees: 1 }],
  instructions: "private instruction text",
  shiftRotationPreference: true,
};
const boundary = {
  before: { complete: false, assignments: [] },
  after: { complete: false, assignments: [] },
} as const;

describe("MonthlyOrtoolsProvider", () => {
  it("předá pevné dny jen mimo rozsah s anonymními identifikátory", async () => {
    let sent = "";
    const provider = new MonthlyOrtoolsProvider(async (payload) => {
      sent = payload;
      return JSON.stringify({ status: "feasible", assignments: [{ employeeId: "employee-0", date: "2026-11-16", shiftKind: "morning" }] });
    });
    const partial: MonthlyPlanningInput = {
      ...input,
      planningRange: { startDate: "2026-11-15", endDate: "2026-11-30" },
      rosterHistory: { imports: [], days: datesInMonth("2026-11").map((date) => date === "2026-11-02"
        ? { employeeId: "private-id", date, status: "shift" as const, startTime: "08:05", endTime: "20:00" }
        : { employeeId: "private-id", date, status: date < "2026-11-15" ? "off" as const : "unknown" as const }) },
    };
    await provider.generateMonthlyPlan(partial, boundary);
    const data = JSON.parse(sent).input;
    expect(data.planningRange).toEqual(partial.planningRange);
    expect(data.fixedDays).toHaveLength(14);
    expect(data.fixedDays.find((day: { date: string }) => day.date === "2026-11-02")).toEqual({ employeeId: "employee-0", date: "2026-11-02", status: "shift", startTime: "08:05", endTime: "20:00" });
    expect(sent).not.toContain("private-id");
  });

  it("odmítne neznámé pevné dny nebo směny od řešiče mimo zadaný úsek", async () => {
    const partial = { ...input, planningRange: { startDate: "2026-11-15", endDate: "2026-11-30" }, rosterHistory: { imports: [], days: datesInMonth("2026-11").map((date) => ({ employeeId: "private-id", date, status: date < "2026-11-15" ? "off" as const : "unknown" as const })) } };
    const malformed = { ...partial, rosterHistory: { ...partial.rosterHistory, days: partial.rosterHistory.days.map((day) => day.date === "2026-11-01" ? { ...day, status: "unknown" as const } : day) } };
    const provider = new MonthlyOrtoolsProvider(async () => JSON.stringify({ status: "feasible", assignments: [{ employeeId: "employee-0", date: "2026-11-02", shiftKind: "morning" }] }));
    await expect(provider.generateMonthlyPlan(malformed, boundary)).rejects.toThrow();
    await expect(provider.generateMonthlyPlan(partial, boundary)).rejects.toMatchObject({ code: "solver_invalid_output" });
  });

  it.skipIf(!process.env.PLANNING_PYTHON_EXECUTABLE)("propojí skutečný lokální řešič s pevnými směnami a doplněným úsekem", async () => {
    const dates = datesInMonth("2026-11");
    const partial: MonthlyPlanningInput = {
      ...input,
      planningRange: { startDate: "2026-11-15", endDate: "2026-11-30" },
      rosterHistory: { imports: [], days: dates.map((date) => date === "2026-11-02"
        ? { employeeId: "private-id", date, status: "shift" as const, startTime: "08:05", endTime: "20:00" }
        : { employeeId: "private-id", date, status: date < "2026-11-15" ? "off" as const : "unknown" as const }) },
      staffingRequirements: dates.flatMap((date) => (["morning", "afternoon"] as const).map((shiftKind) => ({ date, shiftKind, requiredEmployees: Number(date === "2026-11-16" && shiftKind === "morning") }))),
    };
    const result = await new MonthlyOrtoolsProvider().generateMonthlyPlan(partial, boundary);
    expect(result.assignments).toEqual([{ employeeId: "private-id", date: "2026-11-16", shiftKind: "morning" }]);
  }, 35000);
  it("sends only anonymized scheduling input and maps returned IDs back", async () => {
    let sent = "";
    const execute = vi.fn(async (payload: string) => {
      sent = payload;
      return JSON.stringify({
        status: "feasible",
        assignments: [{ employeeId: "employee-0", date: "2026-11-02", shiftKind: "morning" }],
      });
    });
    const provider = new MonthlyOrtoolsProvider(execute);

    const draft = await provider.generateMonthlyPlan(input, boundary);

    expect(execute).toHaveBeenCalledOnce();
    expect(sent).not.toContain("Private Name");
    expect(sent).not.toContain("private instruction text");
    expect(sent).not.toContain("private-id");
    expect(JSON.parse(sent).input.shiftRotationPreference).toBe(true);
    expect(draft.assignments).toEqual([{ employeeId: "private-id", date: "2026-11-02", shiftKind: "morning" }]);
    expect(draft.instructionsOutcome).toMatch(/nebyly.*vyhodnoceny/i);
  });

  it("předá měsíční fond anonymně a zachová omluvené hodiny", async () => {
    let sent = "";
    const provider = new MonthlyOrtoolsProvider(async (payload) => {
      sent = payload;
      return JSON.stringify({ status: "feasible", assignments: [] });
    });

    await provider.generateMonthlyPlan({ ...input, workFunds: [{ employeeId: "private-id", hours: 168, excusedHours: 8.5 }] }, boundary);

    expect(JSON.parse(sent).input.workFunds).toEqual([{ employeeId: "employee-0", hours: 168, excusedHours: 8.5 }]);
    expect(sent).not.toContain("private-id");
  });

  it("předá typ úvazku anonymizovanému solveru bez jména zaměstnance", async () => {
    let sent = "";
    const provider = new MonthlyOrtoolsProvider(async (payload) => {
      sent = payload;
      return JSON.stringify({ status: "feasible", assignments: [] });
    });

    await provider.generateMonthlyPlan({
      ...input,
      employees: [{ id: "private-id", displayName: "Private Name", employmentType: "part_time" }],
    }, boundary);

    expect(JSON.parse(sent).input.employees).toEqual([{ id: "employee-0", employmentType: "part_time" }]);
    expect(sent).not.toContain("Private Name");
    expect(sent).not.toContain("private-id");
  });

  it.each([
    ["infeasible", "solver_infeasible"],
    ["unknown", "solver_timeout"],
    ["unavailable", "solver_unavailable"],
  ] as const)("preserves solver status %s as %s", async (status, expectedCode) => {
    const provider = new MonthlyOrtoolsProvider(async () => JSON.stringify({ status }));

    await expect(provider.generateMonthlyPlan(input, boundary)).rejects.toMatchObject({ code: expectedCode });
  });

  it("rejects malformed output and assignments for unknown employees", async () => {
    const provider = new MonthlyOrtoolsProvider(async () => JSON.stringify({
      status: "feasible",
      assignments: [{ employeeId: "invented", date: "2026-11-02", shiftKind: "morning" }],
    }));

    await expect(provider.generateMonthlyPlan(input, boundary)).rejects.toMatchObject({ code: "solver_invalid_output" });
  });

  it("does not relabel custom boundary times for OR-Tools and reports independent verification", async () => {
    let sent = "";
    const provider = new MonthlyOrtoolsProvider(async (payload) => {
      sent = payload;
      return JSON.stringify({ status: "feasible", assignments: [] });
    });
    const customBoundary = {
      before: { complete: true, assignments: [{ employeeId: "private-id", date: "2026-10-31", startTime: "08:05" as const, endTime: "16:45" as const }] },
      after: { complete: false, assignments: [] },
    };

    const draft = await provider.generateMonthlyPlan(input, customBoundary);
    const request = JSON.parse(sent);

    expect(request.boundary.before).toEqual({ complete: false, assignments: [] });
    expect(draft.assumptions[0]).toMatch(/vlastní časy.*nezávislá kontrola/i);
    expect(draft.assumptions[0]).not.toContain("private-id");
  });

  it.skipIf(!process.env.PLANNING_PYTHON_EXECUTABLE)("locally solves the full November test month with synthetic employees", async () => {
    const employees = Array.from({ length: 29 }, (_, index) => ({
      id: `synthetic-${index}`,
      displayName: `Smyšlený zaměstnanec ${index}`,
      employmentType: "full_time" as const,
    }));
    const dates = datesInMonth("2026-11");
    const fullInput: MonthlyPlanningInput = {
      month: "2026-11",
      employees,
      absences: [],
      availability: dates.flatMap((date) => employees.flatMap((employee) => ([
        { employeeId: employee.id, date, shiftKind: "morning" as const, available: true },
        { employeeId: employee.id, date, shiftKind: "afternoon" as const, available: true },
      ]))),
      staffingRequirements: dates.flatMap((date) => {
        const weekend = new Date(`${date}T00:00:00Z`).getUTCDay() === 0 || new Date(`${date}T00:00:00Z`).getUTCDay() === 6;
        return [
          { date, shiftKind: "morning" as const, requiredEmployees: weekend ? 7 : 15 },
          { date, shiftKind: "afternoon" as const, requiredEmployees: weekend ? 3 : 7 },
        ];
      }),
      instructions: "synthetic only",
    };
    const provider = new MonthlyOrtoolsProvider();

    const draft = await provider.generateMonthlyPlan(fullInput, boundary);
    const validation = validateMonthlyDraft(fullInput, draft, boundary, "ortools");

    expect(draft.assignments).toHaveLength(552);
    expect(validation.problems).toEqual([]);
    expect(validation.status).toBe("not_verified");
    expect(validation.canConfirm).toBe(false);
  }, 35000);

  it.skipIf(!process.env.PLANNING_PYTHON_EXECUTABLE)("při celoměsíčním plánování respektuje souběžné absence a nedostupnou směnu", async () => {
    const dates = datesInMonth("2026-11");
    const employees = Array.from({ length: 12 }, (_, index) => ({ id: `synthetic-${index}`, displayName: `Test ${index}`, employmentType: "full_time" as const }));
    const absences = [0, 1, 2].map((index) => ({ id: `absence-${index}`, employeeId: `synthetic-${index}`, from: "2026-11-09", to: "2026-11-11", type: "other" as const, status: "approved" as const }));
    const input: MonthlyPlanningInput = {
      month: "2026-11", employees, absences, instructions: "",
      availability: dates.flatMap((date) => employees.flatMap((employee) => (["morning", "afternoon"] as const).map((shiftKind) => ({
        employeeId: employee.id, date, shiftKind,
        available: !(employee.id === "synthetic-11" && date === "2026-11-12" && shiftKind === "afternoon"),
      })))),
      staffingRequirements: dates.flatMap((date) => {
        const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
        const weekend = weekday === 0 || weekday === 6;
        return [
          { date, shiftKind: "morning" as const, requiredEmployees: weekend ? 2 : 4 },
          { date, shiftKind: "afternoon" as const, requiredEmployees: weekend ? 1 : 2 },
        ];
      }),
    };
    const completeBoundary = { before: { complete: true, assignments: [] }, after: { complete: true, assignments: [] } };
    const draft = await new MonthlyOrtoolsProvider().generateMonthlyPlan(input, completeBoundary);
    const validation = validateMonthlyDraft(input, draft, completeBoundary, "ortools");

    expect(draft.assignments).toHaveLength(153);
    expect(draft.assignments.filter((assignment) => absences.some((absence) => absence.employeeId === assignment.employeeId && absence.from <= assignment.date && assignment.date <= absence.to))).toEqual([]);
    expect(draft.assignments).not.toContainEqual({ employeeId: "synthetic-11", date: "2026-11-12", shiftKind: "afternoon" });
    expect(validation).toMatchObject({ status: "valid", problems: [], unverified: [], canConfirm: true });
  }, 35000);
});
