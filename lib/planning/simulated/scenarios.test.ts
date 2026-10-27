import { describe, expect, it } from "vitest";

import { runPlanning } from "../orchestrator";
import { SimulatedPlanningProvider } from "./provider";
import {
  SIMULATED_SCENARIOS,
  SIMULATED_WEEK_START,
  getSimulatedScenario,
} from "./scenarios";

describe("SIMULATED scénáře", () => {
  for (const scenario of SIMULATED_SCENARIOS) {
    it(`scénář "${scenario.id}" skončí jako ${scenario.expectedStatus}/${scenario.expectedCompleteness}`, async () => {
      const outcome = await runPlanning(
        scenario.input,
        new SimulatedPlanningProvider(scenario),
      );

      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;

      expect(outcome.result.weekStart).toBe(SIMULATED_WEEK_START);
      expect(outcome.result.status).toBe(scenario.expectedStatus);
      expect(outcome.result.completeness).toBe(scenario.expectedCompleteness);
      expect(outcome.result.validation.status).toBe(
        scenario.expectedValidationStatus,
      );
      expect(outcome.result.confirmed).toBe(false);
      expect(outcome.result.proposal.source.kind).toBe("ai");
    });
  }

  it("kompletní scénář má plné pokrytí a žádný nález ani neověřenou kontrolu", async () => {
    const scenario = getSimulatedScenario("complete");
    if (!scenario) throw new Error("Chybí scénář complete.");

    const outcome = await runPlanning(
      scenario.input,
      new SimulatedPlanningProvider(scenario),
    );
    if (!outcome.ok) throw new Error(outcome.failure.message);

    expect(outcome.result.coverage.every((line) => line.missingEmployees === 0)).toBe(
      true,
    );
    expect(
      outcome.result.coverage.every(
        (line) => line.assignedEmployees === line.requiredEmployees,
      ),
    ).toBe(true);
    expect(outcome.result.validation.problems).toEqual([]);
    expect(outcome.result.validation.unverifiedChecks).toEqual([]);
    expect(outcome.result.changes.some((change) => change.type === "removed")).toBe(
      true,
    );
  });

  it("částečný scénář přizná chybějící obsazení", async () => {
    const scenario = getSimulatedScenario("partial");
    if (!scenario) throw new Error("Chybí scénář partial.");

    const outcome = await runPlanning(
      scenario.input,
      new SimulatedPlanningProvider(scenario),
    );
    if (!outcome.ok) throw new Error(outcome.failure.message);

    const missing = outcome.result.coverage.reduce(
      (sum, line) => sum + line.missingEmployees,
      0,
    );
    expect(missing).toBe(5);
    expect(
      outcome.result.validation.problems.some(
        (problem) => problem.code === "COVERAGE_UNDERSTAFFED",
      ),
    ).toBe(true);
    expect(outcome.result.validation.unverifiedChecks).toEqual([]);
  });

  it("scénář s neúplnou historií zůstane not_verified", async () => {
    const scenario = getSimulatedScenario("unverified");
    if (!scenario) throw new Error("Chybí scénář unverified.");

    const outcome = await runPlanning(
      scenario.input,
      new SimulatedPlanningProvider(scenario),
    );
    if (!outcome.ok) throw new Error(outcome.failure.message);

    expect(outcome.result.validation.problems).toEqual([]);
    expect(
      outcome.result.validation.unverifiedChecks.some(
        (check) => check.code === "REST_HISTORY_INCOMPLETE",
      ),
    ).toBe(true);
    expect(outcome.result.status).toBe("not_verified");
  });

  it("každé přiřazení odkazuje na známého zaměstnance a den fixture týdne", async () => {
    for (const scenario of SIMULATED_SCENARIOS) {
      const employeeIds = new Set(
        scenario.input.employees.map((employee) => employee.id),
      );
      const weekEnd = "2026-10-11";

      for (const assignment of scenario.draft.assignments) {
        expect(employeeIds.has(assignment.employeeId)).toBe(true);
        expect(assignment.date >= SIMULATED_WEEK_START).toBe(true);
        expect(assignment.date <= weekEnd).toBe(true);
      }
    }
  });

  it("opakovaný běh dává stejná přiřazení", async () => {
    const scenario = getSimulatedScenario("complete");
    if (!scenario) throw new Error("Chybí scénář complete.");

    const provider = new SimulatedPlanningProvider(scenario);
    const first = await runPlanning(scenario.input, provider);
    const second = await runPlanning(scenario.input, provider);

    if (!first.ok || !second.ok) throw new Error("Běh měl skončit úspěchem.");

    expect(second.result.proposal.plan.assignments).toEqual(
      first.result.proposal.plan.assignments,
    );
    expect(second.result.status).toBe(first.result.status);
  });
});
