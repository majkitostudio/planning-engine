import { describe, expect, it } from "vitest";
import { datesInMonth } from "./month";
import type { MonthlyPlanningInput } from "./month-input";
import type { ProposedAssignment } from "./types";
import { validateMonthlyPlan } from "./month-validation";

const input: MonthlyPlanningInput = {
  month: "2026-11",
  employees: [{ id: "e1", displayName: "Test", employmentType: "full_time" }],
  absences: [], availability: [], instructions: "",
  staffingRequirements: datesInMonth("2026-11").flatMap((date) => ([
    { date, shiftKind: "morning" as const, requiredEmployees: 0 },
    { date, shiftKind: "afternoon" as const, requiredEmployees: 0 },
  ])),
};
const assignment = (date: string): ProposedAssignment => ({ employeeId: "e1", date, shiftKind: "morning" });
const completeBoundary = { before: { complete: true, assignments: [] }, after: { complete: true, assignments: [] } };

describe("měsíční validace", () => {
  it("povolí dva oddělené dny volna při víkendové práci", () => {
    const days = ["2026-11-02", "2026-11-03", "2026-11-05", "2026-11-07", "2026-11-08"];
    const availability = days.map((date) => ({ employeeId: "e1", date, shiftKind: "morning" as const, available: true }));
    const result = validateMonthlyPlan({ ...input, availability }, days.map(assignment), completeBoundary);
    expect(result.status).toBe("valid");
  });
  it("označí chybějící podklady za neověřené a blokuje potvrzení", () => {
    const result = validateMonthlyPlan(input, [], { before: { complete: false, assignments: [] }, after: { complete: false, assignments: [] } });
    expect(result.status).toBe("not_verified");
    expect(result.canConfirm).toBe(false);
  });

  it("zjistí sedm pracovních dnů přes hranici týdnů", () => {
    const assignments = ["2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"].map(assignment);
    const result = validateMonthlyPlan(input, assignments, completeBoundary);
    expect(result.problems.some((problem) => problem.code === "REST_AFTER_SIX_DAYS")).toBe(true);
    expect(result.canConfirm).toBe(false);
  });

  it("použije navazující směnu při kontrole konce měsíce", () => {
    const assignments = ["2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29", "2026-11-30"].map(assignment);
    const result = validateMonthlyPlan(input, assignments, { ...completeBoundary, after: { complete: true, assignments: [assignment("2026-12-01")] } });
    expect(result.problems.some((problem) => problem.code === "REST_AFTER_SIX_DAYS")).toBe(true);
  });

  it("použije směny předchozího měsíce při kontrole prvního dne", () => {
    const before = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"].map(assignment);
    const result = validateMonthlyPlan(input, [assignment("2026-11-01")], { ...completeBoundary, before: { complete: true, assignments: before } });
    expect(result.problems.some((problem) => problem.code === "REST_AFTER_SIX_DAYS")).toBe(true);
  });

  it("prověří 34 hodin 45 minut odpočinku přes začátek měsíce po jednom dni volna", () => {
    const before = ["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"].map((date) => ({ ...assignment(date), shiftKind: "afternoon" as const }));
    const result = validateMonthlyPlan(input, [assignment("2026-11-01")], { ...completeBoundary, before: { complete: true, assignments: before } });
    expect(result.problems.some((problem) => problem.code === "REST_AFTER_SIX_DAYS")).toBe(true);
  });

  it("přijme dostatečný nepřerušený odpočinek přes hranici měsíce", () => {
    const before = ["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"].map(assignment);
    const result = validateMonthlyPlan(input, [assignment("2026-11-01")], { ...completeBoundary, before: { complete: true, assignments: before } });
    expect(result.problems.some((problem) => problem.code === "REST_AFTER_SIX_DAYS")).toBe(false);
  });

  it("při kontrole hranice zachová přesný čas převzaté směny", () => {
    const before = ["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"]
      .map((date) => ({ employeeId: "e1", date, startTime: "12:00" as const, endTime: "20:00" as const }));
    const result = validateMonthlyPlan(input, [assignment("2026-11-01")], { ...completeBoundary, before: { complete: true, assignments: before } });
    expect(result.problems.some((problem) => problem.code === "REST_AFTER_SIX_DAYS")).toBe(false);
  });

  it("kontroluje šestici začínající v měsíci, i když končí v dalším měsíci", () => {
    const dates = ["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04"];
    const worked = dates.map((date) => ({ ...assignment(date), shiftKind: "afternoon" as const }));
    const result = validateMonthlyPlan(input, worked.slice(0, 2), { ...completeBoundary, after: { complete: true, assignments: [...worked.slice(2), assignment("2026-12-06")] } });
    expect(result.problems.some((problem) => problem.code === "REST_AFTER_SIX_DAYS")).toBe(true);
  });

  it("počítá víkendové volno z celého týdne přes hranici měsíce", () => {
    const before = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"].map(assignment);
    const result = validateMonthlyPlan(input, [assignment("2026-11-01")], { ...completeBoundary, before: { complete: true, assignments: before } });
    expect(result.problems.some((problem) => problem.code === "WEEKEND_TWO_DAYS_OFF")).toBe(true);
  });

  it("chybějící dostupnost a obsazení nepovažuje za ověřený návrh", () => {
    const result = validateMonthlyPlan({ ...input, staffingRequirements: input.staffingRequirements.filter((item) => item.date !== "2026-11-02" || item.shiftKind !== "morning") }, [assignment("2026-11-02")], completeBoundary);
    expect(result.unverified.map((item) => item.code)).toEqual(expect.arrayContaining(["AVAILABILITY_MISSING", "COVERAGE_REQUIREMENT_MISSING"]));
    expect(result.canConfirm).toBe(false);
  });

  it("neblokuje kvůli okolní historii, pokud žádná dotčená kontrola nesahá za celé týdny měsíce", () => {
    const month = "2021-02"; // Pondělí až neděle, čtyři celé týdny.
    const middle = "2021-02-15";
    const monthlyInput: MonthlyPlanningInput = { ...input, month, availability: [{ employeeId: "e1", date: middle, shiftKind: "morning", available: true }], staffingRequirements: datesInMonth(month).flatMap((date) => (["morning", "afternoon"] as const).map((shiftKind) => ({ date, shiftKind, requiredEmployees: 0 }))) };
    const missing = { before: { complete: false, assignments: [] }, after: { complete: false, assignments: [] } };
    const result = validateMonthlyPlan(monthlyInput, [assignment(middle)], missing);
    expect(result.status).toBe("valid");
    expect(result.canConfirm).toBe(true);
  });

  it("odmítá směnu v době absence nebo výslovné nedostupnosti a detekuje neúplné obsazení", () => {
    const date = "2026-11-02";
    const result = validateMonthlyPlan({ ...input, absences: [{ id: "a", employeeId: "e1", from: date, to: date, type: "vacation", status: "approved" }], availability: [{ employeeId: "e1", date, shiftKind: "morning", available: false }], staffingRequirements: input.staffingRequirements.map((r) => r.date === "2026-11-03" && r.shiftKind === "morning" ? { ...r, requiredEmployees: 1 } : r) }, [assignment(date)], completeBoundary);
    expect(result.problems.map((problem) => problem.code)).toEqual(expect.arrayContaining(["ABSENCE_APPROVED", "AVAILABILITY_UNAVAILABLE", "COVERAGE_UNDERSTAFFED"]));
    expect(result.canConfirm).toBe(false);
  });

  it("při úplných údajích a nulovém obsazení umožní předat návrh manažerovi", () => {
    const result = validateMonthlyPlan(input, [], completeBoundary);
    expect(result.status).toBe("valid");
    expect(result.canConfirm).toBe(true);
  });

  it("nezávisle označí opakování směny přes den volna", () => {
    const rotationInput = { ...input, shiftRotationPreference: true };
    const availability = ["2026-11-02", "2026-11-04"].map((date) => ({ employeeId: "e1", date, shiftKind: "morning" as const, available: true }));
    const boundary = {
      before: { complete: true, assignments: [{ ...assignment("2026-10-30"), shiftKind: "afternoon" as const }] },
      after: { complete: true, assignments: [{ ...assignment("2026-12-01"), shiftKind: "afternoon" as const }] },
    };
    const result = validateMonthlyPlan({ ...rotationInput, availability }, [assignment("2026-11-02"), assignment("2026-11-04")], boundary);

    expect(result.preferenceFindings.some((finding) => finding.code === "SHIFT_ROTATION_REPEATED")).toBe(true);
    expect(result.canConfirm).toBe(true);
  });

  it("označí neověřenou návaznost střídání, pokud známé okno neobsahuje předchozí směnu", () => {
    const rotationInput = { ...input, shiftRotationPreference: true, availability: [{ employeeId: "e1", date: "2026-11-16", shiftKind: "morning" as const, available: true }] };
    const result = validateMonthlyPlan(rotationInput, [assignment("2026-11-16")], { before: { complete: true, assignments: [] }, after: { complete: true, assignments: [] } });

    expect(result.preferenceFindings.some((finding) => finding.code === "SHIFT_ROTATION_HISTORY_INCOMPLETE")).toBe(true);
    expect(result.canConfirm).toBe(true);
  });

  it("označí neověřenou návaznost střídání, pokud známé okno neobsahuje navazující směnu", () => {
    const rotationInput = { ...input, shiftRotationPreference: true, availability: [{ employeeId: "e1", date: "2026-11-16", shiftKind: "morning" as const, available: true }] };
    const result = validateMonthlyPlan(rotationInput, [assignment("2026-11-16")], { before: { complete: true, assignments: [{ ...assignment("2026-10-30"), shiftKind: "afternoon" }] }, after: { complete: true, assignments: [] } });

    expect(result.preferenceFindings.some((finding) => finding.code === "SHIFT_ROTATION_HISTORY_INCOMPLETE")).toBe(true);
    expect(result.canConfirm).toBe(true);
  });

  it("ohlásí opakování mezi poslední známou směnou před měsícem a první směnou v měsíci", () => {
    const rotationInput = { ...input, shiftRotationPreference: true, availability: [{ employeeId: "e1", date: "2026-11-01", shiftKind: "afternoon" as const, available: true }] };
    const before = { ...completeBoundary.before, assignments: [{ ...assignment("2026-10-31"), shiftKind: "afternoon" as const }] };
    const result = validateMonthlyPlan(rotationInput, [{ ...assignment("2026-11-01"), shiftKind: "afternoon" }], { before, after: completeBoundary.after });

    expect(result.preferenceFindings.some((finding) => finding.code === "SHIFT_ROTATION_REPEATED")).toBe(true);
  });

  it("nepřevádí vlastní čas směny na typ ranní nebo odpolední při hodnocení střídání", () => {
    const rotationInput = { ...input, shiftRotationPreference: true, availability: [{ employeeId: "e1", date: "2026-11-01", shiftKind: "morning" as const, available: true }] };
    const before = { ...completeBoundary.before, assignments: [{ employeeId: "e1", date: "2026-10-31", startTime: "08:05" as const, endTime: "16:45" as const }] };
    const result = validateMonthlyPlan(rotationInput, [assignment("2026-11-01")], { before, after: completeBoundary.after });

    expect(result.preferenceFindings.some((finding) => finding.code === "SHIFT_ROTATION_HISTORY_UNCLASSIFIED")).toBe(true);
    expect(result.canConfirm).toBe(true);
  });
});
