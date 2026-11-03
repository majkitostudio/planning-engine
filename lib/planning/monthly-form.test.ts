import { describe, expect, it } from "vitest";
import { buildMonthlyFormInput, monthlyFormReadiness, staffingFormValues, partialAbsenceAvailability } from "./monthly-form";

describe("vstupy měsíčního formuláře", () => {
  it("částečná absence omezí jen vybranou směnu po celé období a překryvy nesmí vytvořit duplicity", () => {
    const entries = partialAbsenceAvailability("2026-11", [
      { employeeId: "e1", from: "2026-10-31", to: "2026-11-02", shiftKind: "morning" },
      { employeeId: "e1", from: "2026-11-02", to: "2026-11-03", shiftKind: "morning" },
      { employeeId: "e1", from: "2026-11-02", to: "2026-11-02", shiftKind: "afternoon" },
    ]);
    expect(entries).toHaveLength(4);
    const result = buildMonthlyFormInput({ month: "2026-11", employees: [{ id: "e1", name: "Test" }], absences: [], availability: entries, staffing: Array(14).fill("0"), instructions: "" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const find = (date: string, kind: string) => result.value.availability.find((item) => item.date === date && item.shiftKind === kind)?.available;
      expect(find("2026-11-01", "morning")).toBe(false);
      expect(find("2026-11-01", "afternoon")).toBe(true);
      expect(find("2026-11-02", "afternoon")).toBe(false);
      expect(find("2026-11-04", "morning")).toBe(true);
    }
  });
  it("upozorní, pokud požadované směny přesahují týdenní kapacitu", () => {
    const form = { month: "2026-11", employees: Array.from({ length: 24 }, (_, i) => ({ id: `e${i}`, name: `Test ${i}` })), absences: [], availability: [], staffing: ["15", "7", "15", "7", "15", "7", "15", "7", "15", "7", "7", "3", "7", "3"], instructions: "" };
    expect(monthlyFormReadiness(form).warnings).toEqual([expect.stringContaining("130")]);
    expect(monthlyFormReadiness(form).warnings[0]).toContain("120");
    expect(monthlyFormReadiness({ ...form, employees: [...form.employees, { id: "e24", name: "Test 24" }, { id: "e25", name: "Test 25" }] }).warnings).toEqual([]);
    expect(monthlyFormReadiness({ ...form, staffing: ["", ...form.staffing.slice(1)] }).warnings).toEqual([]);
  });
  it("předpokládá dostupnost po celý měsíc a respektuje výslovnou nedostupnost", () => {
    const result = buildMonthlyFormInput({ month: "2026-11", employees: [{ id: "e1", name: "Test" }], absences: [], availability: [{ employeeId: "e1", date: "2026-11-01", shiftKind: "morning", available: false }], staffing: Array.from({ length: 14 }, () => "0"), instructions: "" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.availability).toHaveLength(60);
      expect(result.value.availability.find((x) => x.date === "2026-11-01" && x.shiftKind === "morning")?.available).toBe(false);
      expect(result.value.availability.find((x) => x.date === "2026-11-01" && x.shiftKind === "afternoon")?.available).toBe(true);
    }
  });
  it("upřednostní schválenou absenci i před výslovnou dostupností", () => {
    const result = buildMonthlyFormInput({ month: "2026-11", employees: [{ id: "e1", name: "Test" }], absences: [{ id: "a1", employeeId: "e1", from: "2026-11-02", to: "2026-11-03", type: "other", status: "approved" }], availability: [{ employeeId: "e1", date: "2026-11-02", shiftKind: "morning", available: true }], staffing: Array.from({ length: 14 }, () => "0"), instructions: "" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.availability.filter((x) => x.date === "2026-11-02" || x.date === "2026-11-03").every((x) => !x.available)).toBe(true);
      expect(result.value.availability.find((x) => x.date === "2026-11-04")?.available).toBe(true);
    }
  });
  it("převede výslovnou dostupnost a týdenní obsazení na celý přestupný únor", () => {
    const result = buildMonthlyFormInput({ month: "2024-02", employees: [{ id: "e1", name: "Test" }], absences: [], availability: [{ employeeId: "e1", date: "2024-02-29", shiftKind: "morning", available: false }], staffing: Array.from({ length: 14 }, () => "0"), instructions: "Pokyn" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.staffingRequirements).toHaveLength(58);
      expect(result.value.availability).toHaveLength(58);
      expect(result.value.availability.find((x) => x.date === "2024-02-29" && x.shiftKind === "morning")?.available).toBe(false);
      expect(result.value.instructions).toBe("Pokyn");
    }
  });
  it("nepovažuje chybějící obsazení za nulu", () => {
    const result = buildMonthlyFormInput({ month: "2026-11", employees: [{ id: "e1", name: "Test" }], absences: [], availability: [], staffing: Array.from({ length: 14 }, () => ""), instructions: "" });
    expect(result.ok).toBe(false);
  });
  it("před vytvořením návrhu shrne měsíc, vstupy a chybějící povinné obsazení", () => {
    const readiness = monthlyFormReadiness({ month: "2026-11", employees: [{ id: "e1", name: "Test" }], absences: [], availability: [], staffing: ["0", ...Array.from({ length: 13 }, () => "")], instructions: "" });
    expect(readiness).toMatchObject({ month: "2026-11", employeeCount: 1, absenceCount: 0, availabilityCount: 0, filledStaffingCount: 1 });
    expect(readiness.missing).toContain("Vyplňte požadované obsazení pro všech 7 dnů a obě směny.");
  });
  it("přebírá uložené minimum včetně explicitní nuly a nedoplňuje chybějící profil svévolně", () => {
    expect(staffingFormValues([{ dayOfWeek: 0, shiftKind: "morning", requiredEmployees: 0 }, { dayOfWeek: 6, shiftKind: "afternoon", requiredEmployees: 9 }])).toEqual(["0", "", "", "", "", "", "", "", "", "", "", "", "", "9"]);
    expect(staffingFormValues(null)).toEqual(Array.from({ length: 14 }, () => ""));
  });
});
