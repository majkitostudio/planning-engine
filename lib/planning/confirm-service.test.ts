import { describe, expect, it } from "vitest";

import { confirmRun } from "./confirm-service";
import { executePlanningRun } from "./run-service";
import { PlanningRunRegistry } from "./run-registry";
import { SIMULATED_WEEK_START } from "./simulated/scenarios";

async function runScenario(
  scenarioId: "complete" | "partial" | "unverified",
  registry = new PlanningRunRegistry(),
) {
  const outcome = await executePlanningRun(
    { scenarioId, weekStart: SIMULATED_WEEK_START, mode: "simulated" },
    registry,
  );
  if (!outcome.ok) {
    throw new Error(`Scénář ${scenarioId} měl proběhnout: ${outcome.failure.message}`);
  }
  return { registry, view: outcome.view };
}

describe("confirmRun", () => {
  it("potvrdí kompletní návrh a vytvoří ConfirmedPlan", async () => {
    const { registry, view } = await runScenario("complete");
    const confirmedAt = Date.UTC(2026, 9, 26, 12, 0, 0);

    const result = confirmRun(registry, view.proposalId, confirmedAt);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alreadyConfirmed).toBe(false);
    expect(result.view.confirmation.alreadyConfirmed).toBe(true);
    expect(result.view.confirmation.confirmedPlan?.proposalId).toBe(
      view.proposalId,
    );
    expect(result.view.confirmation.confirmedPlan?.confirmedAt).toBe(
      new Date(confirmedAt).toISOString(),
    );
    expect(result.view.confirmationLabel).toBe("Potvrzeno");
    expect(result.view.proposal.assignments).toEqual(view.proposal.assignments);
  });

  it("opakované potvrzení je idempotentní a nemění čas", async () => {
    const { registry, view } = await runScenario("complete");
    const first = confirmRun(registry, view.proposalId, 1_000);
    if (!first.ok) throw new Error(first.message);

    const second = confirmRun(registry, view.proposalId, 2_000);

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.alreadyConfirmed).toBe(true);
    expect(second.view.confirmation.confirmedPlan).toEqual(
      first.view.confirmation.confirmedPlan,
    );
  });

  it("částečný návrh nepotvrdí a v registru zůstane nepotvrzený", async () => {
    const { registry, view } = await runScenario("partial");

    const result = confirmRun(registry, view.proposalId, 1_000);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("confirmation_blocked");
    expect(result.blockers.map((blocker) => blocker.code)).toContain(
      "partial_blocked_by_oq23",
    );
    expect(registry.get(view.proposalId)?.confirmedPlan).toBeNull();
  });

  it("neověřený návrh nepotvrdí", async () => {
    const { registry, view } = await runScenario("unverified");

    const result = confirmRun(registry, view.proposalId, 1_000);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.blockers.map((blocker) => blocker.code)).toEqual([
      "run_not_verified",
      "partial_blocked_by_oq23",
    ]);
  });

  it("neznámé proposal ID nepotvrdí", () => {
    const result = confirmRun(new PlanningRunRegistry(), "plan-neznamy", 1_000);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("unknown_proposal");
    expect(result.blockers).toEqual([]);
  });
});
