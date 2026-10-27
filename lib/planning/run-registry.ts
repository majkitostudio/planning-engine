/**
 * Dočasný registr plánovacích běhů.
 *
 * SIMULATED / NOT PERSISTED: drží výsledky pouze v paměti procesu. Restart
 * serveru je ztratí a víc instancí si je nesdílí. Není to úložiště plánu ani
 * náhrada databáze.
 */

import type {
  ConfirmedPlan,
  PlanningInput,
  PlanningRunResult,
} from "./domain/types";
import type { PlanningProviderMode } from "./runtime-types";

export interface StoredPlanningRun {
  readonly input: PlanningInput;
  readonly result: PlanningRunResult;
  readonly providerName: string;
  readonly mode: PlanningProviderMode;
  readonly scenarioId: string;
  readonly scenarioLabel: string;
  readonly confirmedPlan: ConfirmedPlan | null;
}

export class PlanningRunRegistry {
  private readonly runs = new Map<string, StoredPlanningRun>();

  record(
    input: PlanningInput,
    result: PlanningRunResult,
    providerName: string,
    mode: PlanningProviderMode,
    scenario: { readonly id: string; readonly label: string },
  ): StoredPlanningRun {
    const stored: StoredPlanningRun = {
      input,
      result,
      providerName,
      mode,
      scenarioId: scenario.id,
      scenarioLabel: scenario.label,
      confirmedPlan: null,
    };
    this.runs.set(result.proposal.id, stored);
    return stored;
  }

  get(proposalId: string): StoredPlanningRun | undefined {
    return this.runs.get(proposalId);
  }

  setConfirmedPlan(
    proposalId: string,
    confirmedPlan: ConfirmedPlan,
  ): StoredPlanningRun | undefined {
    const stored = this.runs.get(proposalId);
    if (!stored) return undefined;

    const updated: StoredPlanningRun = { ...stored, confirmedPlan };
    this.runs.set(proposalId, updated);
    return updated;
  }

  clear(): void {
    this.runs.clear();
  }

  get size(): number {
    return this.runs.size;
  }
}

/** Jeden proces = jeden registr. Není to trvalé úložiště. */
export const planningRunRegistry = new PlanningRunRegistry();
