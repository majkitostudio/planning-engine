import { describe, expect, it } from "vitest";

import { toPlanningActor } from "../auth/actor";
import { makeRunResult } from "../../tests/planning/fixtures";
import { readPlanningAudit } from "./audit-service";
import { InMemoryPlanningPersistence, type PlanningRunSnapshot } from "./persistence";
import { getSimulatedScenario } from "./simulated/scenarios";

const manager = toPlanningActor({
  user: {
    id: "entra-manager",
    email: "manager@aaauto.cz",
    name: "Manažer",
    role: "manager",
  },
});

const viewer = toPlanningActor({
  user: {
    id: "entra-viewer",
    email: "viewer@aaauto.cz",
    name: "Viewer",
    role: "viewer",
  },
});

if (!manager || !viewer) throw new Error("Testovací aktéři se nepodařilo vytvořit.");

function makeSnapshot(): PlanningRunSnapshot {
  const scenario = getSimulatedScenario("complete");
  if (!scenario) throw new Error("Test scenario se nepodařilo načíst.");

  return {
    proposalId: "plan-audit",
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    providerName: "simulated-fixture/complete",
    mode: "simulated",
    input: scenario.input,
    result: makeRunResult({ id: "plan-audit" }),
    confirmedPlan: null,
    confirmedAt: null,
    confirmedById: null,
  };
}

describe("planning audit service", () => {
  it("manager přečte potvrzený návrh v auditním pohledu", async () => {
    const persistence = new InMemoryPlanningPersistence();
    const snapshot = makeSnapshot();

    await persistence.saveRun(snapshot, manager);
    await persistence.confirmRun(
      snapshot.proposalId,
      snapshot.result.proposal.plan.assignments,
      manager,
      new Date("2026-10-28T13:00:00.000Z"),
    );

    await expect(readPlanningAudit(persistence, manager)).resolves.toEqual({
      ok: true,
      entries: [
        {
          proposalId: "plan-audit",
          weekStart: "2026-10-05",
          confirmedByEmail: "manager@aaauto.cz",
          confirmedAt: "2026-10-28T13:00:00.000Z",
        },
      ],
    });
  });

  it("viewer auditní záznamy nedostane", async () => {
    const persistence = new InMemoryPlanningPersistence();

    await expect(readPlanningAudit(persistence, viewer)).resolves.toEqual({
      ok: false,
      code: "forbidden",
    });
  });
});
