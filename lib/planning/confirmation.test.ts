import { describe, expect, it } from "vitest";

import { createConfirmedPlan, evaluateConfirmation } from "./confirmation";
import { makeRunResult } from "../../tests/planning/fixtures";

describe("evaluateConfirmation", () => {
  it("povolí potvrzení jen u ready_for_review + complete", () => {
    const state = evaluateConfirmation(makeRunResult());

    expect(state.allowed).toBe(true);
    expect(state.blockers).toEqual([]);
    expect(state.alreadyConfirmed).toBe(false);
    expect(state.confirmedPlan).toBeNull();
  });

  it("blokuje neověřený výsledek a vysvětlí proč", () => {
    const state = evaluateConfirmation(
      makeRunResult({ status: "not_verified", completeness: "partial" }),
    );

    expect(state.allowed).toBe(false);
    expect(state.blockers.map((blocker) => blocker.code)).toEqual([
      "run_not_verified",
      "partial_blocked_by_oq23",
    ]);
  });

  it("blokuje výsledek vyžadující změny", () => {
    const state = evaluateConfirmation(
      makeRunResult({ status: "needs_changes", completeness: "complete" }),
    );

    expect(state.allowed).toBe(false);
    expect(state.blockers.map((blocker) => blocker.code)).toEqual([
      "run_needs_changes",
    ]);
  });

  it("částečný návrh zůstává blokovaný i při ready_for_review", () => {
    const state = evaluateConfirmation(
      makeRunResult({ status: "ready_for_review", completeness: "partial" }),
    );

    expect(state.allowed).toBe(false);
    expect(state.blockers).toHaveLength(1);
    expect(state.blockers[0]?.code).toBe("partial_blocked_by_oq23");
    expect(state.blockers[0]?.message).toContain("Podle rozhodnutí OQ23");
    expect(state.blockers[0]?.message).not.toContain("není rozhodnuté");
  });

  it("už potvrzený plán se znovu nepotvrzuje", () => {
    const confirmedPlan = createConfirmedPlan(makeRunResult(), 0);
    const state = evaluateConfirmation(makeRunResult(), confirmedPlan);

    expect(state.allowed).toBe(false);
    expect(state.alreadyConfirmed).toBe(true);
    expect(state.confirmedPlan).toBe(confirmedPlan);
  });
});

describe("createConfirmedPlan", () => {
  it("vzniká jen z výsledku a nese přiřazení i čas potvrzení", () => {
    const result = makeRunResult({
      id: "plan-42",
      assignments: [
        { employeeId: "e1", date: "2026-10-05", shiftKind: "morning" },
      ],
    });

    const confirmedPlan = createConfirmedPlan(
      result,
      1_793_000_000_000,
    );

    expect(confirmedPlan.proposalId).toBe("plan-42");
    expect(confirmedPlan.weekStart).toBe(result.weekStart);
    expect(confirmedPlan.assignments).toEqual(result.proposal.plan.assignments);
    expect(confirmedPlan.confirmedAt).toBe(
      new Date(1_793_000_000_000).toISOString(),
    );
  });
});
