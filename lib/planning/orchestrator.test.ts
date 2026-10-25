import { describe, expect, it } from "vitest";

import {
  CONFIRMED_PLANNING_RULES,
  CONFIRMED_SHIFT_DEFINITIONS,
  runPlanning,
} from "./index";
import { AiProviderError } from "./ai-provider";
import type { PlanningModelProvider } from "./ai-provider";
import type {
  PlanDraft,
  PlanningInput,
  ProposedAssignment,
  ShiftKind,
} from "./domain";

const WEEK_START = "2026-06-01";
const WEEK_DATES = [
  "2026-06-01",
  "2026-06-02",
  "2026-06-03",
  "2026-06-04",
  "2026-06-05",
  "2026-06-06",
  "2026-06-07",
] as const;
const SHIFT_KINDS: readonly ShiftKind[] = ["morning", "afternoon"];
const EMPLOYEE_1 = "e1";
const EMPLOYEE_2 = "e2";

class FakeProvider implements PlanningModelProvider {
  readonly name = "fake";
  constructor(
    private readonly fn: (
      input: PlanningInput,
      signal?: AbortSignal,
    ) => Promise<PlanDraft> | PlanDraft,
  ) {}
  async generatePlan(input: PlanningInput, options?: { signal?: AbortSignal }) {
    return this.fn(input, options?.signal);
  }
}

function makeEmployee(id: string) {
  return { id, displayName: `Synteticky ${id}`, employmentType: "full_time" as const };
}

function makeRequirements(overrides: Record<string, number> = {}) {
  return WEEK_DATES.flatMap((date) =>
    SHIFT_KINDS.map((shiftKind) => ({
      date,
      shiftKind,
      requiredEmployees: overrides[`${date}|${shiftKind}`] ?? 0,
    })),
  );
}

function makeInput(overrides: Partial<PlanningInput> = {}): PlanningInput {
  return {
    weekStart: WEEK_START,
    timeZone: "Europe/Prague",
    employees: [makeEmployee(EMPLOYEE_1), makeEmployee(EMPLOYEE_2)],
    shiftDefinitions: CONFIRMED_SHIFT_DEFINITIONS,
    staffingRequirements: makeRequirements(),
    absences: [],
    requests: [],
    existingAssignments: [],
    rules: CONFIRMED_PLANNING_RULES,
    history: { assignments: [], complete: true },
    ...overrides,
  };
}

function makeAssignment(employeeId: string, date: string, shiftKind: ShiftKind): ProposedAssignment {
  return { employeeId, date, shiftKind };
}

function makeDraft(assignments: ProposedAssignment[]): PlanDraft {
  return {
    weekStart: WEEK_START,
    assignments,
    explanations: [],
    alternatives: [],
    assumptions: [],
  };
}

describe("runPlanning — úspěšný tok", () => {
  it("vrátí ready_for_review pro platný návrh", async () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({ [`${WEEK_DATES[0]}|morning`]: 1 }),
    });
    const provider = new FakeProvider(() =>
      makeDraft([makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning")]),
    );

    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.status).toBe("ready_for_review");
    expect(outcome.result.validation.status).toBe("valid");
    expect(outcome.result.confirmed).toBe(false);
    expect(outcome.result.coverage[0]).toMatchObject({
      requiredEmployees: 1,
      assignedEmployees: 1,
      missingEmployees: 0,
    });
    expect(outcome.result.changes).toHaveLength(1);
    expect(outcome.result.changes[0]?.type).toBe("added");
  });

  it("označí návrh porušující pravidla jako needs_changes", async () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[0]}|morning`]: 1,
        [`${WEEK_DATES[0]}|afternoon`]: 1,
      }),
    });
    const provider = new FakeProvider(() =>
      makeDraft([
        makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning"),
        makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "afternoon"),
      ]),
    );

    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.status).toBe("needs_changes");
    expect(outcome.result.validation.status).toBe("invalid");
    expect(
      outcome.result.validation.problems.some((p) => p.code === "SHIFT_OVERLAP"),
    ).toBe(true);
  });

  it("označí chybějící obsazení jako needs_changes", async () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({ [`${WEEK_DATES[0]}|morning`]: 2 }),
    });
    const provider = new FakeProvider(() =>
      makeDraft([makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning")]),
    );

    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.status).toBe("needs_changes");
    expect(
      outcome.result.validation.problems.some((p) => p.code === "COVERAGE_UNDERSTAFFED"),
    ).toBe(true);
  });

  it("označí návrh, který nelze bezpečně ověřit, jako not_verified", async () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({ [`${WEEK_DATES[0]}|morning`]: 1 }),
      history: undefined,
    });
    const provider = new FakeProvider(() =>
      makeDraft([makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning")]),
    );

    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.status).toBe("not_verified");
    expect(outcome.result.validation.status).toBe("not_verified");
    expect(outcome.result.completeness).toBe("partial");
  });

  it("počítá změny oproti existujícím směnám", async () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({ [`${WEEK_DATES[0]}|morning`]: 1 }),
      existingAssignments: [
        { employeeId: EMPLOYEE_2, date: WEEK_DATES[0], shiftKind: "morning" },
      ],
    });
    const provider = new FakeProvider(() =>
      makeDraft([makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning")]),
    );

    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const types = outcome.result.changes.map((c) => c.type).sort();
    expect(types).toEqual(["added", "removed"]);
  });
});

describe("runPlanning — chyby", () => {
  it("vrátí invalid_input pro chybějící vstup", async () => {
    const provider = new FakeProvider(() => makeDraft([]));
    const outcome = await runPlanning(null as unknown as PlanningInput, provider);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.failure.code).toBe("invalid_input");
  });

  it("vrátí ai_invalid_output pro neúplnou odpověď AI", async () => {
    const input = makeInput();
    const provider = new FakeProvider(() => ({ weekStart: WEEK_START } as unknown as PlanDraft));
    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.failure.code).toBe("ai_invalid_output");
  });

  it("vrátí ai_failed pro chybu poskytovatele", async () => {
    const input = makeInput();
    const provider = new FakeProvider(() => {
      throw new AiProviderError("failed", "síťová chyba");
    });
    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.failure.code).toBe("ai_failed");
  });

  it("vrátí ai_not_configured pro nenakonfigurovaný provider", async () => {
    const input = makeInput();
    const provider = new FakeProvider(() => {
      throw new AiProviderError("not_configured", "chybí klíč");
    });
    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.failure.code).toBe("ai_not_configured");
  });

  it("vrátí ai_failed (timeout) při vypršení limitu", async () => {
    const input = makeInput();
    const provider = new FakeProvider((_input, signal) => {
      return new Promise<PlanDraft>((_resolve, reject) => {
        signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });
    const outcome = await runPlanning(input, provider, { timeoutMs: 10 });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.failure.code).toBe("ai_failed");
    expect(outcome.failure.details).toMatchObject({ timedOut: true });
  });

  it("vrátí ai_invalid_output při neplatném JSON z provideru", async () => {
    const input = makeInput();
    const provider = new FakeProvider(() => {
      throw new AiProviderError("invalid_output", "neplatný JSON");
    });
    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.failure.code).toBe("ai_invalid_output");
  });
});

describe("runPlanning — deterministická validace je vždy použita", () => {
  it("výsledek obsahuje checkedRuleIds a assumptions z validatePlan", async () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({ [`${WEEK_DATES[0]}|morning`]: 1 }),
    });
    const provider = new FakeProvider(() =>
      makeDraft([makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning")]),
    );
    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.validation.checkedRuleIds.length).toBeGreaterThan(0);
    expect(outcome.result.validation.assumptions.length).toBeGreaterThan(0);
  });
});
