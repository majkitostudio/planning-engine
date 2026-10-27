/**
 * Serverová konfigurace plánovacího běhu.
 *
 * Tento modul se smí importovat jen ze serverových částí aplikace (page,
 * route handler). Klient dostává pouze bezpečný popis režimu, nikdy klíč.
 *
 * `PLANNING_PROVIDER` je povinný. Chybějící hodnota není „použij simulaci“;
 * znamená poctivě nekonfigurovaný běh.
 */

import type { PlanningProviderMode } from "./runtime-types";
import {
  SIMULATED_SCENARIO_SUMMARIES,
  type SimulatedScenarioSummary,
} from "./simulated/scenarios";

export interface PlanningRuntimeConfigured {
  readonly configured: true;
  readonly mode: PlanningProviderMode;
  readonly scenarios: readonly SimulatedScenarioSummary[];
  readonly notice: string;
}

export interface PlanningRuntimeUnconfigured {
  readonly configured: false;
  readonly reason: string;
  readonly scenarios: readonly [];
}

export type PlanningRuntime =
  | PlanningRuntimeConfigured
  | PlanningRuntimeUnconfigured;

type PlanningEnvironment = Readonly<Record<string, string | undefined>>;

const SIMULATED_NOTICE =
  "Běh používá pevné SIMULATED fixtures. Nejde o skutečný rozpis ani o potvrzená data.";
const GEMINI_NOTICE =
  "Vstupní data jsou SIMULATED fixtures. Reálné volání Gemini je NOT VERIFIED a výsledek není skutečný rozpis.";

export function getPlanningRuntime(
  env: PlanningEnvironment = process.env,
): PlanningRuntime {
  const raw = env.PLANNING_PROVIDER?.trim();

  if (!raw) {
    return {
      configured: false,
      reason:
        "PLANNING_PROVIDER není nastavený. Nastavte „simulated“ pro demo fixtures, nebo „gemini“ pro reálného poskytovatele.",
      scenarios: [],
    };
  }

  if (raw === "simulated") {
    return {
      configured: true,
      mode: "simulated",
      scenarios: SIMULATED_SCENARIO_SUMMARIES,
      notice: SIMULATED_NOTICE,
    };
  }

  if (raw === "gemini") {
    return {
      configured: true,
      mode: "gemini",
      scenarios: SIMULATED_SCENARIO_SUMMARIES,
      notice: GEMINI_NOTICE,
    };
  }

  return {
    configured: false,
    reason:
      "PLANNING_PROVIDER má neznámou hodnotu. Povolené jsou „simulated“ a „gemini“.",
    scenarios: [],
  };
}
