import { describe, expect, it } from "vitest";
import { rosterHistoryEmptyState, withoutRosterSourceName } from "./roster-history-view";

describe("stav načítání uložené návaznosti", () => {
  it("odliší načítání, nedostupné úložiště a prázdný seznam", () => {
    expect(rosterHistoryEmptyState("loading")).toBe("Načítám uložené podklady…");
    expect(rosterHistoryEmptyState("unavailable")).toBe("Uložené podklady nejsou dostupné.");
    expect(rosterHistoryEmptyState("ready")).toBe("Pro toto období nejsou uložené podklady.");
    expect(rosterHistoryEmptyState("ready", 2)).toBeNull();
  });
});

describe("odebrání řádku z náhledu exportu", () => {
  it("odstraní párování i ruční opravy dnů pouze vybrané osoby", () => {
    const mapping = { "Jan Novák": "employee-1", "Jana Nováková": "employee-2" };
    const edits = {
      "Jan Novák|2026-11-01": "shift",
      "Jan Novák|2026-11-02": "off",
      "Jana Nováková|2026-11-01": "off",
    };

    expect(withoutRosterSourceName(mapping, "Jan Novák")).toEqual({ "Jana Nováková": "employee-2" });
    expect(withoutRosterSourceName(edits, "Jan Novák")).toEqual({ "Jana Nováková|2026-11-01": "off" });
  });

  it("nemění vstup a snese osobu bez uloženého stavu", () => {
    const mapping = { "Jan Novák": "employee-1" };

    expect(withoutRosterSourceName(mapping, "Neznámá Osoba")).toEqual(mapping);
    expect(mapping).toEqual({ "Jan Novák": "employee-1" });
  });
});
