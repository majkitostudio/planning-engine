import { describe, expect, it } from "vitest";

import { confirmRun } from "./confirm-service";
import { confirmPersistedReplacementRun } from "./confirm-service";
import { executePlanningRun } from "./run-service";
import { PlanningRunRegistry } from "./run-registry";
import { SIMULATED_WEEK_START } from "./simulated/scenarios";
import { getSimulatedReplacementScenario } from "./simulated/replacement-scenarios";
import { createReplacementOptions } from "./replacement-service";
import {
  InMemoryPlanningPersistence,
  type ReplacementRunSnapshot,
} from "./persistence";
import { toPlanningActor } from "../auth/actor";

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

const replacementActor = toPlanningActor({
  user: {
    id: "replacement-manager",
    email: "manager@aaauto.cz",
    name: "Manažer",
    role: "manager",
  },
});
if (!replacementActor) throw new Error("Replacement actor se nepodařilo vytvořit.");

function makeReplacementSnapshot(
  overrides: {
    drafts?: number;
    incompleteHistory?: boolean;
    staleBase?: boolean;
    tamperSelectedOption?: boolean;
    candidateOnVacation?: boolean;
  } = {},
): ReplacementRunSnapshot {
  const scenario = getSimulatedReplacementScenario("single-absence");
  if (!scenario) throw new Error("Replacement scenario se nepodařilo načíst.");
  const runRequest = {
    ...scenario.request,
    id: "replacement-confirmation-test",
  };
  const input = {
    ...scenario.input,
    ...(overrides.incompleteHistory
      ? { history: { assignments: [], complete: false } }
      : {}),
    ...(overrides.candidateOnVacation
      ? {
          absences: [
            {
              id: "synthetic-vacation",
              employeeId: "e8",
              from: scenario.request.incident.date,
              to: scenario.request.incident.date,
              type: "vacation" as const,
              status: "approved" as const,
            },
          ],
        }
      : {}),
  };
  const result = createReplacementOptions(
    input,
    scenario.basePlan,
    runRequest,
    scenario.drafts.slice(0, overrides.drafts ?? scenario.drafts.length),
  );

  const request = overrides.staleBase
    ? { ...runRequest, baseProposalId: "stale-base" }
    : runRequest;
  const tamperedResult = overrides.staleBase || overrides.tamperSelectedOption
    ? {
        ...result,
        request,
        ...(overrides.tamperSelectedOption
          ? {
              options: result.options.map((option, index) =>
                index === 0
                  ? {
                      ...option,
                      draft: {
                        ...option.draft,
                        assignments: [
                          {
                            employeeId: "unknown",
                            date: scenario.request.incident.date,
                            shiftKind: "afternoon" as const,
                          },
                        ],
                      },
                    }
                  : option,
              ),
            }
          : {}),
      }
    : result;

  return {
    replacementId: request.id,
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    providerName: "simulated-fixture/single-absence",
    mode: "simulated",
    input,
    basePlan: scenario.basePlan,
    result: tamperedResult,
    confirmedPlan: null,
    confirmedAt: null,
    confirmedById: null,
  };
}

describe("confirmPersistedReplacementRun", () => {
  it("potvrdí validní úplnou variantu a opakování je idempotentní", async () => {
    const persistence = new InMemoryPlanningPersistence();
    const snapshot = makeReplacementSnapshot();
    const option = snapshot.result.options[0]!;
    await persistence.saveReplacementRun(snapshot, replacementActor);

    const first = await confirmPersistedReplacementRun(
      persistence,
      snapshot.replacementId,
      option.id,
      replacementActor,
      Date.UTC(2026, 9, 29, 8),
    );
    const second = await confirmPersistedReplacementRun(
      persistence,
      snapshot.replacementId,
      option.id,
      replacementActor,
      Date.UTC(2026, 9, 29, 9),
    );

    expect(first).toMatchObject({ ok: true, alreadyConfirmed: false });
    expect(second).toMatchObject({ ok: true, alreadyConfirmed: true });
  });

  it("vyžaduje výslovné přijetí změny dovolené a zapíše ji do auditu", async () => {
    const persistence = new InMemoryPlanningPersistence();
    const snapshot = makeReplacementSnapshot({ candidateOnVacation: true });
    const option = snapshot.result.options[0]!;
    await persistence.saveReplacementRun(snapshot, replacementActor);

    const withoutAcceptance = await confirmPersistedReplacementRun(
      persistence,
      snapshot.replacementId,
      option.id,
      replacementActor,
    );
    expect(withoutAcceptance).toMatchObject({
      ok: false,
      blockers: expect.arrayContaining([
        expect.objectContaining({ code: "replacement_time_off_acceptance_required" }),
      ]),
    });

    const accepted = await confirmPersistedReplacementRun(
      persistence,
      snapshot.replacementId,
      option.id,
      replacementActor,
      Date.UTC(2026, 9, 29, 8),
      ["e8|2026-10-06"],
    );

    expect(accepted).toMatchObject({ ok: true, alreadyConfirmed: false });
    expect(persistence.getAuditEvents()[0]?.details.acceptedTimeOffChangeIds).toBe(
      '["e8|2026-10-06"]',
    );
    expect(accepted.ok && accepted.snapshot.result.options[0]?.impact.timeOffChanges).toEqual([
      {
        employeeId: "e8",
        kind: "approved_vacation",
        originalDate: "2026-10-06",
        newDate: null,
        verified: false,
      },
    ]);
  });

  it.each([
    ["neplatnou variantu", {}, "replacement_needs_changes"],
    ["neověřenou variantu", { incompleteHistory: true }, "replacement_not_verified"],
    ["neúplný běh", { drafts: 1 }, "replacement_partial_blocked"],
    ["zastaralý základ", { staleBase: true }, "replacement_base_stale"],
    ["změněný snapshot", { tamperSelectedOption: true }, "replacement_revalidation_failed"],
  ] as const)("zablokuje %s", async (_label, overrides, expectedCode) => {
    const persistence = new InMemoryPlanningPersistence();
    const snapshot = makeReplacementSnapshot(overrides);
    const option = snapshot.result.options[
      expectedCode === "replacement_needs_changes" ? 2 : 0
    ];
    if (!option) throw new Error("Test snapshot nemá vybranou variantu.");
    await persistence.saveReplacementRun(snapshot, replacementActor);

    const result = await confirmPersistedReplacementRun(
      persistence,
      snapshot.replacementId,
      option.id,
      replacementActor,
    );

    expect(result).toMatchObject({
      ok: false,
      code: "replacement_confirmation_blocked",
      blockers: expect.arrayContaining([expect.objectContaining({ code: expectedCode })]),
    });
    expect((await persistence.getReplacementRun(snapshot.replacementId))?.confirmedPlan).toBeNull();
  });
});
