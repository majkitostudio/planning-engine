import { describe, expect, it } from "vitest";
import { rosterHistoryEmptyState } from "./roster-history-view";

describe("stav načítání uložené návaznosti", () => {
  it("odliší načítání, nedostupné úložiště a prázdný seznam", () => {
    expect(rosterHistoryEmptyState("loading")).toBe("Načítám uložené podklady…");
    expect(rosterHistoryEmptyState("unavailable")).toBe("Uložené podklady nejsou dostupné.");
    expect(rosterHistoryEmptyState("ready")).toBe("Pro toto období nejsou uložené podklady.");
    expect(rosterHistoryEmptyState("ready", 2)).toBeNull();
  });
});
