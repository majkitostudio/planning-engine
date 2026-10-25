import { describe, expect, it } from "vitest";

import {
  CONFIRMED_PLANNING_RULES,
  CONFIRMED_SHIFT_DEFINITIONS,
  runPlanning,
  type PlanningModelProvider,
} from "../index";
import type {
  PlanDraft,
  PlanningInput,
  ProposedAssignment,
  ShiftKind,
} from "./types";

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

describe("runPlanning — duplicitní přiřazení nezvyšuje pokrytí ani změny", () => {
  it("duplicitní přiřazení nezvyšuje assignedEmployees v pokrytí", async () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[0]}|morning`]: 1,
      }),
    });
    const provider = new FakeProvider(() => makeDraft([
      makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning"),
      makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning"), // duplicate
    ]));

    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    
    const coverageLine = outcome.result.coverage[0];
    expect(coverageLine.assignedEmployees).toBe(1); // neměl by se zvýšit na 2
    expect(coverageLine.requiredEmployees).toBe(1);
    expect(coverageLine.missingEmployees).toBe(0);
  });

  it("duplicitní přiřazení není v changes.added dvakrát", async () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[0]}|morning`]: 1,
      }),
    });
    const provider = new FakeProvider(() => makeDraft([
      makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning"),
      makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning"), // duplicate
    ]));

    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    
    const addedChanges = outcome.result.changes.filter(c => c.type === "added");
    expect(addedChanges).toHaveLength(1); // neměl by existovat dvakrát
    expect(addedChanges[0].assignment.employeeId).toBe(EMPLOYEE_1);
  });

  it("duplicitní přiřazení zůstává ve výsledku validace jako chyba", async () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[0]}|morning`]: 1,
      }),
    });
    const provider = new FakeProvider(() => makeDraft([
      makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning"),
      makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning"), // duplicate
    ]));

    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    
    // Validace by měla detekovat duplicitní přiřazení jako chybu
    expect(outcome.result.validation.status).toBe("invalid");
    const duplicateErrors = outcome.result.validation.problems.filter(
      p => p.code === "ASSIGNMENT_DUPLICATE"
    );
    expect(duplicateErrors).toHaveLength(1);
    expect(duplicateErrors[0].employeeId).toBe(EMPLOYEE_1);
  });

  it("více duplicitních přiřazení není v pokrytí ani změnách započítáno", async () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[0]}|morning`]: 2,
      }),
    });
    const provider = new FakeProvider(() => makeDraft([
      makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning"),
      makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning"), // duplicate 1
      makeAssignment(EMPLOYEE_2, WEEK_DATES[0], "morning"),
      makeAssignment(EMPLOYEE_2, WEEK_DATES[0], "morning"), // duplicate 2
    ]));

    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    
    const coverageLine = outcome.result.coverage[0];
    expect(coverageLine.assignedEmployees).toBe(2); // neměl by se zvýšit na 4
    expect(coverageLine.requiredEmployees).toBe(2);
    
    const addedChanges = outcome.result.changes.filter(c => c.type === "added");
    expect(addedChanges).toHaveLength(2); // měl by existovat pouze 2 unique změny
  });
});