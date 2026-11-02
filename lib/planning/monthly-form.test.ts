import { describe, expect, it } from "vitest";
import { buildMonthlyFormInput, monthlyFormReadiness, staffingFormValues } from "./monthly-form";

describe("vstupy měsíčního formuláře", () => {
  it("převede výslovnou dostupnost a týdenní obsazení na celý přestupný únor", () => {
    const result = buildMonthlyFormInput({ month: "2024-02", employees: [{ id: "e1", name: "Test", availableAllMonth: true }], absences: [], availability: [{ employeeId: "e1", date: "2024-02-29", shiftKind: "morning", available: false }], staffing: Array.from({ length: 14 }, () => "0"), instructions: "Pokyn" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.staffingRequirements).toHaveLength(58);
      expect(result.value.availability).toHaveLength(58);
      expect(result.value.availability.find((x) => x.date === "2024-02-29" && x.shiftKind === "morning")?.available).toBe(false);
      expect(result.value.instructions).toBe("Pokyn");
    }
  });
  it("nepovažuje nezadanou dostupnost ani chybějící obsazení za nulu", () => {
    const result = buildMonthlyFormInput({ month: "2026-11", employees: [{ id: "e1", name: "Test", availableAllMonth: false }], absences: [], availability: [], staffing: Array.from({ length: 14 }, () => ""), instructions: "" });
    expect(result.ok).toBe(false);
  });
  it("před vytvořením návrhu shrne měsíc, vstupy a chybějící povinné obsazení", () => {
    const readiness = monthlyFormReadiness({ month: "2026-11", employees: [{ id: "e1", name: "Test", availableAllMonth: false }], absences: [], availability: [], staffing: ["0", ...Array.from({ length: 13 }, () => "")], instructions: "" });
    expect(readiness).toMatchObject({ month: "2026-11", employeeCount: 1, allMonthAvailableCount: 0, absenceCount: 0, availabilityCount: 0, filledStaffingCount: 1 });
    expect(readiness.missing).toContain("Vyplňte požadované obsazení pro všech 7 dnů a obě směny.");
  });
  it("přebírá uložené minimum včetně explicitní nuly a nedoplňuje chybějící profil svévolně", () => {
    expect(staffingFormValues([{ dayOfWeek: 0, shiftKind: "morning", requiredEmployees: 0 }, { dayOfWeek: 6, shiftKind: "afternoon", requiredEmployees: 9 }])).toEqual(["0", "", "", "", "", "", "", "", "", "", "", "", "", "9"]);
    expect(staffingFormValues(null)).toEqual(Array.from({ length: 14 }, () => ""));
  });
});
