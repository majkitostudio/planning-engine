import { describe, expect, it } from "vitest";

import { toPlanningActor } from "../auth/actor";
import { getSimulatedScenario } from "./simulated/scenarios";
import { makeRunResult } from "../../tests/planning/fixtures";
import {
  createInMemoryPersistenceState,
  InMemoryPlanningPersistence,
  type PlanningRunSnapshot,
} from "./persistence";

const actor = toPlanningActor({
  user: {
    id: "entra-manager",
    email: "manager@aaauto.cz",
    name: "Manažer",
    role: "manager",
  },
});

if (!actor) throw new Error("Test actor se nepodařilo vytvořit.");

function makeSnapshot(proposalId = "plan-persisted"): PlanningRunSnapshot {
  const scenario = getSimulatedScenario("complete");
  if (!scenario) throw new Error("Test scenario se nepodařilo načíst.");

  return {
    proposalId,
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    providerName: "simulated-fixture/complete",
    mode: "simulated",
    input: scenario.input,
    result: makeRunResult({ id: proposalId }),
    confirmedPlan: null,
    confirmedAt: null,
    confirmedById: null,
  };
}

describe("planning persistence", () => {
  it("načte uložený snapshot i z nové instance repository", async () => {
    const state = createInMemoryPersistenceState();
    const first = new InMemoryPlanningPersistence(state);
    const snapshot = makeSnapshot();

    await first.saveRun(snapshot, actor);

    const restarted = new InMemoryPlanningPersistence(state);
    await expect(restarted.getRun(snapshot.proposalId)).resolves.toEqual(snapshot);
  });

  it("potvrzení uloží jednou a opakování je idempotentní", async () => {
    const state = createInMemoryPersistenceState();
    const persistence = new InMemoryPlanningPersistence(state);
    const snapshot = makeSnapshot();
    const confirmedAt = new Date("2026-10-28T12:00:00.000Z");

    await persistence.saveRun(snapshot, actor);
    const first = await persistence.confirmRun(
      snapshot.proposalId,
      snapshot.result.proposal.plan.assignments,
      actor,
      confirmedAt,
    );
    const second = await persistence.confirmRun(
      snapshot.proposalId,
      snapshot.result.proposal.plan.assignments,
      actor,
      new Date("2026-10-28T13:00:00.000Z"),
    );
    if (!first || !second) throw new Error("Potvrzení se neuložilo.");

    expect(first.alreadyConfirmed).toBe(false);
    expect(second.alreadyConfirmed).toBe(true);
    expect(second.snapshot.confirmedAt).toBe(confirmedAt.toISOString());
    expect(persistence.getAuditEvents()).toHaveLength(1);
    expect(persistence.getAuditEvents()[0]).toMatchObject({
      action: "planning.confirmed",
      actorId: actor.userId,
      entityId: snapshot.proposalId,
    });
  });

  it("neznámý návrh nepotvrdí", async () => {
    const persistence = new InMemoryPlanningPersistence();

    await expect(
      persistence.confirmRun(
        "unknown",
        [],
        actor,
        new Date("2026-10-28T12:00:00.000Z"),
      ),
    ).resolves.toBeNull();
  });

  it("vrátí potvrzení pro audit od nejnovějšího", async () => {
    const persistence = new InMemoryPlanningPersistence();
    const older = makeSnapshot("plan-older");
    const newer = makeSnapshot("plan-newer");

    await persistence.saveRun(older, actor);
    await persistence.confirmRun(
      older.proposalId,
      older.result.proposal.plan.assignments,
      actor,
      new Date("2026-10-28T12:00:00.000Z"),
    );
    await persistence.saveRun(newer, actor);
    await persistence.confirmRun(
      newer.proposalId,
      newer.result.proposal.plan.assignments,
      actor,
      new Date("2026-10-28T13:00:00.000Z"),
    );

    await expect(persistence.listAuditEvents()).resolves.toMatchObject([
      {
        action: "planning.confirmed",
        entityId: "plan-newer",
        actorId: actor.userId,
        createdAt: "2026-10-28T13:00:00.000Z",
        details: { weekStart: "2026-10-05", email: "manager@aaauto.cz" },
      },
      {
        action: "planning.confirmed",
        entityId: "plan-older",
        actorId: actor.userId,
        createdAt: "2026-10-28T12:00:00.000Z",
        details: { weekStart: "2026-10-05", email: "manager@aaauto.cz" },
      },
    ]);
  });
});
