export function rosterHistoryEmptyState(state: "loading" | "unavailable" | "ready", count = 0): string | null {
  if (state === "loading") return "Načítám uložené podklady…";
  if (state === "unavailable") return "Uložené podklady nejsou dostupné.";
  return count === 0 ? "Pro toto období nejsou uložené podklady." : null;
}
