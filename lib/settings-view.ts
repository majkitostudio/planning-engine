export function staffingSettingsPersistenceNotice(configured: boolean): string | null {
  return configured ? null : "Ukládání není v tomto prostředí dostupné; hodnoty se nyní neuloží.";
}
