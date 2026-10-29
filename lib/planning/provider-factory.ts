/**
 * Výběr AI poskytovatele.
 *
 * Factory je záměrně explicitní: žádný „když není klíč, použij simulaci“.
 * Volající musí říct, zda chce simulovaný fixture, nebo reálného Gemini.
 */

import { GeminiPlanningProvider } from "../ai/gemini-planning-provider";
import { AiProviderError } from "./ai-provider";
import type { PlanningModelProvider } from "./ai-provider";
import { SimulatedPlanningProvider } from "./simulated/provider";
import {
  getSimulatedScenario,
  type SimulatedScenarioId,
} from "./simulated/scenarios";
import {
  getSimulatedReplacementScenario,
  type SimulatedReplacementScenarioId,
} from "./simulated/replacement-scenarios";

export type PlanningProviderSelection =
  | { readonly mode: "simulated"; readonly scenario: SimulatedScenarioId }
  | {
      readonly mode: "simulated_replacement";
      readonly scenario: SimulatedReplacementScenarioId;
    }
  | { readonly mode: "gemini" };

export function createPlanningProvider(
  selection: PlanningProviderSelection,
): PlanningModelProvider {
  if (selection.mode === "simulated") {
    const scenario = getSimulatedScenario(selection.scenario);
    if (!scenario) {
      throw new AiProviderError(
        "invalid_output",
        `Neznámý simulovaný scénář "${selection.scenario}".`,
      );
    }
    return new SimulatedPlanningProvider(scenario);
  }

  if (selection.mode === "simulated_replacement") {
    const scenario = getSimulatedReplacementScenario(selection.scenario);
    if (!scenario) {
      throw new AiProviderError(
        "invalid_output",
        `Neznámý simulovaný scénář operativní náhrady "${selection.scenario}".`,
      );
    }
    return new SimulatedPlanningProvider(scenario);
  }

  return new GeminiPlanningProvider();
}
