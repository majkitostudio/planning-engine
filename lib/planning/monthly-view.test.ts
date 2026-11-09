import { describe, expect, it } from "vitest";
import { monthlyInstructionMessage, monthlyRosterCaption, monthlyValidationMessage, selectMonthlyView } from "./monthly-view";

describe("výběr zobrazeného měsíce", () => {
  it("vysvětlí výsledek kontroly srozumitelně bez interních kódů", () => {
    expect(monthlyValidationMessage("valid")).toMatch(/bez blokujících problémů/i);
    expect(monthlyValidationMessage("invalid")).toMatch(/problémy.*potvrzení/i);
    expect(monthlyValidationMessage("not_verified")).toMatch(/nelze ověřit/i);
  });
  it("použije české označení simulovaného rozpisu", () => {
    expect(monthlyRosterCaption({ confirmed: false, month: "2026-11", mode: "simulated" })).toBe("Nepotvrzený návrh · 2026-11 · simulovaný");
  });
  it("označí AI návrh a starší uložený režim, aby zdroj nebyl zaměnitelný", () => {
    expect(monthlyRosterCaption({ confirmed: false, month: "2026-11", mode: "cloudflare" })).toBe("Nepotvrzený návrh · 2026-11 · AI Cloudflare");
    expect(monthlyRosterCaption({ confirmed: true, month: "2026-11", mode: "ortools" })).toBe("Potvrzený rozpis · 2026-11 · OR-Tools");
  });
  it("rozliší nevyhodnocené pokyny od tvrzení AI", () => {
    expect(monthlyInstructionMessage("ortools", "ignored")).toMatch(/nevyhodnotil/i);
    expect(monthlyInstructionMessage("gemini", "Přání bylo zohledněno.")).toMatch(/AI uvedla.*zohledněno.*nebylo samostatně ověřeno/i);
    expect(monthlyInstructionMessage("simulated", "SIMULATED: ignored")).not.toContain("SIMULATED");
  });
  it("nezobrazuje návrh jiného měsíce ani při překryvu kalendářního týdne", () => {
    expect(selectMonthlyView("2026-11", { input: { month: "2026-10" } }, null)).toBeNull();
  });
  it("po vymazání návrhu znovu nabídne potvrzený rozpis správného měsíce", () => {
    const confirmed = { input: { month: "2026-11" }, id: "confirmed" };
    expect(selectMonthlyView("2026-11", null, confirmed)).toEqual(confirmed);
  });
});
