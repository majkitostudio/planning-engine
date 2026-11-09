/** Režim, ve kterém běží plánovací provider. */
export type PlanningProviderMode = "simulated" | "gemini";
/** Aktivní měsíční režimy; OR-Tools vyžaduje výslovnou konfiguraci. */
export type MonthlyPlanningMode = PlanningProviderMode | "cloudflare" | "ortools";
/**
 * Starší uložené měsíční záznamy mohou mít režim „ortools“. Nové návrhy se v něm
 * už nevytvářejí, ale uloženou historii je nutné umět zobrazit a zkontrolovat.
 */
export type StoredMonthlyPlanningMode = MonthlyPlanningMode | "ortools";
