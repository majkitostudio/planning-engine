/** Režim, ve kterém běží plánovací provider. */
export type PlanningProviderMode = "simulated" | "gemini";
/** Aktivní měsíční režimy. Lokální OR-Tools byl z projektu odstraněn. */
export type MonthlyPlanningMode = PlanningProviderMode | "cloudflare";
/**
 * Starší uložené měsíční záznamy mohou mít režim „ortools“. Nové návrhy se v něm
 * už nevytvářejí, ale uloženou historii je nutné umět zobrazit a zkontrolovat.
 */
export type StoredMonthlyPlanningMode = MonthlyPlanningMode | "ortools";
