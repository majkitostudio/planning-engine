import { describe, expect, it } from "vitest";

import {
  CONFIRMED_PLANNING_RULES,
  CONFIRMED_SHIFT_DEFINITIONS,
  runPlanning,
  isPlanDraft,
} from "../index";
import type {
  PlanDraft,
  PlanningInput,
  ProposedAssignment,
  ShiftKind,
  Alternative,
  ExplanationTopic,
  PlanningOutcome,
} from "./types";
import type { PlanningModelProvider } from "../ai-provider";

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

function makeDraft(assignments: ProposedAssignment[]): PlanDraft {
  return {
    weekStart: WEEK_START,
    assignments,
    explanations: [],
    alternatives: [],
    assumptions: [],
  };
}

describe("runPlanning — dvouvrstvá validace PlanDraft", () => {
  describe("A. Strukturální kontrola isPlanDraft()", () => {
    it("přijme platný PlanDraft", () => {
      const validDraft: PlanDraft = {
        weekStart: WEEK_START,
        assignments: [
          { employeeId: "e1", date: WEEK_DATES[0], shiftKind: "morning" },
        ],
        explanations: [
          { topic: "assignment", text: "Some explanation" },
        ],
        alternatives: [
          {
            id: "alt1",
            summary: "Alternative summary",
            impact: "Some impact",
            assignments: [
              { employeeId: "e2", date: WEEK_DATES[1], shiftKind: "afternoon" },
            ],
          },
        ],
        assumptions: ["Assumption 1"],
      };
      expect(isPlanDraft(validDraft)).toBe(true);
    });

    it("odmítne neplatný týdenStart v PlanDraft", () => {
      const invalidDraft: PlanDraft = {
        weekStart: "invalid-date", // not ISO date
        assignments: [],
        explanations: [],
        alternatives: [],
        assumptions: [],
      };
      expect(isPlanDraft(invalidDraft)).toBe(false);
    });

    it("odmítne neplatný ExplanationTopic", () => {
      const invalidDraft: PlanDraft = {
        weekStart: WEEK_START,
        assignments: [],
        explanations: [
          { topic: "invalid_topic" as ExplanationTopic, text: "Some explanation" }, // invalid topic
        ],
        alternatives: [],
        assumptions: [],
      };
      expect(isPlanDraft(invalidDraft)).toBe(false);
    });

    it("odmítne nekompletní alternativy", () => {
      const invalidDraft: PlanDraft = {
        weekStart: WEEK_START,
        assignments: [],
        explanations: [],
        alternatives: [
          {
            id: "alt1",
            // chybí summary
            impact: "Some impact",
            assignments: [],
          } as unknown as Alternative,
        ],
        assumptions: [],
      };
      expect(isPlanDraft(invalidDraft)).toBe(false);
    });

    it("odmítne alternativu s prázdným identifikátorem", () => {
      const draft: PlanDraft = {
        weekStart: WEEK_START,
        assignments: [],
        explanations: [],
        alternatives: [{ id: "", summary: "Alternativa", impact: "Dopad", assignments: [] }],
        assumptions: [],
      };
      expect(isPlanDraft(draft)).toBe(false);
    });

    it("odmítne nekompletní přiřazení", () => {
      const invalidDraft: PlanDraft = {
        weekStart: WEEK_START,
        assignments: [
          {
            employeeId: "", // empty string
            date: WEEK_DATES[0],
            shiftKind: "morning",
          },
        ],
        explanations: [],
        alternatives: [],
        assumptions: [],
      };
      expect(isPlanDraft(invalidDraft)).toBe(false);
    });

    it("odmítne neplatný formát date v přiřazení", () => {
      const invalidDraft: PlanDraft = {
        weekStart: WEEK_START,
        assignments: [
          {
            employeeId: "e1",
            date: "invalid-date", // not ISO date
            shiftKind: "morning",
          },
        ],
        explanations: [],
        alternatives: [],
        assumptions: [],
      };
      expect(isPlanDraft(invalidDraft)).toBe(false);
    });
  });

  describe("B. Sémantická kontrola v orchestrátoru", () => {
    it("přijme návrh se známým zaměstnancem, známou směnou a datem v týdnu", async () => {
      const input = makeInput({
        employees: [{ id: EMPLOYEE_1, displayName: "Test", employmentType: "full_time" as const }],
        shiftDefinitions: CONFIRMED_SHIFT_DEFINITIONS,
      });
      const provider = new FakeProvider(() => makeDraft([
        { employeeId: EMPLOYEE_1, date: WEEK_DATES[0], shiftKind: "morning" },
      ]));

      const outcome = await runPlanning(input, provider);
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      expect(outcome.result.status).toBe("ready_for_review");
      expect(outcome.result.validation.status).toBe("valid");
    });

    it("odmítne návrh s neznámým zaměstnancem", async () => {
      const input = makeInput();
      const provider = new FakeProvider(() => makeDraft([
        { employeeId: "unknown_employee", date: WEEK_DATES[0], shiftKind: "morning" },
      ]));

      const outcome = await runPlanning(input, provider);
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      expect(outcome.result.status).toBe("needs_changes");
      expect(outcome.result.validation.status).toBe("invalid");
      expect(outcome.result.validation.problems.some(p => p.code === "ASSIGNMENT_UNKNOWN_EMPLOYEE")).toBe(true);
    });

    it("odmítne návrh s neznámou směnou", async () => {
      const input = makeInput();
      const provider = new FakeProvider(() => makeDraft([
        { employeeId: EMPLOYEE_1, date: WEEK_DATES[0], shiftKind: "night" as ShiftKind },
      ]));

      const outcome = await runPlanning(input, provider);
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      expect(outcome.result.status).toBe("needs_changes");
      expect(outcome.result.validation.status).toBe("invalid");
      expect(outcome.result.validation.problems.some(p => p.code === "ASSIGNMENT_UNKNOWN_SHIFT")).toBe(true);
    });

    it("odmítne návrh s datem mimo plánovaný týden", async () => {
      const input = makeInput();
      const provider = new FakeProvider(() => makeDraft([
        { employeeId: EMPLOYEE_1, date: "2026-06-15", shiftKind: "morning" }, // outside week
      ]));

      const outcome = await runPlanning(input, provider);
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      expect(outcome.result.status).toBe("needs_changes");
      expect(outcome.result.validation.status).toBe("invalid");
      expect(outcome.result.validation.problems.some(p => p.code === "ASSIGNMENT_OUTSIDE_WEEK")).toBe(true);
    });

    it("odmítne návrh s weekStartem, který se neshoduje s inputem", async () => {
      const input = makeInput();
      const provider = new FakeProvider(() => ({
        weekStart: "2026-06-08", // different week start
        assignments: [{ employeeId: EMPLOYEE_1, date: "2026-06-08", shiftKind: "morning" }],
        explanations: [],
        alternatives: [],
        assumptions: [],
      }));

      const outcome = await runPlanning(input, provider);
      expect(outcome.ok).toBe(false); // ai_invalid_output
      if (!outcome.ok) return;
      expect((outcome as unknown as Extract<PlanningOutcome, { ok: false }>).failure.code).toBe("ai_invalid_output");
    });

    it("přijme platný návrh s alternativami", async () => {
      const input = makeInput();
      const provider = new FakeProvider(() => ({
        weekStart: WEEK_START,
        assignments: [
          { employeeId: EMPLOYEE_1, date: WEEK_DATES[0], shiftKind: "morning" },
        ],
        explanations: [],
        alternatives: [
          {
            id: "alt1",
            summary: "Alternative summary",
            impact: "Some impact",
            assignments: [
              { employeeId: EMPLOYEE_2, date: WEEK_DATES[1], shiftKind: "afternoon" },
            ],
          },
        ],
        assumptions: [],
      }));

      const outcome = await runPlanning(input, provider);
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      expect(outcome.result.status).toBe("ready_for_review");
      expect(outcome.result.validation.status).toBe("valid");
      expect(outcome.result.proposal.plan.alternatives).toHaveLength(1);
    });
  });
});
