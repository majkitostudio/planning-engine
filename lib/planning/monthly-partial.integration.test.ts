import { describe, expect, it } from "vitest";
import { datesInMonth } from "./domain/month";
import type { MonthlyPlanningInput } from "./domain/month-input";
import { MonthlyOrtoolsProvider } from "./monthly-ortools-provider";
import { executeMonthlyPlanning, validateMonthlyDraft } from "./monthly-planning";

describe.skipIf(!process.env.PLANNING_PYTHON_EXECUTABLE)("lokální doplánování se syntetickými podklady", () => {
  it("zachová pevnou směnu, doplní zvolený úsek a při změně podkladu zablokuje potvrzení", async () => {
    const dates = datesInMonth("2026-11");
    const rosterHistory = { imports: [{ id: "synthetic-import", version: 1, fingerprint: "a".repeat(64) }], days: dates.map((date) => date === "2026-11-02"
      ? { employeeId: "e1", date, status: "shift" as const, startTime: "07:45", endTime: "16:30", shiftKind: "morning" as const }
      : { employeeId: "e1", date, status: date < "2026-11-15" ? "off" as const : "unknown" as const }) };
    const input: MonthlyPlanningInput = {
      month: "2026-11", employees: [{ id: "e1", displayName: "Smyšlený zaměstnanec", employmentType: "full_time" }], absences: [], instructions: "",
      availability: dates.flatMap((date) => (["morning", "afternoon"] as const).map((shiftKind) => ({ employeeId: "e1", date, shiftKind, available: true }))),
      staffingRequirements: dates.flatMap((date) => (["morning", "afternoon"] as const).map((shiftKind) => ({ date, shiftKind, requiredEmployees: Number(["2026-11-02", "2026-11-16"].includes(date) && shiftKind === "morning") }))),
      planningRange: { startDate: "2026-11-15", endDate: "2026-11-30" }, rosterHistory,
    };
    const boundary = { before: { complete: true, assignments: [] }, after: { complete: true, assignments: [] } };
    const result = await executeMonthlyPlanning(input, boundary, new MonthlyOrtoolsProvider());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft.assignments).toEqual([{ employeeId: "e1", date: "2026-11-16", shiftKind: "morning" }]);
    expect(result.validation.problems).toEqual([]);
    expect(result.validation.unverified.some((finding) => finding.code === "ROSTER_HISTORY_CHANGED")).toBe(false);
    const changed = { ...rosterHistory, imports: [{ id: "synthetic-import-2", version: 2, fingerprint: "b".repeat(64) }] };
    const rechecked = validateMonthlyDraft(input, result.draft, boundary, "ortools", changed);
    expect(rechecked.canConfirm).toBe(false);
    expect(rechecked.unverified.some((finding) => finding.code === "ROSTER_HISTORY_CHANGED")).toBe(true);
  }, 35000);
});
