import { describe, expect, it } from "vitest";
import { rosterHistoryEmptyState, splitRosterPreview, withoutRosterSourceName } from "./roster-history-view";

describe("stav načítání uložené návaznosti", () => {
  it("odliší načítání, nedostupné úložiště a prázdný seznam", () => {
    expect(rosterHistoryEmptyState("loading")).toBe("Načítám uložené podklady…");
    expect(rosterHistoryEmptyState("unavailable")).toBe("Uložené podklady nejsou dostupné.");
    expect(rosterHistoryEmptyState("ready")).toBe("Pro toto období nejsou uložené podklady.");
    expect(rosterHistoryEmptyState("ready", 2)).toBeNull();
  });
});

describe("rozdělení náhledu exportu", () => {
  const rows = [
    { sourceName: "Přesná", match: "exact" as const },
    { sourceName: "Neznámá", match: "unmatched" as const },
    { sourceName: "Nejednoznačná", match: "ambiguous" as const },
  ];

  it("automaticky přeskočí jen řádky bez shody", () => {
    const { included, skipped } = splitRosterPreview(rows);

    expect(included.map((row) => row.sourceName)).toEqual(["Přesná", "Nejednoznačná"]);
    expect(skipped.map((row) => row.sourceName)).toEqual(["Neznámá"]);
  });

  it("nejednoznačnou shodu nikdy nepřeskočí a prázdný vstup vrátí prázdný", () => {
    expect(splitRosterPreview(rows).skipped.some((row) => row.match === "ambiguous")).toBe(false);
    expect(splitRosterPreview([])).toEqual({ included: [], skipped: [] });
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
