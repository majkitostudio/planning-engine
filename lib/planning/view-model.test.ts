import { describe, expect, it } from "vitest";

import { createConfirmedPlan } from "./confirmation";
import {
  summarizeChanges,
  summarizeCoverage,
  toPlanningFailureView,
  toPlanningRunView,
} from "./view-model";
import { makeRunResult } from "../../tests/planning/fixtures";

const CONTEXT = {
  scenarioId: "complete",
  scenarioLabel: "Kompletní návrh",
  providerName: "simulated-fixture/complete",
  mode: "simulated" as const,
  employees: [{ id: "e1", displayName: "Anna Nováková" }],
};

describe("toPlanningRunView", () => {
  it("připravený návrh zůstává ke kontrole, ne schválený", () => {
    const view = toPlanningRunView(makeRunResult(), CONTEXT);

    expect(view.status).toBe("ready_for_review");
    expect(view.statusLabel).toBe("Připraveno ke kontrole");
    expect(view.statusTone).toBe("info");
    expect(view.completenessLabel).toBe("Úplný návrh");
    expect(view.confirmation.allowed).toBe(true);
    expect(view.confirmationLabel).toBe("Připraveno k potvrzení");
    expect(view.scenarioLabel).toBe("Kompletní návrh");
    expect(view.employees).toEqual(CONTEXT.employees);
  });

  it("výsledek vyžadující změny je blokovaný a částečný", () => {
    const view = toPlanningRunView(
      makeRunResult({ status: "needs_changes", completeness: "partial" }),
      CONTEXT,
    );

    expect(view.statusLabel).toBe("Vyžaduje změny");
    expect(view.statusTone).toBe("danger");
    expect(view.completenessLabel).toBe("Částečný návrh");
    expect(view.completenessTone).toBe("warning");
    expect(view.confirmation.allowed).toBe(false);
    expect(view.confirmationLabel).toBe("Potvrzení blokováno");
  });

  it("neověřený výsledek se nikdy netváří jako úspěch", () => {
    const view = toPlanningRunView(
      makeRunResult({ status: "not_verified", completeness: "partial" }),
      CONTEXT,
    );

    expect(view.statusLabel).toBe("Nepodařilo se ověřit");
    expect(view.statusTone).toBe("warning");
    expect(view.confirmation.allowed).toBe(false);
    expect(
      view.confirmation.blockers.map((blocker) => blocker.code),
    ).toContain("run_not_verified");
  });

  it("po potvrzení nese potvrzený plán, ale návrh zůstává původní", () => {
    const result = makeRunResult({ id: "plan-7" });
    const confirmedPlan = createConfirmedPlan(result, 0);
    const view = toPlanningRunView(result, {
      ...CONTEXT,
      confirmedPlan,
    });

    expect(view.proposalId).toBe("plan-7");
    expect(view.confirmation.alreadyConfirmed).toBe(true);
    expect(view.confirmation.confirmedPlan).toBe(confirmedPlan);
    expect(view.confirmationLabel).toBe("Potvrzeno");
    expect(view.proposal.assignments).toEqual(
      result.proposal.plan.assignments,
    );
  });
});

describe("summarizeCoverage", () => {
  it("sčítá požadavky, obsazení i chybějící místa", () => {
    const summary = summarizeCoverage([
      {
        date: "2026-10-05",
        shiftKind: "morning",
        requiredEmployees: 2,
        assignedEmployees: 1,
        missingEmployees: 1,
      },
      {
        date: "2026-10-05",
        shiftKind: "afternoon",
        requiredEmployees: 2,
        assignedEmployees: 3,
        missingEmployees: 0,
      },
    ]);

    expect(summary).toEqual({
      required: 4,
      assigned: 4,
      missing: 1,
      understaffedSlots: 1,
      overstaffedSlots: 1,
    });
  });

  it("prázdné pokrytí je nula, ne odvozený úspěch", () => {
    expect(summarizeCoverage([])).toEqual({
      required: 0,
      assigned: 0,
      missing: 0,
      understaffedSlots: 0,
      overstaffedSlots: 0,
    });
  });
});

describe("summarizeChanges", () => {
  it("počítá přidané, odebrané a nezměněné směny", () => {
    const assignment = {
      employeeId: "e1",
      date: "2026-10-05" as const,
      shiftKind: "morning" as const,
    };
    const summary = summarizeChanges([
      { type: "added", assignment },
      { type: "removed", assignment },
      { type: "unchanged", assignment },
      { type: "unchanged", assignment },
    ]);

    expect(summary).toEqual({ added: 1, removed: 1, unchanged: 2 });
  });
});

describe("toPlanningFailureView", () => {
  it.each([
    ["invalid_input", "Vstup plánování je neplatný"],
    ["ai_not_configured", "AI není nakonfigurovaná"],
    ["ai_failed", "Volání AI selhalo"],
    ["ai_invalid_output", "AI vrátila neplatný návrh"],
    ["validation_failed", "Validaci nešlo provést"],
  ] as const)("selhání %s má srozumitelný titulek", (code, title) => {
    const view = toPlanningFailureView({ code, message: "Detail selhání." });

    expect(view.code).toBe(code);
    expect(view.title).toBe(title);
    expect(view.message).toBe("Detail selhání.");
    expect(view.details).toBeUndefined();
  });

  it("předává technické detaily, pokud existují", () => {
    const view = toPlanningFailureView({
      code: "ai_failed",
      message: "Selhalo.",
      details: { timeoutMs: 30_000 },
    });

    expect(view.details).toEqual({ timeoutMs: 30_000 });
  });
});
