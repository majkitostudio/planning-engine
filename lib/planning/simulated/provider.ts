/**
 * SIMULATED provider.
 *
 * Nevrací žádný vypočtený plán: pouze předem připravený `PlanDraft` pro pevný
 * fixture týden. Pro jiný týden nebo neznámého zaměstnance selže, aby se
 * simulace nikdy nevydávala za skutečný návrh.
 */

import { AiProviderError } from "../ai-provider";
import type { PlanningModelProvider } from "../ai-provider";
import type {
  PlanDraft,
  PlanningInput,
  ReplacementDraft,
  ReplacementRequest,
} from "../domain/types";
import type { SimulatedReplacementScenario } from "./replacement-scenarios";
import type { SimulatedScenario } from "./scenarios";

type SimulatedProviderScenario = SimulatedScenario | SimulatedReplacementScenario;

export class SimulatedPlanningProvider implements PlanningModelProvider {
  readonly name: string;
  private readonly scenario: SimulatedProviderScenario;

  constructor(scenario: SimulatedProviderScenario) {
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
    if (!("draft" in this.scenario)) {
      throw new AiProviderError(
        "invalid_output",
        `Simulovaný scénář "${this.scenario.id}" nepodporuje běžný týdenní návrh.`,
      );
    }

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

  async generateReplacements(
    input: PlanningInput,
    request: ReplacementRequest,
    options?: { readonly signal?: AbortSignal },
  ): Promise<readonly ReplacementDraft[]> {
    options?.signal?.throwIfAborted();

    if (!("drafts" in this.scenario)) {
      throw new AiProviderError(
        "invalid_output",
        `Simulovaný scénář "${this.scenario.id}" nepodporuje operativní náhrady.`,
      );
    }

    if (
      input.weekStart !== this.scenario.input.weekStart ||
      request.weekStart !== this.scenario.input.weekStart
    ) {
      throw new AiProviderError(
        "invalid_output",
        `Simulovaný scénář "${this.scenario.id}" má data jen pro týden ${this.scenario.input.weekStart}.`,
      );
    }

    const employeeIds = new Set(input.employees.map((employee) => employee.id));
    const seenIds = new Set<string>();
    for (const draft of this.scenario.drafts) {
      if (!isReplacementDraft(draft)) {
        throw new AiProviderError(
          "invalid_output",
          "Simulovaný návrh náhrady nemá platnou strukturu.",
        );
      }
      if (seenIds.has(draft.id)) {
        throw new AiProviderError(
          "invalid_output",
          `Simulovaný návrh obsahuje duplicitní variantu "${draft.id}".`,
          { optionId: draft.id },
        );
      }
      seenIds.add(draft.id);

      if (!employeeIds.has(draft.candidateEmployeeId)) {
        throw new AiProviderError(
          "invalid_output",
          `Simulovaný návrh odkazuje na neznámého kandidáta "${draft.candidateEmployeeId}".`,
          { employeeId: draft.candidateEmployeeId },
        );
      }

      const invalidAssignment = draft.assignments.find(
        (assignment) =>
          !employeeIds.has(assignment.employeeId) ||
          !isDateInWeek(assignment.date, input.weekStart) ||
          !isShiftKind(assignment.shiftKind),
      );
      if (invalidAssignment) {
        throw new AiProviderError(
          "invalid_output",
          "Simulovaný návrh obsahuje neplatné nebo neúplné celé přiřazení.",
          { employeeId: invalidAssignment.employeeId },
        );
      }
    }

    return structuredClone(this.scenario.drafts);
  }
}

function isReplacementDraft(value: unknown): value is ReplacementDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.id === "string" &&
    draft.id.length > 0 &&
    typeof draft.candidateEmployeeId === "string" &&
    Array.isArray(draft.assignments) &&
    typeof draft.summary === "string" &&
    typeof draft.rationale === "string"
  );
}

function isShiftKind(value: unknown): value is "morning" | "afternoon" {
  return value === "morning" || value === "afternoon";
}

function isDateInWeek(date: unknown, weekStart: string): date is string {
  if (typeof date !== "string") return false;
  const start = new Date(`${weekStart}T00:00:00Z`).getTime();
  const current = new Date(`${date}T00:00:00Z`).getTime();
  return Number.isFinite(start) && Number.isFinite(current) && current >= start && current <= start + 6 * 24 * 60 * 60 * 1_000;
}
