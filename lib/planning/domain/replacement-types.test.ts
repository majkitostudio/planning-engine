import { describe, expect, it } from "vitest";

import {
  CONFIRMED_PLANNING_RULES,
  CONFIRMED_SHIFT_DEFINITIONS,
  validateReplacementRequest,
} from "./index";
import type {
  ConfirmedPlan,
  PlanningInput,
  ReplacementRequest,
} from "./types";

const WEEK_START = "2026-10-05";
const TARGET_DATE = "2026-10-06";
const ASSIGNED_EMPLOYEE = "employee-1";
const OTHER_EMPLOYEE = "employee-2";

describe("validateReplacementRequest", () => {
  it("přijme incident jedné celé směny nad aktuálním potvrzeným základem", () => {
    const input = makeInput();
    const basePlan = makeConfirmedPlan([
      { employeeId: ASSIGNED_EMPLOYEE, date: TARGET_DATE, shiftKind: "afternoon" },
    ]);
    const request = makeRequest({
      baseProposalId: basePlan.proposalId,
      incident: {
        id: "incident-1",
        status: "open",
        date: TARGET_DATE,
        shiftKind: "afternoon",
        absentEmployeeId: ASSIGNED_EMPLOYEE,
      },
    });

    const result = validateReplacementRequest(input, basePlan, request);

    expect(result).toEqual({ status: "valid", problems: [] });
    expect(basePlan.assignments).toHaveLength(1);
  });

  it.each([
    {
      name: "incident mimo týden",
      request: makeRequest({
        incident: {
          id: "incident-outside-week",
          status: "open",
          date: "2026-10-12",
          shiftKind: "afternoon",
          absentEmployeeId: ASSIGNED_EMPLOYEE,
        },
      }),
      expectedCode: "REPLACEMENT_INCIDENT_OUTSIDE_WEEK",
    },
    {
      name: "neznámého zaměstnance",
      request: makeRequest({
        incident: {
          id: "incident-unknown-employee",
          status: "open",
          date: TARGET_DATE,
          shiftKind: "afternoon",
          absentEmployeeId: "missing-employee",
        },
      }),
      expectedCode: "REPLACEMENT_INCIDENT_UNKNOWN_EMPLOYEE",
    },
    {
      name: "neznámou směnu",
      request: makeRequest({
        incident: {
          id: "incident-unknown-shift",
          status: "open",
          date: TARGET_DATE,
          shiftKind: "night" as never,
          absentEmployeeId: ASSIGNED_EMPLOYEE,
        },
      }),
      expectedCode: "REPLACEMENT_INCIDENT_UNKNOWN_SHIFT",
    },
    {
      name: "zastaralý nebo neexistující základ",
      request: makeRequest({
        baseProposalId: "missing-base",
        incident: {
          id: "incident-stale-base",
          status: "open",
          date: TARGET_DATE,
          shiftKind: "afternoon",
          absentEmployeeId: ASSIGNED_EMPLOYEE,
        },
      }),
      expectedCode: "REPLACEMENT_BASE_MISMATCH",
    },
  ])("odmítne $name stabilním kódem", ({ request, expectedCode }) => {
    const result = validateReplacementRequest(
      makeInput(),
      makeConfirmedPlan([
        { employeeId: ASSIGNED_EMPLOYEE, date: TARGET_DATE, shiftKind: "afternoon" },
      ]),
      request,
    );

    expect(result.status).toBe("invalid");
    expect(result.problems.map((problem) => problem.code)).toContain(expectedCode);
  });

  it("odmítne incident, pokud absentující zaměstnanec na základu není přiřazený", () => {
    const result = validateReplacementRequest(
      makeInput(),
      makeConfirmedPlan([
        { employeeId: OTHER_EMPLOYEE, date: TARGET_DATE, shiftKind: "afternoon" },
      ]),
      makeRequest(),
    );

    expect(result.status).toBe("invalid");
    expect(result.problems.map((problem) => problem.code)).toContain(
      "REPLACEMENT_INCIDENT_ASSIGNMENT_NOT_FOUND",
    );
  });
});

function makeRequest(
  overrides: Partial<ReplacementRequest> = {},
): ReplacementRequest {
  return {
    id: "replacement-request-1",
    baseProposalId: "base-proposal-1",
    weekStart: WEEK_START,
    incident: {
      id: "incident-1",
      status: "open",
      date: TARGET_DATE,
      shiftKind: "afternoon",
      absentEmployeeId: ASSIGNED_EMPLOYEE,
    },
    ...overrides,
  };
}

function makeConfirmedPlan(
  assignments: ConfirmedPlan["assignments"],
): ConfirmedPlan {
  return {
    proposalId: "base-proposal-1",
    weekStart: WEEK_START,
    assignments,
    confirmedAt: "2026-10-05T08:00:00.000Z",
  };
}

function makeInput(): PlanningInput {
  return {
    weekStart: WEEK_START,
    timeZone: "Europe/Prague",
    employees: [
      {
        id: ASSIGNED_EMPLOYEE,
        displayName: "Syntetický zaměstnanec 1",
        employmentType: "full_time",
      },
      {
        id: OTHER_EMPLOYEE,
        displayName: "Syntetický zaměstnanec 2",
        employmentType: "full_time",
      },
    ],
    shiftDefinitions: CONFIRMED_SHIFT_DEFINITIONS,
    staffingRequirements: [],
    absences: [],
    requests: [],
    existingAssignments: [],
    rules: CONFIRMED_PLANNING_RULES,
    history: { assignments: [], complete: true },
  };
}
