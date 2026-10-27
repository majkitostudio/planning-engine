import { describe, expect, it } from "vitest";

import { getPlanningRuntime } from "./server-config";
import { SIMULATED_SCENARIO_SUMMARIES } from "./simulated/scenarios";

describe("getPlanningRuntime", () => {
  it("bez PLANNING_PROVIDER nepředstírá simulaci", () => {
    const runtime = getPlanningRuntime({});

    expect(runtime.configured).toBe(false);
    if (runtime.configured) return;
    expect(runtime.reason).toContain("PLANNING_PROVIDER");
    expect(runtime.scenarios).toEqual([]);
  });

  it("prázdná nebo bílá hodnota je nekonfigurovaná", () => {
    expect(getPlanningRuntime({ PLANNING_PROVIDER: "" }).configured).toBe(false);
    expect(getPlanningRuntime({ PLANNING_PROVIDER: "   " }).configured).toBe(false);
  });

  it("simulated zpřístupní tři fixture scénáře", () => {
    const runtime = getPlanningRuntime({ PLANNING_PROVIDER: "simulated" });

    expect(runtime.configured).toBe(true);
    if (!runtime.configured) return;
    expect(runtime.mode).toBe("simulated");
    expect(runtime.scenarios).toEqual(SIMULATED_SCENARIO_SUMMARIES);
    expect(runtime.scenarios).toHaveLength(3);
    expect(runtime.notice).toContain("SIMULATED");
  });

  it("gemini zůstává označený jako neověřený a se SIMULATED vstupy", () => {
    const runtime = getPlanningRuntime({ PLANNING_PROVIDER: "gemini" });

    expect(runtime.configured).toBe(true);
    if (!runtime.configured) return;
    expect(runtime.mode).toBe("gemini");
    expect(runtime.notice).toContain("SIMULATED");
    expect(runtime.notice).toContain("NOT VERIFIED");
  });

  it("neznámou hodnotu odmítne místo tichého fallbacku", () => {
    const runtime = getPlanningRuntime({ PLANNING_PROVIDER: "openai" });

    expect(runtime.configured).toBe(false);
    if (runtime.configured) return;
    expect(runtime.reason).toContain("simulated");
    expect(runtime.reason).toContain("gemini");
    expect(runtime.scenarios).toEqual([]);
  });

  it("ořezává okolní mezery", () => {
    const runtime = getPlanningRuntime({ PLANNING_PROVIDER: " simulated " });

    expect(runtime.configured).toBe(true);
    if (!runtime.configured) return;
    expect(runtime.mode).toBe("simulated");
  });
});
