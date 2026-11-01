import { describe, expect, it } from "vitest";
import { selectMonthlyView } from "./monthly-view";

describe("výběr zobrazeného měsíce", () => {
  it("nezobrazuje návrh jiného měsíce ani při překryvu kalendářního týdne", () => {
    expect(selectMonthlyView("2026-11", { input: { month: "2026-10" } }, null)).toBeNull();
  });
  it("po vymazání návrhu znovu nabídne potvrzený rozpis správného měsíce", () => {
    const confirmed = { input: { month: "2026-11" }, id: "confirmed" };
    expect(selectMonthlyView("2026-11", null, confirmed)).toEqual(confirmed);
  });
});
