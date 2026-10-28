/**
 * Spuštění plánovacího běhu pro UI.
 *
 * Služba je záměrně oddělená od Next.js route handleru, aby šla testovat bez
 * HTTP. Vstupní data jsou vždy SIMULATED fixture; režim rozhoduje jen o tom,
 * který provider se zavolá.
 */

import { runPlanning } from "./orchestrator";
import { createPlanningProvider } from "./provider-factory";
import { planningRunRegistry, type PlanningRunRegistry } from "./run-registry";
import type { IsoDate, PlanningFailure } from "./domain/types";
import type { PlanningProviderMode } from "./runtime-types";
import {
  getSimulatedScenario,
  type SimulatedScenarioId,
} from "./simulated/scenarios";
import { toPlanningRunView, type PlanningRunView } from "./view-model";

export interface ExecutePlanningRunRequest {
  readonly scenarioId: SimulatedScenarioId;
  readonly weekStart: IsoDate;
  readonly mode: PlanningProviderMode;
}

export type ExecutePlanningRunResult =
  | { readonly ok: true; readonly view: PlanningRunView }
  | { readonly ok: false; readonly failure: PlanningFailure };

export interface ExecutePlanningRunOptions {
  readonly now?: () => number;
}

export async function executePlanningRun(
  request: ExecutePlanningRunRequest,
  registry: PlanningRunRegistry = planningRunRegistry,
  options: ExecutePlanningRunOptions = {},
): Promise<ExecutePlanningRunResult> {
  const scenario = getSimulatedScenario(request.scenarioId);

  if (!scenario) {
    return {
      ok: false,
      failure: {
        code: "invalid_input",
        message: `Neznámý simulovaný scénář "${request.scenarioId}".`,
      },
    };
  }

  if (request.weekStart !== scenario.input.weekStart) {
    return {
      ok: false,
      failure: {
        code: "invalid_input",
        message: `Simulovaná data existují jen pro týden ${scenario.input.weekStart}; zvolený týden ${request.weekStart} nelze naplánovat.`,
        details: {
          scenarioWeekStart: scenario.input.weekStart,
          requestedWeekStart: request.weekStart,
        },
      },
    };
  }

  let provider;
  try {
    provider =
      request.mode === "simulated"
        ? createPlanningProvider({
            mode: "simulated",
            scenario: scenario.id,
          })
        : createPlanningProvider({ mode: "gemini" });
  } catch (error) {
    return {
      ok: false,
      failure: {
        code: "ai_not_configured",
        message:
          error instanceof Error
            ? error.message
            : "AI poskytovatele nešlo vytvořit.",
      },
    };
  }

  const outcome = await runPlanning(
    scenario.input,
    provider,
    options.now ? { now: options.now } : {},
  );

  if (!outcome.ok) {
    return { ok: false, failure: outcome.failure };
  }

  registry.record(
    scenario.input,
    outcome.result,
    provider.name,
    request.mode,
    { id: scenario.id, label: scenario.label },
  );

  return {
    ok: true,
    view: toPlanningRunView(outcome.result, {
      scenarioId: scenario.id,
      scenarioLabel: scenario.label,
      providerName: provider.name,
      mode: request.mode,
      employees: scenario.input.employees.map(({ id, displayName }) => ({
        id,
        displayName,
      })),
    }),
  };
}

