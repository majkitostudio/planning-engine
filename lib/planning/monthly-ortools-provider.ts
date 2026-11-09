import type { MonthlyPlanningInput } from "./domain/month-input";
import type { MonthlyBoundaryData } from "./domain/month-validation";
import type { MonthlyPlanDraft, MonthlyPlanningProvider } from "./monthly-planning";
import { callMonthlyOrtools, type OrtoolsClientOptions } from "./monthly-ortools-client";

/** Stav modelu bez návrhu; není to chyba přenosu ani automatický důkaz nemožnosti. */
export class MonthlyOrtoolsResultError extends Error {
  constructor(readonly status: "INFEASIBLE" | "UNKNOWN" | "invalid_input" | "unavailable" | "error") {
    super(status);
    this.name = "MonthlyOrtoolsResultError";
  }
}

/** Provider zatím není vybrán v aplikačním runtime; návrh vždy vyžaduje nezávislou validaci. */
export class MonthlyOrtoolsProvider implements MonthlyPlanningProvider {
  readonly name = "ortools";
  constructor(private readonly options: OrtoolsClientOptions) {}

  async generateMonthlyPlan(input: MonthlyPlanningInput, boundary: MonthlyBoundaryData): Promise<MonthlyPlanDraft> {
    const result = await callMonthlyOrtools(input, boundary, this.options);
    if (result.status !== "OPTIMAL" && result.status !== "FEASIBLE") throw new MonthlyOrtoolsResultError(result.status);
    return {
      month: input.month,
      solverStatus: result.status,
      solverModelVersion: result.modelVersion,
      assignments: result.assignments,
      explanations: [],
      alternatives: [],
      assumptions: [],
      instructionsOutcome: "Volný text ani měkké preference nebyly solverem vyhodnoceny.",
    };
  }
}
