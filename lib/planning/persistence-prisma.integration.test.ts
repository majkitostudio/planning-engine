import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { prisma } from "../db";
import { toPlanningActor } from "../auth/actor";
import { makeRunResult } from "../../tests/planning/fixtures";
import { createReplacementOptions } from "./replacement-service";
import { confirmPersistedReplacementRun } from "./confirm-service";
import {
  getSimulatedReplacementScenario,
} from "./simulated/replacement-scenarios";
import { getSimulatedScenario } from "./simulated/scenarios";
import {
  PrismaPlanningPersistence,
  PlanningPersistenceConflictError,
  type PlanningRunSnapshot,
  type ReplacementRunSnapshot,
} from "./persistence";

const enabled = process.env.PLANNING_PERSISTENCE_INTEGRATION === "1";

describe.skipIf(!enabled)("týdenní persistence v izolované PostgreSQL", () => {
  it("zachová ověřený zdroj obsazení a zablokuje starší návrh bez něj", async () => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (url.hostname !== "localhost" || url.port !== "55439" || url.pathname !== "/planning_monthly_test") throw new Error("Integrační test vyžaduje výhradně vyhrazenou izolovanou databázi.");
    const suffix = randomUUID();
    const actor = toPlanningActor({ user: { id: `source-${suffix}`, email: `${suffix}@example.test`, name: "Syntetický manažer", role: "manager" } });
    const scenario = getSimulatedReplacementScenario("single-absence");
    if (!actor || !scenario) throw new Error("Chybí syntetický aktér nebo scénář.");
    const makeSnapshot = (id: string): ReplacementRunSnapshot => ({
      replacementId: id, scenarioId: scenario.id, scenarioLabel: scenario.label,
      providerName: "simulated-fixture/single-absence", mode: "simulated", input: scenario.input,
      basePlan: scenario.basePlan,
      result: createReplacementOptions(scenario.input, scenario.basePlan, { ...scenario.request, id }, scenario.drafts),
      confirmedPlan: null, confirmedAt: null, confirmedById: null,
    });
    const persistence = new PrismaPlanningPersistence(prisma);
    const current = { ...makeSnapshot(`source-current-${suffix}`), staffingSource: "saved" as const };
    const legacy = makeSnapshot(`source-legacy-${suffix}`);
    await persistence.saveReplacementRun(current, actor);
    await persistence.saveReplacementRun(legacy, actor);
    expect(await persistence.getReplacementRun(current.replacementId)).toMatchObject({ staffingSource: "saved" });
    expect(await persistence.getReplacementRun(legacy.replacementId)).not.toHaveProperty("staffingSource");
    expect(await confirmPersistedReplacementRun(persistence, legacy.replacementId, legacy.result.options[0]!.id, actor)).toMatchObject({ ok: false, code: "replacement_confirmation_blocked", blockers: expect.arrayContaining([expect.objectContaining({ code: "replacement_not_verified" })]) });
    expect(await confirmPersistedReplacementRun(persistence, current.replacementId, current.result.options[0]!.id, actor)).toMatchObject({ ok: true, alreadyConfirmed: false });
    expect(await persistence.getReplacementRun(current.replacementId)).toMatchObject({ staffingSource: "saved" });
  });
  it("odmítne kolizi s potvrzeným týdenním záznamem bez změny uložených dat", async () => {
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

    const suffix = randomUUID();
    const proposalId = `synthetic-weekly-${suffix}`;
    const manager = toPlanningActor({
      user: {
        id: `synthetic-manager-${suffix}`,
        email: `${suffix}@example.test`,
        name: "Syntetický manažer",
        role: "manager",
      },
    });
    if (!manager) throw new Error("Syntetický testovací manažer není platný.");

    const weeklyScenario = getSimulatedScenario("complete");
    if (!weeklyScenario) throw new Error("Týdenní syntetický scénář chybí.");
    const weeklySnapshot: PlanningRunSnapshot = {
      proposalId,
      scenarioId: weeklyScenario.id,
      scenarioLabel: weeklyScenario.label,
      providerName: "simulated-fixture/complete",
      mode: "simulated",
      input: weeklyScenario.input,
      result: makeRunResult({ id: proposalId }),
      confirmedPlan: null,
      confirmedAt: null,
      confirmedById: null,
    };

    const replacementScenario = getSimulatedReplacementScenario("single-absence");
    if (!replacementScenario) throw new Error("Scénář syntetické náhrady chybí.");
    const replacementRequest = {
      ...replacementScenario.request,
      id: proposalId,
    };
    const replacementSnapshot: ReplacementRunSnapshot = {
      replacementId: proposalId,
      scenarioId: replacementScenario.id,
      scenarioLabel: replacementScenario.label,
      providerName: "simulated-fixture/single-absence",
      mode: "simulated",
      input: replacementScenario.input,
      basePlan: replacementScenario.basePlan,
      result: createReplacementOptions(
        replacementScenario.input,
        replacementScenario.basePlan,
        replacementRequest,
        replacementScenario.drafts,
      ),
      confirmedPlan: null,
      confirmedAt: null,
      confirmedById: null,
    };

    const persistence = new PrismaPlanningPersistence(prisma);
    await persistence.saveRun(weeklySnapshot, manager);
    const confirmed = await persistence.confirmRun(
      proposalId,
      weeklySnapshot.result.proposal.plan.assignments,
      manager,
      new Date("2026-11-04T12:00:00.000Z"),
    );
    if (!confirmed) throw new Error("Syntetický týdenní návrh se nepotvrdil.");

    await expect(
      persistence.saveRun(
        { ...weeklySnapshot, scenarioLabel: "Změněný scénář" },
        manager,
      ),
    ).rejects.toBeInstanceOf(PlanningPersistenceConflictError);
    await expect(
      persistence.saveReplacementRun(replacementSnapshot, manager),
    ).rejects.toBeInstanceOf(PlanningPersistenceConflictError);

    await expect(persistence.getRun(proposalId)).resolves.toEqual(
      confirmed.snapshot,
    );
    expect(
      await prisma.auditEvent.count({
        where: {
          entityType: "planning_run",
          entityId: proposalId,
          action: "planning.confirmed",
        },
      }),
    ).toBe(1);
  });
});
