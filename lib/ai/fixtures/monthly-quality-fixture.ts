import { datesInMonth } from "../../planning/domain/month";
import type { MonthlyPlanningInput } from "../../planning/domain/month-input";
import type { MonthlyBoundaryData } from "../../planning/domain/month-validation";
import type { MonthlyPlanDraft } from "../../planning/monthly-planning";

/** Synthetic qualitative fixture only; names and IDs do not identify real people. */
export const monthlyQualityInput: MonthlyPlanningInput = (() => {
  const month = "2026-11";
  const employees = [
    { id: "synthetic-morning-a", displayName: "Syntetický pracovník A", employmentType: "full_time" as const },
    { id: "synthetic-morning-b", displayName: "Syntetický pracovník B", employmentType: "full_time" as const },
    { id: "synthetic-afternoon-a", displayName: "Syntetický pracovník C", employmentType: "full_time" as const },
    { id: "synthetic-afternoon-b", displayName: "Syntetický pracovník D", employmentType: "full_time" as const },
  ];
  const absences = [
    { id: "synthetic-absence-1", employeeId: "synthetic-afternoon-b", from: "2026-11-18", to: "2026-11-18", type: "vacation" as const, status: "approved" as const },
  ];
  const dates = datesInMonth(month);
  const unavailable = new Set([
    "synthetic-morning-a|2026-11-11|morning",
    "synthetic-afternoon-a|2026-11-23|afternoon",
  ]);
  const absentEmployee = new Set(["synthetic-afternoon-b|2026-11-18"]);
  const availability = employees.flatMap((employee) => dates.flatMap((date) =>
    (["morning", "afternoon"] as const).map((shiftKind) => ({
      employeeId: employee.id,
      date,
      shiftKind,
      available: !absentEmployee.has(`${employee.id}|${date}`)
        && !unavailable.has(`${employee.id}|${date}|${shiftKind}`),
    })),
  ));
  const staffingRequirements = dates.flatMap((date) => ([
    { date, shiftKind: "morning" as const, requiredEmployees: 1 },
    { date, shiftKind: "afternoon" as const, requiredEmployees: 1 },
  ]));

  return {
    month,
    employees,
    absences,
    availability,
    staffingRequirements,
    instructions: "Syntetický kvalitativní pokyn: upřednostni stabilní pokrytí a stručně vysvětli náhradní přiřazení.",
    shiftRotationPreference: false,
  };
})();

export const monthlyQualityBoundary: MonthlyBoundaryData = {
  // Complete synthetic history contains no assignments in the six-day windows.
  before: { complete: true, assignments: [] },
  after: { complete: true, assignments: [] },
};

export const monthlyQualityDraft: MonthlyPlanDraft = {
  month: monthlyQualityInput.month,
  assignments: (() => {
    const dates = datesInMonth(monthlyQualityInput.month);
    return dates.flatMap((date, index) => {
      const absence = monthlyQualityInput.absences.find((item) => item.status === "approved" && item.from <= date && item.to >= date);
      const morningPreferred = index % 2 === 0 ? "synthetic-morning-a" : "synthetic-morning-b";
      const afternoonPreferred = index % 2 === 0 ? "synthetic-afternoon-a" : "synthetic-afternoon-b";
      const allowed = (employeeId: string, shiftKind: "morning" | "afternoon") => monthlyQualityInput.availability
        .find((item) => item.employeeId === employeeId && item.date === date && item.shiftKind === shiftKind)?.available === true;
      const morningAlternate = morningPreferred === "synthetic-morning-a" ? "synthetic-morning-b" : "synthetic-morning-a";
      const afternoonAlternate = afternoonPreferred === "synthetic-afternoon-a" ? "synthetic-afternoon-b" : "synthetic-afternoon-a";
      const morning = allowed(morningPreferred, "morning") ? morningPreferred : morningAlternate;
      const afternoon = absence?.employeeId === afternoonPreferred || !allowed(afternoonPreferred, "afternoon")
        ? afternoonAlternate
        : afternoonPreferred;
      return [
        { employeeId: morning, date, shiftKind: "morning" as const },
        { employeeId: afternoon, date, shiftKind: "afternoon" as const },
      ];
    });
  })(),
  explanations: [{
    topic: "coverage",
    text: "Syntetický návrh pokrývá každou požadovanou směnu; explicitní nedostupnost a schválená absence jsou respektovány.",
  }],
  alternatives: [],
  assumptions: [],
  instructionsOutcome: "Syntetický pokyn byl zohledněn jako preference, nikoli jako tvrdé pravidlo.",
};
