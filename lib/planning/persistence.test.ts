import { describe, expect, it, vi } from "vitest";

import { toPlanningActor } from "../auth/actor";
import { getSimulatedScenario } from "./simulated/scenarios";
import { getSimulatedReplacementScenario } from "./simulated/replacement-scenarios";
import { createReplacementOptions } from "./replacement-service";
import { makeRunResult } from "../../tests/planning/fixtures";
import {
  createInMemoryPersistenceState,
  ensurePlanningActorRecord,
  InMemoryPlanningPersistence,
  PrismaPlanningPersistence,
  PlanningPersistenceConflictError,
  type PlanningRunSnapshot,
  type ReplacementRunSnapshot,
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
  it("reuses an authenticated database account by id instead of creating an external identity", async () => {
    const existing = {
      id: actor.userId,
      externalSubject: null,
      email: actor.email,
      displayName: actor.displayName,
      role: actor.role,
      active: true,
    };
    const calls: string[] = [];
    const db = {
      appUser: {
        findUnique: async () => {
          calls.push("findUnique");
          return existing;
        },
        update: async (input: unknown) => {
          calls.push("update");
          expect(input).toMatchObject({ where: { id: actor.userId } });
          return existing;
        },
        upsert: async () => {
          calls.push("upsert");
          throw new Error("Databázový účet se nesmí duplikovat.");
        },
      },
    } as never;

    await expect(ensurePlanningActorRecord(db, actor)).resolves.toEqual(existing);
    expect(calls).toEqual(["findUnique", "update"]);
  });

  it("zachová rozhodnutí managera o požadavku i po vytvoření nové instance", async () => {
    const state = createInMemoryPersistenceState();
    const first = new InMemoryPlanningPersistence(state);
    const decidedAt = new Date("2026-10-30T08:00:00.000Z");

    await first.saveEmployeeRequestDecision(
      "request-e3-2026-10-07",
      "approved",
      actor,
      decidedAt,
    );

    const restarted = new InMemoryPlanningPersistence(state);
    await expect(restarted.getEmployeeRequestDecisions()).resolves.toEqual([
      {
        requestId: "request-e3-2026-10-07",
        status: "approved",
        decidedAt: decidedAt.toISOString(),
        decidedById: actor.userId,
      },
    ]);
  });

  it("načte uložený snapshot i z nové instance repository", async () => {
    const state = createInMemoryPersistenceState();
    const first = new InMemoryPlanningPersistence(state);
    const snapshot = makeSnapshot();

    await first.saveRun(snapshot, actor);

    const restarted = new InMemoryPlanningPersistence(state);
    await expect(restarted.getRun(snapshot.proposalId)).resolves.toEqual(snapshot);
  });

  it("odmítne přepsat již uložený týdenní návrh se stejným ID", async () => {
    const persistence = new InMemoryPlanningPersistence();
    const saved = makeSnapshot("collision-id");
    await persistence.saveRun(saved, actor);
    const confirmed = await persistence.confirmRun(
      saved.proposalId,
      saved.result.proposal.plan.assignments,
      actor,
      new Date("2026-10-28T12:00:00.000Z"),
    );
    if (!confirmed) throw new Error("Syntetický návrh se nepodařilo potvrdit.");
    const existing = confirmed.snapshot;
    const conflicting = { ...existing, scenarioLabel: "Jiný vstup" };

    await expect(persistence.saveRun(conflicting, actor)).rejects.toBeInstanceOf(
      PlanningPersistenceConflictError,
    );
    await expect(persistence.getRun(saved.proposalId)).resolves.toEqual(existing);
    expect(persistence.getAuditEvents()).toHaveLength(1);
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

function makeReplacementSnapshot(
  replacementId = "replacement-persisted",
): ReplacementRunSnapshot {
  const scenario = getSimulatedReplacementScenario("single-absence");
  if (!scenario) throw new Error("Test replacement scenario se nepodařilo načíst.");
  const result = createReplacementOptions(
    scenario.input,
    scenario.basePlan,
    { ...scenario.request, id: replacementId },
    scenario.drafts,
  );

  return {
    replacementId,
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    providerName: "simulated-fixture/single-absence",
    mode: "simulated",
    input: scenario.input,
    basePlan: scenario.basePlan,
    result,
    confirmedPlan: null,
    confirmedAt: null,
    confirmedById: null,
  };
}

describe("replacement persistence", () => {
  it("uloží pracovní snapshot bez změny výchozího potvrzeného plánu", async () => {
    const persistence = new InMemoryPlanningPersistence();
    const snapshot = makeReplacementSnapshot();

    await persistence.saveReplacementRun(snapshot, actor);

    await expect(
      persistence.getReplacementRun(snapshot.replacementId),
    ).resolves.toEqual(snapshot);
    expect(snapshot.basePlan.assignments).toHaveLength(31);
    expect(snapshot.confirmedPlan).toBeNull();
  });

  it("odmítne kolizi ID s existujícím týdenním záznamem", async () => {
    const persistence = new InMemoryPlanningPersistence();
    const weekly = makeSnapshot("shared-id");
    const replacement = makeReplacementSnapshot("shared-id");
    await persistence.saveRun(weekly, actor);

    await expect(persistence.saveReplacementRun(replacement, actor)).rejects.toBeInstanceOf(
      PlanningPersistenceConflictError,
    );
    await expect(persistence.getRun(weekly.proposalId)).resolves.toEqual(weekly);
    await expect(persistence.getReplacementRun(replacement.replacementId)).resolves.toBeNull();
  });

  it("potvrdí vybranou variantu jako novou verzi a opakování je idempotentní", async () => {
    const persistence = new InMemoryPlanningPersistence();
    const snapshot = makeReplacementSnapshot();
    const option = snapshot.result.options[0];
    if (!option) throw new Error("Fixture nemá variantu náhrady.");
    const confirmedAt = new Date("2026-10-29T08:00:00.000Z");

    await persistence.saveReplacementRun(snapshot, actor);
    const first = await persistence.confirmReplacementRun(
      snapshot.replacementId,
      option.id,
      option.draft.assignments,
      actor,
      confirmedAt,
    );
    const second = await persistence.confirmReplacementRun(
      snapshot.replacementId,
      option.id,
      option.draft.assignments,
      actor,
      new Date("2026-10-29T09:00:00.000Z"),
    );

    if (!first || !second) throw new Error("Náhrada se neuložila.");
    expect(first.alreadyConfirmed).toBe(false);
    expect(first.snapshot.confirmedPlan?.proposalId).toBe(
      snapshot.replacementId,
    );
    expect(first.snapshot.confirmedPlan?.assignments).toEqual(
      option.draft.assignments,
    );
    expect(second.alreadyConfirmed).toBe(true);
    expect(second.snapshot.confirmedPlan).toEqual(first.snapshot.confirmedPlan);
    expect(persistence.getAuditEvents()).toContainEqual(
      expect.objectContaining({
        action: "planning.replacement_confirmed",
        entityType: "replacement_run",
        entityId: snapshot.replacementId,
        actorId: actor.userId,
        details: expect.objectContaining({
          baseProposalId: snapshot.basePlan.proposalId,
          selectedOptionId: option.id,
        }),
      }),
    );
  });
});

describe("Prisma planning persistence", () => {
  it("převede kolizi ID u týdenních i náhradových záznamů na konflikt", async () => {
    const create = vi.fn().mockRejectedValue({ code: "P2002" });
    const transaction = { planningRunRecord: { create } };
    const persistence = new PrismaPlanningPersistence({
      $transaction: async (operation: (tx: typeof transaction) => unknown) =>
        operation(transaction),
    } as never);

    await expect(persistence.saveRun(makeSnapshot("existing-id"))).rejects.toBeInstanceOf(
      PlanningPersistenceConflictError,
    );
    await expect(
      persistence.saveReplacementRun(makeReplacementSnapshot("existing-id")),
    ).rejects.toBeInstanceOf(PlanningPersistenceConflictError);
    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ proposalId: "existing-id" }) }),
    );
  });
});
