import { describe, expect, it } from "vitest";

import { AiProviderError } from "../ai-provider";
import type { PlanningInput } from "../domain/types";
import { SimulatedPlanningProvider } from "./provider";
import { getSimulatedScenario, type SimulatedScenario } from "./scenarios";

function requireScenario(id: "complete" | "partial" | "unverified"): SimulatedScenario {
  const scenario = getSimulatedScenario(id);
  if (!scenario) throw new Error(`Chybí scénář ${id}.`);
  return scenario;
}

describe("SimulatedPlanningProvider", () => {
  it("vrátí fixture draft pro správný týden", async () => {
    const scenario = requireScenario("complete");
    const provider = new SimulatedPlanningProvider(scenario);

    const draft = await provider.generatePlan(scenario.input);

    expect(draft).toEqual(scenario.draft);
    expect(provider.name).toBe("simulated-fixture/complete");
  });

  it("odmítne jiný týden, než pro který má fixture", async () => {
    const scenario = requireScenario("complete");
    const provider = new SimulatedPlanningProvider(scenario);
    const otherWeek: PlanningInput = {
      ...scenario.input,
      weekStart: "2026-10-12",
    };

    await expect(provider.generatePlan(otherWeek)).rejects.toMatchObject({
      name: "AiProviderError",
      code: "invalid_output",
    });
  });

  it("odmítne návrh s neznámým zaměstnancem ve vstupu", async () => {
    const scenario = requireScenario("complete");
    const provider = new SimulatedPlanningProvider(scenario);
    const withoutEmployee: PlanningInput = {
      ...scenario.input,
      employees: scenario.input.employees.filter(
        (employee) => employee.id !== "e1",
      ),
    };

    await expect(provider.generatePlan(withoutEmployee)).rejects.toBeInstanceOf(
      AiProviderError,
    );
  });

  it("vrací kopii, takže volající nemůže poškodit fixture", async () => {
    const scenario = requireScenario("complete");
    const provider = new SimulatedPlanningProvider(scenario);

    const first = await provider.generatePlan(scenario.input);
    Object.assign(first.assignments[0]!, { employeeId: "poškozeno" });

    const second = await provider.generatePlan(scenario.input);
    expect(second.assignments[0]!.employeeId).not.toBe("poškozeno");
  });
});
