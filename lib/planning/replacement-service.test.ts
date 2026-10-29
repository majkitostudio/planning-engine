import { describe, expect, it } from "vitest";

import { CONFIRMED_PLANNING_RULES, CONFIRMED_SHIFT_DEFINITIONS } from "./domain";
import {
  createReplacementOptions,
  evaluateReplacementOption,
} from "./replacement-service";
import type {
  ConfirmedPlan,
  PlanningInput,
  ProposedAssignment,
  ReplacementDraft,
  ReplacementRequest,
} from "./domain/types";

const WEEK_START = "2026-10-05";
const TARGET_DATE = "2026-10-06";
const TARGET_SHIFT = "afternoon" as const;
const ABSENT_EMPLOYEE = "employee-1";
const TARGET_EMPLOYEES = [
  "employee-1",
  "employee-2",
  "employee-3",
  "employee-4",
  "employee-5",
  "employee-6",
  "employee-7",
] as const;
const FREE_EMPLOYEE = "employee-8";

describe("replacement-service", () => {
  it("vymění absentujícího za kandidáta s volným časem a spočítá změny i pokrytí", () => {
    const { input, basePlan, request } = makeScenario();
    const draft = makeDraft("option-free", replaceAbsentWith(FREE_EMPLOYEE));

    const result = createReplacementOptions(input, basePlan, request, [draft]);
    const option = result.options[0];

    expect(option?.validation.status).toBe("valid");
    expect(option?.changes).toEqual(
      expect.arrayContaining([
        {
          type: "removed",
          assignment: {
            employeeId: ABSENT_EMPLOYEE,
            date: TARGET_DATE,
            shiftKind: TARGET_SHIFT,
          },
        },
        {
          type: "added",
          assignment: {
            employeeId: FREE_EMPLOYEE,
            date: TARGET_DATE,
            shiftKind: TARGET_SHIFT,
          },
        },
      ]),
    );
    expect(option?.coverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          date: TARGET_DATE,
          shiftKind: TARGET_SHIFT,
          requiredEmployees: 7,
          assignedEmployees: 7,
          missingEmployees: 0,
        }),
      ]),
    );
    expect(basePlan.assignments).toContainEqual({
      employeeId: ABSENT_EMPLOYEE,
      date: TARGET_DATE,
      shiftKind: TARGET_SHIFT,
    });
  });

  it("odmítne kandidáta se schválenou absencí", () => {
    const { input, basePlan, request } = makeScenario({
      absences: [
        {
          id: "absence-1",
          employeeId: FREE_EMPLOYEE,
          from: TARGET_DATE,
          to: TARGET_DATE,
          type: "sick",
          status: "approved",
        },
      ],
    });

    const option = evaluateReplacementOption(
      input,
      basePlan,
      request,
      makeDraft("option-approved-absence", replaceAbsentWith(FREE_EMPLOYEE)),
    );

    expect(option.validation.status).toBe("invalid");
    expect(option.validation.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ABSENCE_APPROVED",
          employeeId: FREE_EMPLOYEE,
        }),
      ]),
    );
  });

  it("odmítne kandidáta s překryvem a kontroluje celý týden", () => {
    const { input, basePlan, request } = makeScenario({
      existingAssignments: [
        ...makeBaseAssignments(),
        {
          employeeId: FREE_EMPLOYEE,
          date: TARGET_DATE,
          shiftKind: "morning",
        },
      ],
      baseAssignments: [
        ...makeBaseAssignments(),
        {
          employeeId: FREE_EMPLOYEE,
          date: TARGET_DATE,
          shiftKind: "morning",
        },
      ],
    });

    const option = evaluateReplacementOption(
      input,
      basePlan,
      request,
      makeDraft(
        "option-overlap",
        replaceAbsentWithFromBase(basePlan.assignments, FREE_EMPLOYEE),
      ),
    );

    expect(option.validation.status).toBe("invalid");
    expect(option.validation.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SHIFT_OVERLAP",
          employeeId: FREE_EMPLOYEE,
          date: TARGET_DATE,
        }),
      ]),
    );
  });

  it("odmítne variantu, která nedosáhne interního minima sedmi lidí", () => {
    const { input, basePlan, request } = makeScenario();
    const incompleteAssignments = basePlan.assignments
      .filter(
        (assignment) =>
          assignment.employeeId !== ABSENT_EMPLOYEE &&
          assignment.employeeId !== "employee-2",
      )
      .concat({
        employeeId: FREE_EMPLOYEE,
        date: TARGET_DATE,
        shiftKind: TARGET_SHIFT,
      });

    const option = evaluateReplacementOption(
      input,
      basePlan,
      request,
      makeDraft("option-understaffed", incompleteAssignments),
    );

    expect(option.validation.status).toBe("invalid");
    expect(option.validation.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "COVERAGE_UNDERSTAFFED",
          date: TARGET_DATE,
          shiftKind: TARGET_SHIFT,
        }),
      ]),
    );
  });

  it("přizná méně než tři dostupné varianty a označí výsledek jako neúplný", () => {
    const { input, basePlan, request } = makeScenario();

    const result = createReplacementOptions(input, basePlan, request, [
      makeDraft("only-option", replaceAbsentWith(FREE_EMPLOYEE)),
    ]);

    expect(result.options).toHaveLength(1);
    expect(result.completeness).toBe("partial");
    expect(result.status).toBe("ready_for_review");
  });
});

function makeScenario(overrides: {
  absences?: PlanningInput["absences"];
  existingAssignments?: PlanningInput["existingAssignments"];
  baseAssignments?: ConfirmedPlan["assignments"];
} = {}) {
  const baseAssignments = overrides.baseAssignments ?? makeBaseAssignments();
  const basePlan: ConfirmedPlan = {
    proposalId: "base-proposal-1",
    weekStart: WEEK_START,
    assignments: baseAssignments,
    confirmedAt: "2026-10-05T08:00:00.000Z",
  };
  const input: PlanningInput = {
    weekStart: WEEK_START,
    timeZone: "Europe/Prague",
    employees: [...TARGET_EMPLOYEES, FREE_EMPLOYEE].map((id) => ({
      id,
      displayName: `Syntetický zaměstnanec ${id}`,
      employmentType: "full_time" as const,
    })),
    shiftDefinitions: CONFIRMED_SHIFT_DEFINITIONS,
    staffingRequirements: [
      ...WEEK_DATES.flatMap((date) =>
        SHIFT_KINDS.map((shiftKind) => ({
          date,
          shiftKind,
          requiredEmployees:
            date === TARGET_DATE && shiftKind === TARGET_SHIFT ? 7 : 0,
        })),
      ),
    ],
    absences: overrides.absences ?? [],
    requests: [],
    existingAssignments: overrides.existingAssignments ?? baseAssignments,
    rules: CONFIRMED_PLANNING_RULES,
    history: { assignments: [], complete: true },
  };

  return { input, basePlan, request: makeRequest() };
}

function makeRequest(): ReplacementRequest {
  return {
    id: "replacement-request-1",
    baseProposalId: "base-proposal-1",
    weekStart: WEEK_START,
    incident: {
      id: "incident-1",
      status: "open",
      date: TARGET_DATE,
      shiftKind: TARGET_SHIFT,
      absentEmployeeId: ABSENT_EMPLOYEE,
    },
  };
}

function makeDraft(
  id: string,
  assignments: readonly ProposedAssignment[],
): ReplacementDraft {
  return {
    id,
    candidateEmployeeId: FREE_EMPLOYEE,
    assignments,
    summary: `Varianta ${id}`,
    rationale: "Syntetický testovací návrh.",
  };
}

function replaceAbsentWith(candidateId: string): ProposedAssignment[] {
  return [
    ...makeBaseAssignments().filter(
      (assignment) => assignment.employeeId !== ABSENT_EMPLOYEE,
    ),
    { employeeId: candidateId, date: TARGET_DATE, shiftKind: TARGET_SHIFT },
  ];
}

function replaceAbsentWithFromBase(
  baseAssignments: readonly ProposedAssignment[],
  candidateId: string,
): ProposedAssignment[] {
  return [
    ...baseAssignments.filter(
      (assignment) =>
        !(
          assignment.employeeId === ABSENT_EMPLOYEE &&
          assignment.date === TARGET_DATE &&
          assignment.shiftKind === TARGET_SHIFT
        ),
    ),
    { employeeId: candidateId, date: TARGET_DATE, shiftKind: TARGET_SHIFT },
  ];
}

function makeBaseAssignments(): ProposedAssignment[] {
  return TARGET_EMPLOYEES.map((employeeId) => ({
    employeeId,
    date: TARGET_DATE,
    shiftKind: TARGET_SHIFT,
  }));
}

const WEEK_DATES = [
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08",
  "2026-10-09",
  "2026-10-10",
  "2026-10-11",
] as const;
const SHIFT_KINDS = ["morning", "afternoon"] as const;
