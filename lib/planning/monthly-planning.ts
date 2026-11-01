import { AiProviderError, isPlanDraft } from "./ai-provider";
import { validateMonthlyInput, type MonthlyPlanningInput } from "./domain/month-input";
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

export function isMonthlyPlanDraft(value: unknown, month: string): value is MonthlyPlanDraft {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const draft = value as Record<string, unknown>;
  if (draft.month !== month || typeof draft.instructionsOutcome !== "string" || (draft.simulationScenario !== undefined && draft.simulationScenario !== "complete" && draft.simulationScenario !== "partial" && draft.simulationScenario !== "unverified") || !isPlanDraft({ ...draft, weekStart: `${month}-01` })) return false;
  const normalized = draft as unknown as MonthlyPlanDraft;
  return [...normalized.assignments, ...normalized.alternatives.flatMap((alternative) => alternative.assignments)].every((assignment) => assignment.shiftKind === "morning" || assignment.shiftKind === "afternoon");
}

/** Simulovaný scénář nemůže předstírat, že záměrně neověřené podklady prošly kontrolou. */
export function validateMonthlyDraft(input: MonthlyPlanningInput, draft: MonthlyPlanDraft, boundary: MonthlyBoundaryData, mode: string): MonthlyValidation {
  const validation = validateMonthlyPlan(input, draft.assignments, boundary);
  if (mode === "simulated" && draft.simulationScenario === "partial") return { ...validation, status: "invalid", problems: [...validation.problems, { code: "SIMULATED_PARTIAL", message: "SIMULATED: scénář představuje částečný návrh, který nelze potvrdit." }], canConfirm: false };
  if (mode !== "simulated" || draft.simulationScenario !== "unverified") return validation;
  return { ...validation, status: validation.status === "invalid" ? "invalid" : "not_verified", unverified: [...validation.unverified, { code: "SIMULATED_UNVERIFIED", message: "SIMULATED: scénář záměrně představuje neověřené podklady." }], canConfirm: false };
}

export type MonthlyPlanningOutcome =
  | { readonly ok: true; readonly draft: MonthlyPlanDraft; readonly validation: MonthlyValidation }
  | { readonly ok: false; readonly code: "invalid_input" | "ai_failed" | "ai_invalid_output"; readonly message: string };

/** Jeden vstup, jedno volání poskytovatele a nezávislá kontrola celého návrhu. */
export async function executeMonthlyPlanning(input: MonthlyPlanningInput, boundary: MonthlyBoundaryData, provider: MonthlyPlanningProvider): Promise<MonthlyPlanningOutcome> {
  const validated = validateMonthlyInput(input);
  if (!validated.ok) return { ok: false, code: "invalid_input", message: validated.message };
  let draft: unknown;
  try { draft = await provider.generateMonthlyPlan(validated.value, boundary); }
  catch (error) {
    if (error instanceof AiProviderError && error.code === "invalid_output") return { ok: false, code: "ai_invalid_output", message: "AI vrátila neplatný návrh." };
    return { ok: false, code: "ai_failed", message: "Návrh od AI se nepodařilo získat." };
  }
  if (!isMonthlyPlanDraft(draft, input.month)) return { ok: false, code: "ai_invalid_output", message: "AI vrátila neplatný návrh nebo nesprávný měsíc." };
  return { ok: true, draft, validation: validateMonthlyDraft(input, draft, boundary, provider.name) };
}
