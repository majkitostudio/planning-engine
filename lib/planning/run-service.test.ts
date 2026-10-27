import { afterEach, describe, expect, it, vi } from "vitest";

import { executePlanningRun } from "./run-service";
import { PlanningRunRegistry } from "./run-registry";
import { SIMULATED_WEEK_START } from "./simulated/scenarios";

describe("executePlanningRun", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("spustí kompletní fixture a uloží běh do registru", async () => {
    const registry = new PlanningRunRegistry();

    const outcome = await executePlanningRun(
      {
        scenarioId: "complete",
        weekStart: SIMULATED_WEEK_START,
        mode: "simulated",
      },
      registry,
    );

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.view.status).toBe("ready_for_review");
    expect(outcome.view.completeness).toBe("complete");
    expect(outcome.view.confirmation.allowed).toBe(true);
    expect(outcome.view.employees).toHaveLength(6);
    expect(outcome.view.mode).toBe("simulated");
    expect(registry.size).toBe(1);
    expect(registry.get(outcome.view.proposalId)?.result.confirmed).toBe(false);
  });

  it("částečný fixture zůstane blokovaný k potvrzení", async () => {
    const outcome = await executePlanningRun(
      {
        scenarioId: "partial",
        weekStart: SIMULATED_WEEK_START,
        mode: "simulated",
      },
      new PlanningRunRegistry(),
    );

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.view.status).toBe("needs_changes");
    expect(outcome.view.completeness).toBe("partial");
    expect(outcome.view.confirmation.allowed).toBe(false);
    expect(
      outcome.view.confirmation.blockers.map((blocker) => blocker.code),
    ).toContain("partial_blocked_by_oq23");
  });

  it("odmítne jiný týden, než pro který má fixture", async () => {
    const registry = new PlanningRunRegistry();

    const outcome = await executePlanningRun(
      {
        scenarioId: "complete",
        weekStart: "2026-10-12",
        mode: "simulated",
      },
      registry,
    );

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.failure.code).toBe("invalid_input");
    expect(outcome.failure.details).toEqual({
      scenarioWeekStart: SIMULATED_WEEK_START,
      requestedWeekStart: "2026-10-12",
    });
    expect(registry.size).toBe(0);
  });

  it("odmítne neznámý scénář", async () => {
    const registry = new PlanningRunRegistry();

    const outcome = await executePlanningRun(
      {
        scenarioId: "neexistuje" as never,
        weekStart: SIMULATED_WEEK_START,
        mode: "simulated",
      },
      registry,
    );

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.failure.code).toBe("invalid_input");
    expect(registry.size).toBe(0);
  });

  it("v gemini režimu bez klíče selže poctivě, ne fallbackem na simulaci", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const registry = new PlanningRunRegistry();

    const outcome = await executePlanningRun(
      {
        scenarioId: "complete",
        weekStart: SIMULATED_WEEK_START,
        mode: "gemini",
      },
      registry,
    );

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.failure.code).toBe("ai_not_configured");
    expect(registry.size).toBe(0);
  });
});
