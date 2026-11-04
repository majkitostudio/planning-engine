import { AiProviderError, isPlanDraft } from "./ai-provider";
import { validateMonthlyInput, type MonthlyPlanningInput, type MonthlyRosterSnapshot } from "./domain/month-input";
import { validateMonthlyPlan, type MonthlyBoundaryData, type MonthlyValidation } from "./domain/month-validation";
import type { PlanDraft } from "./domain/types";

export interface MonthlyPlanDraft extends Omit<PlanDraft, "weekStart"> {
  readonly month: string;
  readonly instructionsOutcome: string;
  readonly simulationScenario?: "complete" | "partial" | "unverified";
}

export interface MonthlyPlanningProvider {
  readonly name: string;
  generateMonthlyPlan(input: MonthlyPlanningInput, boundary: MonthlyBoundaryData): Promise<MonthlyPlanDraft>;
}

export type MonthlyProviderErrorCode = "solver_infeasible" | "solver_timeout" | "solver_unavailable" | "solver_invalid_output";

export class MonthlyProviderError extends Error {
  constructor(readonly code: MonthlyProviderErrorCode) {
    super(code);
    this.name = "MonthlyProviderError";
  }
}

export function isMonthlyPlanDraft(value: unknown, month: string): value is MonthlyPlanDraft {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const draft = value as Record<string, unknown>;
  if (draft.month !== month || typeof draft.instructionsOutcome !== "string" || (draft.simulationScenario !== undefined && draft.simulationScenario !== "complete" && draft.simulationScenario !== "partial" && draft.simulationScenario !== "unverified") || !isPlanDraft({ ...draft, weekStart: `${month}-01` })) return false;
  const normalized = draft as unknown as MonthlyPlanDraft;
  return [...normalized.assignments, ...normalized.alternatives.flatMap((alternative) => alternative.assignments)].every((assignment) => assignment.shiftKind === "morning" || assignment.shiftKind === "afternoon");
}

/** Simulovaný scénář nemůže předstírat, že záměrně neověřené podklady prošly kontrolou. */
function rosterSnapshotKey(snapshot: MonthlyRosterSnapshot): string {
  const imports = snapshot.imports.map((item) => JSON.stringify([item.id, item.version, item.fingerprint])).sort();
  const days = snapshot.days.map((day) => JSON.stringify(day.status === "shift"
    ? [day.employeeId, day.date, day.status, day.startTime, day.endTime, day.shiftKind ?? null]
    : [day.employeeId, day.date, day.status])).sort();
  return JSON.stringify([imports, days]);
}

export function validateMonthlyDraft(input: MonthlyPlanningInput, draft: MonthlyPlanDraft, boundary: MonthlyBoundaryData, mode: string, currentRoster?: MonthlyRosterSnapshot): MonthlyValidation {
  let validation = validateMonthlyPlan(input, draft.assignments, boundary);
  if (input.planningRange && (!input.rosterHistory || !currentRoster || rosterSnapshotKey(input.rosterHistory) !== rosterSnapshotKey(currentRoster))) {
    validation = { ...validation, status: validation.status === "invalid" ? "invalid" : "not_verified", unverified: [...validation.unverified, { code: "ROSTER_HISTORY_CHANGED", message: "Podklady rosteru se změnily nebo je nelze znovu ověřit. Vytvořte návrh z aktuálních podkladů." }], canConfirm: false };
  }
  if (mode === "simulated" && draft.simulationScenario === "partial") return { ...validation, status: "invalid", problems: [...validation.problems, { code: "SIMULATED_PARTIAL", message: "SIMULATED: scénář představuje částečný návrh, který nelze potvrdit." }], canConfirm: false };
  if (mode !== "simulated" || draft.simulationScenario !== "unverified") return validation;
  return { ...validation, status: validation.status === "invalid" ? "invalid" : "not_verified", unverified: [...validation.unverified, { code: "SIMULATED_UNVERIFIED", message: "SIMULATED: scénář záměrně představuje neověřené podklady." }], canConfirm: false };
}

export type MonthlyPlanningOutcome =
  | { readonly ok: true; readonly draft: MonthlyPlanDraft; readonly validation: MonthlyValidation }
  | { readonly ok: false; readonly code: "invalid_input" | "ai_failed" | "ai_invalid_output" | MonthlyProviderErrorCode; readonly message: string };

/** Jeden vstup, jedno volání poskytovatele a nezávislá kontrola celého návrhu. */
export async function executeMonthlyPlanning(input: MonthlyPlanningInput, boundary: MonthlyBoundaryData, provider: MonthlyPlanningProvider): Promise<MonthlyPlanningOutcome> {
  const validated = validateMonthlyInput(input);
  if (!validated.ok) return { ok: false, code: "invalid_input", message: validated.message };
  const range = validated.value.planningRange;
  if (range) {
    const roster = validated.value.rosterHistory;
    if (provider.name !== "ortools" || !roster) return { ok: false, code: "invalid_input", message: "Doplánování vyžaduje lokální plánovač a aktuální podklady rosteru." };
    const incomplete = roster.days.find((day) => {
      const inside = day.date >= range.startDate && day.date <= range.endDate;
      return inside ? day.status !== "unknown" : day.status !== "off" && day.status !== "shift";
    });
    if (incomplete) {
      const name = validated.value.employees.find((employee) => employee.id === incomplete.employeeId)?.displayName ?? "Zaměstnanec";
      const reason = incomplete.status === "conflict" ? "podklady si odporují" : incomplete.date >= range.startDate && incomplete.date <= range.endDate ? "ve vybraném úseku už je převzatý den" : "mimo vybraný úsek chybí údaj o směně nebo volnu";
      return { ok: false, code: "invalid_input", message: `${name}, ${incomplete.date}: ${reason}. Opravte podklady na stránce Návaznost směn nebo změňte období.` };
    }
  }
  let draft: unknown;
  try { draft = await provider.generateMonthlyPlan(validated.value, boundary); }
  catch (error) {
    if (error instanceof MonthlyProviderError) {
      const messages: Record<MonthlyProviderErrorCode, string> = {
        solver_infeasible: "Při známých vstupech a pravidlech modelu se nepodařilo sestavit úplné obsazení.",
        solver_timeout: "Plánovač nedokončil výpočet v časovém limitu. Proveditelnost zadání není rozhodnuta.",
        solver_unavailable: "Lokální plánovač není dostupný. Zkontrolujte jeho instalaci a nastavení; nebyl použit náhradní poskytovatel.",
        solver_invalid_output: "Lokální plánovač vrátil neplatný výsledek. Návrh nebyl uložen.",
      };
      return { ok: false, code: error.code, message: messages[error.code] };
    }
    if (error instanceof AiProviderError && error.code === "invalid_output") return { ok: false, code: "ai_invalid_output", message: "AI vrátila neplatný návrh." };
    return { ok: false, code: "ai_failed", message: "Návrh od zvoleného plánovače se nepodařilo získat." };
  }
  if (!isMonthlyPlanDraft(draft, input.month)) return { ok: false, code: "ai_invalid_output", message: "Zvolený plánovač vrátil neplatný návrh nebo nesprávný měsíc." };
  return { ok: true, draft, validation: validateMonthlyDraft(input, draft, boundary, provider.name, range ? input.rosterHistory : undefined) };
}
