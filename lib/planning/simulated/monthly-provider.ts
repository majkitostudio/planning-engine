import type { MonthlyPlanningInput } from "../domain/month-input";
import type { MonthlyBoundaryData } from "../domain/month-validation";
import type { ProposedAssignment } from "../domain/types";
import type { MonthlyPlanDraft, MonthlyPlanningProvider } from "../monthly-planning";

export type MonthlyScenario = "complete" | "partial" | "unverified";

/** Deterministická demonstrace, nikoli AI plánování ani záruka platného návrhu. */
export class SimulatedMonthlyProvider implements MonthlyPlanningProvider {
  readonly name = "simulated";
  constructor(private readonly scenario: MonthlyScenario) {}

  async generateMonthlyPlan(input: MonthlyPlanningInput, boundary: MonthlyBoundaryData): Promise<MonthlyPlanDraft> {
    void boundary;
    const assignments: ProposedAssignment[] = [];
    for (const requirement of input.staffingRequirements) {
      const available = input.employees.filter((employee) => input.availability.some((item) => item.employeeId === employee.id && item.date === requirement.date && item.shiftKind === requirement.shiftKind && item.available));
      for (const employee of available.slice(0, requirement.requiredEmployees)) assignments.push({ employeeId: employee.id, date: requirement.date, shiftKind: requirement.shiftKind });
    }
    if (this.scenario === "partial") assignments.pop();
    return { month: input.month, simulationScenario: this.scenario, assignments, explanations: [{ topic: "other", text: "SIMULATED: ukázkový návrh musí nezávisle projít kontrolou." }], alternatives: [], assumptions: ["SIMULATED: toto není výsledek skutečné AI."], instructionsOutcome: "SIMULATED: textové pokyny nebyly vyhodnoceny AI." };
  }
}
