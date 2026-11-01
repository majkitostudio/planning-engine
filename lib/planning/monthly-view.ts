/** Návrh jiného měsíce nesmí překrýt vybrané období ani při překryvu týdnů. */
export function selectMonthlyView<T extends { readonly input: { readonly month: string } }>(month: string, draft: T | null | undefined, confirmed: T | null | undefined): T | null {
  if (draft?.input.month === month) return draft;
  if (confirmed?.input.month === month) return confirmed;
  return null;
}
