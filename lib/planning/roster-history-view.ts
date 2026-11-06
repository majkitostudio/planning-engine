export function rosterHistoryEmptyState(state: "loading" | "unavailable" | "ready", count = 0): string | null {
  if (state === "loading") return "Načítám uložené podklady…";
  if (state === "unavailable") return "Uložené podklady nejsou dostupné.";
  return count === 0 ? "Pro toto období nejsou uložené podklady." : null;
}

/**
 * Odstraní stav vázaný na jeden zdrojový řádek exportu. Klíč párování je
 * `sourceName`, klíč ruční opravy dne je `sourceName|date`. Ostatní osoby
 * zůstávají beze změny, i když mají podobné jméno (např. „Jan“ a „Jana“).
 */
export function withoutRosterSourceName<T>(
  record: Readonly<Record<string, T>>,
  sourceName: string,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record).filter(
      ([key]) => key !== sourceName && !key.startsWith(`${sourceName}|`),
    ),
  );
}
