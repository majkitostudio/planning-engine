/**
 * SIMULATED provider.
 *
 * Nevrací žádný vypočtený plán: pouze předem připravený `PlanDraft` pro pevný
 * fixture týden. Pro jiný týden nebo neznámého zaměstnance selže, aby se
 * simulace nikdy nevydávala za skutečný návrh.
 */

import { AiProviderError } from "../ai-provider";
import type { PlanningModelProvider } from "../ai-provider";
import type { PlanDraft, PlanningInput } from "../domain/types";
import type { SimulatedScenario } from "./scenarios";

export class SimulatedPlanningProvider implements PlanningModelProvider {
  readonly name: string;
  private readonly scenario: SimulatedScenario;

  constructor(scenario: SimulatedScenario) {
    this.scenario = scenario;
    this.name = `simulated-fixture/${scenario.id}`;
  }

  async generatePlan(
    input: PlanningInput,
    options?: { readonly signal?: AbortSignal },
  ): Promise<PlanDraft> {
    options?.signal?.throwIfAborted();

    if (input.weekStart !== this.scenario.input.weekStart) {
      throw new AiProviderError(
        "invalid_output",
        `Simulovaný scénář "${this.scenario.id}" má data jen pro týden ${this.scenario.input.weekStart}; požadavek byl pro ${input.weekStart}.`,
        {
          scenarioWeekStart: this.scenario.input.weekStart,
          requestedWeekStart: input.weekStart,
        },
      );
    }

    const employeeIds = new Set(input.employees.map((employee) => employee.id));
    const unknownAssignment = this.scenario.draft.assignments.find(
      (assignment) => !employeeIds.has(assignment.employeeId),
    );

    if (unknownAssignment) {
      throw new AiProviderError(
        "invalid_output",
        `Simulovaný návrh odkazuje na zaměstnance "${unknownAssignment.employeeId}", který není ve vstupu.`,
        { employeeId: unknownAssignment.employeeId },
      );
    }

    return structuredClone(this.scenario.draft);
  }
}
