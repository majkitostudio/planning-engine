import { describe, expect, it } from "vitest";
import { summarizeIntegrationRun } from "./integration-report";
import type { MonthlyPlanDraft } from "../planning/monthly-planning";
import type { MonthlyValidation } from "../planning/domain/month-validation";
import type { MonthlyPlanningInput } from "../planning/domain/month-input";

describe("souhrn integračního běhu", () => {
  it("shrne nálezy a nezveřejní zaměstnance ani volný text", () => {
    const draft: MonthlyPlanDraft = { month: "2026-11", assignments: [{ employeeId: "private", date: "2026-11-01", shiftKind: "morning" }, { employeeId: "private", date: "2026-11-02", shiftKind: "afternoon" }], explanations: [], alternatives: [], assumptions: [], instructionsOutcome: "private text" };
    const validation: MonthlyValidation = { status: "invalid", canConfirm: false, problems: [{ code: "SHIFT_OVERLAP", message: "private message" }, { code: "SHIFT_OVERLAP", message: "other" }], unverified: [{ code: "BOUNDARY_HISTORY_INCOMPLETE", message: "private" }], preferenceFindings: [], workFundFindings: [] };
    const input: MonthlyPlanningInput = { month: "2026-11", employees: [], absences: [], availability: [], instructions: "private text", staffingRequirements: [{ date: "2026-11-01", shiftKind: "morning", requiredEmployees: 2 }, { date: "2026-11-02", shiftKind: "afternoon", requiredEmployees: 1 }] };
    const summary = summarizeIntegrationRun(input, draft, validation, 1234.5);
    expect(summary).toEqual({ assignments: 2, daysWithAssignments: 2, requiredSlots: 3, coveredSlots: 2, understaffedShifts: 1, status: "invalid", canConfirm: false, problemCounts: { SHIFT_OVERLAP: 2 }, unverifiedCounts: { BOUNDARY_HISTORY_INCOMPLETE: 1 }, preferenceCounts: {}, workFundCounts: {}, durationMs: 1235 });
    expect(JSON.stringify(summary)).not.toContain("private");
  });
  it("započítá člověka ve stejné směně jen jednou a pokrytí nezvýší nad požadavek", () => {
    const assignment = { employeeId: "e1", date: "2026-11-01", shiftKind: "morning" as const };
    const draft: MonthlyPlanDraft = { month: "2026-11", assignments: [assignment, assignment, { ...assignment, employeeId: "e2" }], explanations: [], alternatives: [], assumptions: [], instructionsOutcome: "" };
    const validation: MonthlyValidation = { status: "invalid", canConfirm: false, problems: [], unverified: [], preferenceFindings: [], workFundFindings: [] };
    const input: MonthlyPlanningInput = { month: "2026-11", employees: [], absences: [], availability: [], instructions: "", staffingRequirements: [{ date: "2026-11-01", shiftKind: "morning", requiredEmployees: 1 }, { date: "2026-11-02", shiftKind: "morning", requiredEmployees: 2 }] };
    expect(summarizeIntegrationRun(input, draft, validation, 0)).toMatchObject({ assignments: 3, requiredSlots: 3, coveredSlots: 1, understaffedShifts: 1 });
  });
});
