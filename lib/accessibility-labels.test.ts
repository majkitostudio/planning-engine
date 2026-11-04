import { describe, expect, it } from "vitest";
import {
  removalActionLabel,
  rosterHistoryEmployeeContext,
  rosterHistoryControlLabel,
} from "@/lib/accessibility-labels";

describe("accessibility labels", () => {
  it("adds the entry context to repeated removal actions", () => {
    expect(removalActionLabel("Odebrat zaměstnance", "Syntetická osoba"))
      .toBe("Odebrat zaměstnance, Syntetická osoba");
    expect(removalActionLabel("Odebrat celodenní absenci", "Syntetická osoba, 2026-11-03 až 2026-11-04"))
      .toBe("Odebrat celodenní absenci, Syntetická osoba, 2026-11-03 až 2026-11-04");
  });

  it("adds employee and date context to roster history controls", () => {
    expect(rosterHistoryControlLabel("Stav", "Syntetická osoba", "2026-11-03"))
      .toBe("Stav, Syntetická osoba, 2026-11-03");
    expect(rosterHistoryControlLabel("Od, začátek směny", "Syntetická osoba", "2026-11-03"))
      .toBe("Od, začátek směny, Syntetická osoba, 2026-11-03");
  });

  it("uses the selected roster employee and falls back to the source row", () => {
    expect(rosterHistoryEmployeeContext("Přiřazená osoba", "Název zdrojového řádku"))
      .toBe("Přiřazená osoba");
    expect(rosterHistoryEmployeeContext(undefined, "Název zdrojového řádku"))
      .toBe("Název zdrojového řádku");
  });
});
