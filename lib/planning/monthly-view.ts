import type { MonthlyValidation } from "./domain/month-validation";

/** Návrh jiného měsíce nesmí překrýt vybrané období ani při překryvu týdnů. */
export function selectMonthlyView<T extends { readonly input: { readonly month: string } }>(month: string, draft: T | null | undefined, confirmed: T | null | undefined): T | null {
  if (draft?.input.month === month) return draft;
  if (confirmed?.input.month === month) return confirmed;
  return null;
}

export function monthlyValidationMessage(status: MonthlyValidation["status"]): string {
  switch (status) {
    case "valid": return "Kontrola proběhla bez blokujících problémů.";
    case "invalid": return "Návrh obsahuje problémy, které brání potvrzení.";
    case "not_verified": return "Část podkladů nelze ověřit; potvrzení je zablokované.";
  }
}

export function monthlyRosterCaption({ confirmed, month, mode }: { readonly confirmed: boolean; readonly month: string; readonly mode: string }): string {
  return `${confirmed ? "Potvrzený rozpis" : "Nepotvrzený návrh"} · ${month}${mode === "simulated" ? " · simulovaný" : ""}`;
}

export function monthlyInstructionMessage(mode: "simulated" | "gemini" | "ortools", outcome: string): string {
  if (mode === "simulated") return "Ukázkový návrh doplňující pokyny nevyhodnocuje.";
  if (mode === "ortools") return "Místní plánovač doplňující pokyny nevyhodnotil.";
  const statement = outcome.trim() || "AI neposkytla vysvětlení k pokynům.";
  return `AI uvedla: ${statement} Toto tvrzení nebylo samostatně ověřeno.`;
}
