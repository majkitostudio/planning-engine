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

export type PlanningProviderSelection =
  | { readonly mode: "simulated"; readonly scenario: SimulatedScenarioId }
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

  return new GeminiPlanningProvider();
}
