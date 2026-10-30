import { describe, expect, it } from "vitest";

import { AiProviderError } from "../ai-provider";
import { SimulatedPlanningProvider } from "./provider";
import {
  getSimulatedReplacementScenario,
  type SimulatedReplacementScenario,
} from "./replacement-scenarios";

function requireScenario(): SimulatedReplacementScenario {
  const scenario = getSimulatedReplacementScenario("single-absence");
  if (!scenario) throw new Error("Chybí scénář single-absence.");
  return scenario;
}

describe("SimulatedPlanningProvider — replacement", () => {
  it("má základní scénář obsazený podle aktuálních minim všedního dne", () => {
    const scenario = requireScenario();
    const mondayMorning = scenario.basePlan.assignments.filter(
      (assignment) => assignment.date === "2026-10-05" && assignment.shiftKind === "morning",
    );

    expect(scenario.input.employees).toHaveLength(26);
    expect(mondayMorning).toHaveLength(23);
    expect(scenario.input.staffingRequirements).toContainEqual({
      date: "2026-10-05",
      shiftKind: "morning",
      requiredEmployees: 23,
    });
  });

  it("vrátí tři odlišné návrhy pro jeden syntetický výpadek", async () => {
    const scenario = requireScenario();
    const provider = new SimulatedPlanningProvider(scenario);

    const drafts = await provider.generateReplacements(
      scenario.input,
      scenario.request,
    );

    expect(drafts).toHaveLength(3);
    expect(new Set(drafts.map((draft) => draft.id)).size).toBe(3);
    expect(drafts[0]?.candidateEmployeeId).toBe(
      scenario.request.incident.absentEmployeeId === "e1" ? "e8" : "e1",
    );
    expect(drafts.some((draft) => draft.tradeOffs?.length)).toBe(true);
  });

  it("přizná scénář s méně než třemi variantami bez fiktivního doplnění", async () => {
    const scenario = requireScenario();
    const provider = new SimulatedPlanningProvider({
      ...scenario,
      drafts: scenario.drafts.slice(0, 1),
    });

    const drafts = await provider.generateReplacements(
      scenario.input,
      scenario.request,
    );

    expect(drafts).toHaveLength(1);
  });

  it.each([
    ["duplicitní variantu", (scenario: SimulatedReplacementScenario) => ({
      ...scenario,
      drafts: [scenario.drafts[0]!, scenario.drafts[0]!],
    })],
    ["neznámého zaměstnance", (scenario: SimulatedReplacementScenario) => ({
      ...scenario,
      drafts: [
        {
          ...scenario.drafts[0]!,
          candidateEmployeeId: "unknown",
        },
      ],
    })],
    ["neúplné přiřazení", (scenario: SimulatedReplacementScenario) => ({
      ...scenario,
      drafts: [
        {
          ...scenario.drafts[0]!,
          assignments: [
            {
              employeeId: scenario.drafts[0]!.candidateEmployeeId,
              date: scenario.request.incident.date,
              shiftKind: "night" as never,
            },
          ],
        },
      ],
    })],
  ])("odmítne %s jako neplatný provider output", async (_name, makeScenario) => {
    const scenario = makeScenario(requireScenario());
    const provider = new SimulatedPlanningProvider(scenario);

    await expect(
      provider.generateReplacements(scenario.input, scenario.request),
    ).rejects.toMatchObject({
      name: "AiProviderError",
      code: "invalid_output",
    });
  });
});

it("odděluje operaci náhrad od běžného generatePlan", async () => {
  const scenario = requireScenario();
  const provider = new SimulatedPlanningProvider(scenario);

  expect(provider.generateReplacements).toBeTypeOf("function");
  expect(provider.generatePlan).toBeTypeOf("function");
});

it("zachová strukturovanou chybu provideru", () => {
  expect(new AiProviderError("invalid_output", "neplatný výstup")).toBeInstanceOf(
    Error,
  );
});
