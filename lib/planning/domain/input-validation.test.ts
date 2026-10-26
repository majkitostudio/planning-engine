import { describe, expect, it } from "vitest";

import {
  CONFIRMED_PLANNING_RULES,
  CONFIRMED_SHIFT_DEFINITIONS,
  runPlanning,
} from "../index";
import type { PlanningModelProvider } from "../index";
import type {
  PlanDraft,
  PlanningInput,
  ProposedAssignment,
  ShiftKind,
  Employee,
  EmploymentType,
  PlanningOutcome,
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

function makeEmployee(id: string, overrides: Partial<Employee> = {}) {
  return {
    id,
    displayName: `Synteticky ${id}`, 
    employmentType: "full_time" as const,
    ...overrides,
  };
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

describe("runPlanning — input validation před voláním AI", () => {
  it("odmítne týdenStart, který není pondělí", async () => {
    const input = makeInput({ weekStart: "2026-06-02" }); // neděle
    const provider = new FakeProvider(() => makeDraft([]));

    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) return;
    expect((outcome as unknown as Extract<PlanningOutcome, { ok: false }>).failure.code).toBe("invalid_input");
    expect((outcome as unknown as Extract<PlanningOutcome, { ok: false }>).failure.message).toContain("týdenStart");
  });

  it("odmítne neplatný formát časové zóny", async () => {
    const input = makeInput({ timeZone: "Invalid/TimeZone" });
    const provider = new FakeProvider(() => makeDraft([]));

    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) return;
    expect((outcome as unknown as Extract<PlanningOutcome, { ok: false }>).failure.code).toBe("invalid_input");
    expect((outcome as unknown as Extract<PlanningOutcome, { ok: false }>).failure.message).toContain("časová zóna");
  });

  it("odmítne zaměstnance s chybějícím id", async () => {
    const input = makeInput({
      employees: [
        { id: "", displayName: "Test", employmentType: "full_time" },
        { id: "e2", displayName: "Test2", employmentType: "full_time" },
      ],
    });
    const provider = new FakeProvider(() => makeDraft([]));

    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) return;
    expect((outcome as unknown as Extract<PlanningOutcome, { ok: false }>).failure.code).toBe("invalid_input");
    expect((outcome as unknown as Extract<PlanningOutcome, { ok: false }>).failure.message).toContain("zaměstnanec");
  });

  it("odmítne zaměstnance s nepodporovaným typem úvazku", async () => {
    const input = makeInput({
      employees: [
        { id: "e1", displayName: "Test", employmentType: "full_time" as const },
        { id: "e2", displayName: "Test2", employmentType: "part_time" as EmploymentType }, // unsupported
      ],
    });
    const provider = new FakeProvider(() => makeDraft([]));

    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) return;
    expect((outcome as unknown as Extract<PlanningOutcome, { ok: false }>).failure.code).toBe("invalid_input");
  });

  it("odmítne chybějící definici směny", async () => {
    const input = makeInput({
      shiftDefinitions: [
        { kind: "morning", weekday: { start: "07:00", end: "16:00" }, weekend: { start: "07:00", end: "16:00" } },
        // chybí afternoon definice
      ],
    });
    const provider = new FakeProvider(() => makeDraft([]));

    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) return;
    expect((outcome as unknown as Extract<PlanningOutcome, { ok: false }>).failure.code).toBe("invalid_input");
  });

  it("odmítne duplicitní požadavek na obsazení", async () => {
    const input = makeInput({
      staffingRequirements: [
        { date: "2026-06-01", shiftKind: "morning", requiredEmployees: 1 },
        { date: "2026-06-01", shiftKind: "morning", requiredEmployees: 2 }, // duplicate
      ],
    });
    const provider = new FakeProvider(() => makeDraft([]));

    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) return;
    expect((outcome as unknown as Extract<PlanningOutcome, { ok: false }>).failure.code).toBe("invalid_input");
  });

  it("odmítne nepřítomnost, která neodkazuje na existujícího zaměstnance", async () => {
    const input = makeInput({
      absences: [
        { id: "a1", employeeId: "unknown", from: "2026-06-01", to: "2026-06-01", type: "vacation", status: "approved" },
      ],
    });
    const provider = new FakeProvider(() => makeDraft([]));

    const outcome = await runPlanning(input, provider);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) return;
    expect((outcome as unknown as Extract<PlanningOutcome, { ok: false }>).failure.code).toBe("invalid_input");
  });

  it("odmítne neexistující směnu", async () => {
    const input = makeInput({
      shiftDefinitions: [
        { kind: "morning", weekday: { start: "07:00", end: "16:00" }, weekend: { start: "07:00", end: "16:00" } },
        { kind: "afternoon", weekday: { start: "13:00", end: "21:00" }, weekend: { start: "12:00", end: "21:00" } },
      ],
    });
    const provider = new FakeProvider(() => makeDraft([
      { employeeId: "e1", date: "2026-06-01", shiftKind: "night" as ShiftKind }, // unknown shift
    ]));

    const outcome = await runPlanning(input, provider);
    // isPlanDraft akceptuje libovolný string shiftKind; neplatná hodnota
    // ("night") je označena během semantické validace, ne strukturní kontrolou
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.status).toBe("needs_changes");
    expect(outcome.result.validation.status).toBe("invalid");
    expect(outcome.result.validation.problems.some(p => p.code === "ASSIGNMENT_UNKNOWN_SHIFT")).toBe(true);
  });

  it("odmítne date mimo plánovaný týden", async () => {
    const input = makeInput();
    const provider = new FakeProvider(() => makeDraft([
      { employeeId: "e1", date: "2026-06-08", shiftKind: "morning" }, // beyond week
    ]));

    const outcome = await runPlanning(input, provider);
    // Výstup AI je nyní neplatný, protože date je mimo týden
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.status).toBe("needs_changes");
    expect(outcome.result.validation.status).toBe("invalid");
    expect(outcome.result.validation.problems.some(p => p.code === "ASSIGNMENT_OUTSIDE_WEEK")).toBe(true);
  });
});