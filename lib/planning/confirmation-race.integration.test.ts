import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { toPlanningActor } from "../auth/actor";
import { prisma } from "../db";
import { makeRunResult } from "../../tests/planning/fixtures";
import { createReplacementOptions } from "./replacement-service";
import {
  getSimulatedReplacementScenario,
} from "./simulated/replacement-scenarios";
import { getSimulatedScenario } from "./simulated/scenarios";
import {
  PrismaPlanningPersistence,
  type PlanningRunSnapshot,
  type ReplacementRunSnapshot,
} from "./persistence";

const enabled = process.env.PLANNING_CONFIRMATION_RACE_INTEGRATION === "1";

describe.skipIf(!enabled)("souběžné týdenní potvrzení v izolované PostgreSQL", () => {
  it("potvrdí týdenní návrh a zapíše audit právě jednou", async () => {
    assertIsolatedDatabase();
    const suffix = randomUUID();
    const proposalId = `synthetic-weekly-race-${suffix}`;
    const scenario = getSimulatedScenario("complete");
    if (!scenario) throw new Error("Chybí syntetický týdenní scénář.");
    const snapshot: PlanningRunSnapshot = {
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
    const firstAssignments = snapshot.result.proposal.plan.assignments;
    const secondAssignments = [...firstAssignments].reverse();
    const submitted = [firstAssignments, secondAssignments];
    const persistence = new PrismaPlanningPersistence(
      withReadBarrier(prisma, proposalId),
    );
    const actors = await createSyntheticActors(suffix);
    const accountIds = [actors.first.accountId, actors.second.accountId];

    try {
      await persistence.saveRun(snapshot, actors.first.actor);
      const results = await Promise.all([
        persistence.confirmRun(
          proposalId,
          firstAssignments,
          actors.first.actor,
          new Date("2026-11-04T12:00:00.000Z"),
        ),
        persistence.confirmRun(
          proposalId,
          secondAssignments,
          actors.second.actor,
          new Date("2026-11-04T12:01:00.000Z"),
        ),
      ]);
      const confirmations = results.filter((result) => result !== null);
      const winners = confirmations.filter((result) => !result.alreadyConfirmed);
      const retries = confirmations.filter((result) => result.alreadyConfirmed);
      const stored = await persistence.getRun(proposalId);

      expect(winners).toHaveLength(1);
      expect(retries).toHaveLength(1);
      expect(submitted).toContainEqual(stored?.confirmedPlan?.assignments);
      expect(confirmations.map((result) => result.snapshot.confirmedPlan)).toEqual([
        stored?.confirmedPlan,
        stored?.confirmedPlan,
      ]);
      await expect(
        prisma.auditEvent.count({
          where: { entityType: "planning_run", entityId: proposalId, action: "planning.confirmed" },
        }),
      ).resolves.toBe(1);
    } finally {
      await cleanup([proposalId], accountIds);
    }
  }, 15000);

  it("potvrdí operativní náhradu a zapíše audit právě jednou", async () => {
    assertIsolatedDatabase();
    const suffix = randomUUID();
    const replacementId = `synthetic-replacement-race-${suffix}`;
    const scenario = getSimulatedReplacementScenario("single-absence");
    if (!scenario) throw new Error("Chybí syntetický scénář operativní náhrady.");
    const request = { ...scenario.request, id: replacementId };
    const snapshot: ReplacementRunSnapshot = {
      replacementId,
      scenarioId: scenario.id,
      scenarioLabel: scenario.label,
      providerName: "simulated-fixture/single-absence",
      mode: "simulated",
      input: scenario.input,
      basePlan: scenario.basePlan,
      result: createReplacementOptions(
        scenario.input,
        scenario.basePlan,
        request,
        scenario.drafts,
      ),
      confirmedPlan: null,
      confirmedAt: null,
      confirmedById: null,
    };
    const selectedOption = snapshot.result.options[0];
    if (!selectedOption) throw new Error("Scénář náhrady nemá variantu.");
    const firstAssignments = selectedOption.draft.assignments;
    const secondAssignments = [...firstAssignments].reverse();
    const submitted = [firstAssignments, secondAssignments];
    const persistence = new PrismaPlanningPersistence(
      withReadBarrier(prisma, replacementId),
    );
    const actors = await createSyntheticActors(suffix);
    const accountIds = [actors.first.accountId, actors.second.accountId];

    try {
      await persistence.saveReplacementRun(snapshot, actors.first.actor);
      const results = await Promise.all([
        persistence.confirmReplacementRun(
          replacementId,
          selectedOption.id,
          firstAssignments,
          actors.first.actor,
          new Date("2026-11-04T12:10:00.000Z"),
        ),
        persistence.confirmReplacementRun(
          replacementId,
          selectedOption.id,
          secondAssignments,
          actors.second.actor,
          new Date("2026-11-04T12:11:00.000Z"),
        ),
      ]);
      const confirmations = results.filter((result) => result !== null);
      const winners = confirmations.filter((result) => !result.alreadyConfirmed);
      const retries = confirmations.filter((result) => result.alreadyConfirmed);
      const stored = await persistence.getReplacementRun(replacementId);

      expect(winners).toHaveLength(1);
      expect(retries).toHaveLength(1);
      expect(submitted).toContainEqual(stored?.confirmedPlan?.assignments);
      expect(confirmations.map((result) => result.snapshot.confirmedPlan)).toEqual([
        stored?.confirmedPlan,
        stored?.confirmedPlan,
      ]);
      await expect(
        prisma.auditEvent.count({
          where: {
            entityType: "replacement_run",
            entityId: replacementId,
            action: "planning.replacement_confirmed",
          },
        }),
      ).resolves.toBe(1);
    } finally {
      await cleanup([replacementId], accountIds);
    }
  }, 15000);
});

function assertIsolatedDatabase(): void {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (
    url.hostname !== "localhost" ||
    url.port !== "55439" ||
    url.pathname !== "/planning_monthly_test"
  ) {
    throw new Error(
      "Integrační test vyžaduje výhradně vyhrazenou izolovanou databázi na localhost:55439/planning_monthly_test.",
    );
  }
}

async function createSyntheticActor(suffix: string) {
  const account = await prisma.appUser.create({
    data: {
      email: `confirmation-manager-${suffix}@example.test`,
      displayName: "Synthetic Confirmation Manager",
      role: "manager",
    },
  });
  const actor = toPlanningActor({
    user: {
      id: account.id,
      email: account.email,
      name: account.displayName,
      role: "manager",
    },
  });
  if (!actor) {
    await prisma.appUser.delete({ where: { id: account.id } });
    throw new Error("Syntetický manager není platný.");
  }
  return { actor, accountId: account.id };
}

async function createSyntheticActors(suffix: string) {
  const first = await createSyntheticActor(`${suffix}-first`);
  try {
    const second = await createSyntheticActor(`${suffix}-second`);
    return { first, second };
  } catch (error) {
    await prisma.appUser.deleteMany({ where: { id: first.accountId } });
    throw error;
  }
}

async function cleanup(ids: string[], accountIds: string[]): Promise<void> {
  await prisma.auditEvent.deleteMany({ where: { entityId: { in: ids } } });
  await prisma.planningRunRecord.deleteMany({ where: { proposalId: { in: ids } } });
  await prisma.appUser.deleteMany({ where: { id: { in: accountIds } } });
}

function withReadBarrier(db: typeof prisma, proposalId: string): typeof prisma {
  const originalTransaction = db.$transaction.bind(db) as unknown as (
    operation: (transaction: unknown) => Promise<unknown>,
  ) => Promise<unknown>;
  let readers = 0;
  let releaseReaders!: () => void;
  const bothReadersReady = new Promise<void>((resolve) => {
    releaseReaders = resolve;
  });

  return new Proxy(db, {
    get(target, property, receiver) {
      if (property !== "$transaction") {
        return Reflect.get(target, property, receiver);
      }
      return (operation: (transaction: unknown) => Promise<unknown>) =>
        originalTransaction((transaction) =>
          operation(new Proxy(transaction as object, {
            get(tx, key, txReceiver) {
              if (key !== "planningRunRecord") {
                return Reflect.get(tx, key, txReceiver);
              }
              const delegate = Reflect.get(tx, key, tx);
              return new Proxy(delegate, {
                get(recordDelegate, method, delegateReceiver) {
                  if (method !== "findUnique") {
                    return Reflect.get(recordDelegate, method, delegateReceiver);
                  }
                  const findUnique = Reflect.get(recordDelegate, method, recordDelegate) as
                    (args: { where?: { proposalId?: string } }) => Promise<unknown>;
                  return async (args: { where?: { proposalId?: string } }) => {
                    const row = await findUnique.call(recordDelegate, args);
                    if (args.where?.proposalId !== proposalId || readers >= 2) return row;
                    // Ensure both transactions read the unconfirmed row before either proceeds.
                    readers += 1;
                    if (readers === 2) releaseReaders();
                    await bothReadersReady;
                    return row;
                  };
                },
              });
            },
          })),
        ) as Promise<unknown>;
    },
  });
}
