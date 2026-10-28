import { describe, expect, it } from "vitest";

import {
  CONFIRMED_PLANNING_RULES,
  CONFIRMED_SHIFT_DEFINITIONS,
  validatePlan,
} from "./index";
import type { PlanProposal } from "../types";
import type {
  PlanDraft,
  PlanValidationResult,
  PlanningHistory,
  PlanningInput,
  PlanningRules,
  ProposedAssignment,
  ShiftDefinition,
  ShiftKind,
  StaffingRequirement,
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

describe("validatePlan — pokrytí", () => {
  it("označí přesně obsazený návrh jako validní", () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[0]}|morning`]: 1,
      }),
    });

    const result = validatePlan(
      input,
      makeProposal([makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning")]),
    );

    expect(result.status).toBe("valid");
    expect(result.problems).toEqual([]);
    expect(result.unverifiedChecks).toEqual([]);
  });

  it("neoznačí schválený výklad pracovního dne a hrubých časů jako otevřený", () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[0]}|morning`]: 1,
      }),
    });

    const result = validatePlan(
      input,
      makeProposal([makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning")]),
    );

    expect(result.assumptions).not.toEqual(
      expect.arrayContaining([expect.stringContaining("OQ21")]),
    );
    expect(result.assumptions).not.toEqual(
      expect.arrayContaining([expect.stringContaining("OQ24")]),
    );
  });

  it("odhalí nedostatečné obsazení jako chybu", () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[0]}|morning`]: 2,
      }),
    });

    const result = validatePlan(
      input,
      makeProposal([makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning")]),
    );

    const problem = findProblem(result, "COVERAGE_UNDERSTAFFED");
    expect(result.status).toBe("invalid");
    expect(problem?.severity).toBe("error");
    expect(problem?.date).toBe(WEEK_DATES[0]);
    expect(problem?.shiftKind).toBe("morning");
    expect(problem?.details).toMatchObject({
      requiredEmployees: 2,
      assignedEmployees: 1,
      missingEmployees: 1,
    });
  });

  it("odhalí nadbytečné obsazení jako varování, ne jako neplatný plán", () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[0]}|morning`]: 1,
      }),
    });

    const result = validatePlan(
      input,
      makeProposal([
        makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning"),
        makeAssignment(EMPLOYEE_2, WEEK_DATES[0], "morning"),
      ]),
    );

    const problem = findProblem(result, "COVERAGE_OVERSTAFFED");
    expect(result.status).toBe("valid");
    expect(problem?.severity).toBe("warning");
    expect(problem?.details).toMatchObject({
      requiredEmployees: 1,
      assignedEmployees: 2,
      extraEmployees: 1,
    });
  });
});

describe("validatePlan — překryvy a absence", () => {
  it("odhalí překryv dvou směn jednoho zaměstnance", () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[0]}|morning`]: 1,
        [`${WEEK_DATES[0]}|afternoon`]: 1,
      }),
    });

    const result = validatePlan(
      input,
      makeProposal([
        makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning"),
        makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "afternoon"),
      ]),
    );

    const problem = findProblem(result, "SHIFT_OVERLAP");
    expect(result.status).toBe("invalid");
    expect(problem?.employeeId).toBe(EMPLOYEE_1);
    expect(problem?.details?.overlapMinutes).toBeGreaterThan(0);
  });

  it("odhalí překryv směny navazující přes půlnoc", () => {
    const definitions: ShiftDefinition[] = [
      {
        kind: "morning",
        weekday: { start: "05:00", end: "14:00" },
        weekend: { start: "05:00", end: "14:00" },
      },
      {
        kind: "afternoon",
        weekday: { start: "20:00", end: "06:00" },
        weekend: { start: "20:00", end: "06:00" },
      },
    ];
    const input = makeInput({
      shiftDefinitions: definitions,
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[0]}|afternoon`]: 1,
        [`${WEEK_DATES[1]}|morning`]: 1,
      }),
    });

    const result = validatePlan(
      input,
      makeProposal([
        makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "afternoon"),
        makeAssignment(EMPLOYEE_1, WEEK_DATES[1], "morning"),
      ]),
    );

    const problem = findProblem(result, "SHIFT_OVERLAP");
    expect(result.status).toBe("invalid");
    expect(problem?.details?.overlapMinutes).toBe(60);
  });

  it("zakáže přiřazení na schválenou absenci", () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[0]}|morning`]: 1,
      }),
      absences: [
        {
          id: "absence-1",
          employeeId: EMPLOYEE_1,
          from: WEEK_DATES[0],
          to: WEEK_DATES[0],
          type: "vacation",
          status: "approved",
        },
      ],
    });

    const result = validatePlan(
      input,
      makeProposal([makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning")]),
    );

    const problem = findProblem(result, "ABSENCE_APPROVED");
    expect(result.status).toBe("invalid");
    expect(problem?.employeeId).toBe(EMPLOYEE_1);
    expect(problem?.details).toMatchObject({ absenceId: "absence-1" });
  });

  it("neblokuje přiřazení kvůli neschválené absenci", () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[0]}|morning`]: 1,
      }),
      absences: [
        {
          id: "absence-1",
          employeeId: EMPLOYEE_1,
          from: WEEK_DATES[0],
          to: WEEK_DATES[0],
          type: "vacation",
          status: "pending",
        },
      ],
    });

    const result = validatePlan(
      input,
      makeProposal([makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning")]),
    );

    expect(result.status).toBe("valid");
    expect(findProblem(result, "ABSENCE_APPROVED")).toBeUndefined();
  });
});

describe("validatePlan — odpočinek po šesti dnech", () => {
  it("uzná platný odpočinek s použitím historie před týdnem", () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[1]}|morning`]: 1,
      }),
      history: historySixDays("morning"),
    });

    const result = validatePlan(
      input,
      makeProposal([makeAssignment(EMPLOYEE_1, WEEK_DATES[1], "morning")]),
    );

    expect(result.status).toBe("valid");
    expect(findProblem(result, "REST_AFTER_SIX_DAYS")).toBeUndefined();
  });

  it("odhalí méně než 35 hodin odpočinku po šesti dnech", () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[0]}|morning`]: 1,
      }),
      history: historySixDays("afternoon"),
    });

    const result = validatePlan(
      input,
      makeProposal([makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning")]),
    );

    const problem = findProblem(result, "REST_AFTER_SIX_DAYS");
    expect(result.status).toBe("invalid");
    expect(problem?.employeeId).toBe(EMPLOYEE_1);
    expect(problem?.details).toMatchObject({
      sixthDate: "2026-05-30",
      nextDate: WEEK_DATES[0],
      restMinutes: 34 * 60 + 45,
      requiredMinutes: 35 * 60,
    });
  });

  it("uzná přesně 35 hodin odpočinku jako hraniční platnou hodnotu", () => {
    const definitions: ShiftDefinition[] = [
      {
        kind: "morning",
        weekday: { start: "08:00", end: "16:30" },
        weekend: { start: "08:00", end: "16:30" },
      },
      {
        kind: "afternoon",
        weekday: { start: "13:15", end: "21:00" },
        weekend: { start: "12:45", end: "21:00" },
      },
    ];
    const input = makeInput({
      shiftDefinitions: definitions,
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[0]}|morning`]: 1,
      }),
      history: historySixDays("afternoon"),
    });

    const result = validatePlan(
      input,
      makeProposal([makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning")]),
    );

    expect(result.status).toBe("valid");
    expect(findProblem(result, "REST_AFTER_SIX_DAYS")).toBeUndefined();
  });

  it("označí chybějící historii jako neověřenou, ne jako platný odpočinek", () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[0]}|morning`]: 1,
      }),
      history: undefined,
    });

    const result = validatePlan(
      input,
      makeProposal([makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning")]),
    );

    const check = findUnverified(result, "REST_HISTORY_INCOMPLETE");
    expect(result.status).toBe("not_verified");
    expect(check?.employeeId).toBe(EMPLOYEE_1);
    expect(result.problems).toEqual([]);
  });

  it("nepotřebuje historii, když první směna týdne je o víkendu", () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[5]}|morning`]: 1,
      }),
      history: undefined,
    });

    const result = validatePlan(
      input,
      makeProposal([makeAssignment(EMPLOYEE_1, WEEK_DATES[5], "morning")]),
    );

    expect(result.status).toBe("valid");
    expect(findUnverified(result, "REST_HISTORY_INCOMPLETE")).toBeUndefined();
  });
});

describe("validatePlan — dva dny volna po víkendu", () => {
  it("odhalí, že zaměstnanec pracující o víkendu má jen jeden den volna", () => {
    const assignments = WEEK_DATES.slice(0, 6).map((date) =>
      makeAssignment(EMPLOYEE_1, date, "morning"),
    );
    const input = makeInput({
      staffingRequirements: makeRequirements(
        Object.fromEntries(
          WEEK_DATES.slice(0, 6).map((date) => [`${date}|morning`, 1]),
        ),
      ),
    });

    const result = validatePlan(input, makeProposal(assignments));

    const problem = findProblem(result, "WEEKEND_TWO_DAYS_OFF");
    expect(result.status).toBe("invalid");
    expect(problem?.employeeId).toBe(EMPLOYEE_1);
    expect(problem?.details).toMatchObject({ offDays: 1, requiredDaysOff: 2 });
  });

  it("uzná dva libovolné dny volna po práci o víkendu", () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[5]}|morning`]: 1,
      }),
    });

    const result = validatePlan(
      input,
      makeProposal([makeAssignment(EMPLOYEE_1, WEEK_DATES[5], "morning")]),
    );

    expect(result.status).toBe("valid");
    expect(findProblem(result, "WEEKEND_TWO_DAYS_OFF")).toBeUndefined();
  });

  it("označí nepo sobě jdoucí dva dny volna jako neověřený výklad", () => {
    const workDates = [
      WEEK_DATES[0],
      WEEK_DATES[1],
      WEEK_DATES[3],
      WEEK_DATES[5],
      WEEK_DATES[6],
    ];
    const input = makeInput({
      staffingRequirements: makeRequirements(
        Object.fromEntries(
          workDates.map((date) => [`${date}|morning`, 1]),
        ),
      ),
    });

    const result = validatePlan(
      input,
      makeProposal(
        workDates.map((date) => makeAssignment(EMPLOYEE_1, date, "morning")),
      ),
    );

    const check = findUnverified(
      result,
      "WEEKEND_DAYS_OFF_INTERPRETATION",
    );
    expect(result.status).toBe("not_verified");
    expect(result.problems).toEqual([]);
    expect(check?.employeeId).toBe(EMPLOYEE_1);
  });
});

describe("validatePlan — neúplné a neplatné vstupy", () => {
  it("označí chybějící požadavek na obsazení jako neověřené pokrytí", () => {
    const requirements = makeRequirements().filter(
      (requirement) =>
        !(
          requirement.date === WEEK_DATES[0] &&
          requirement.shiftKind === "morning"
        ),
    );
    const input = makeInput({ staffingRequirements: requirements });

    const result = validatePlan(
      input,
      makeProposal([makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning")]),
    );

    const check = findUnverified(result, "COVERAGE_REQUIREMENT_MISSING");
    expect(result.status).toBe("not_verified");
    expect(check?.date).toBe(WEEK_DATES[0]);
    expect(check?.shiftKind).toBe("morning");
  });

  it("označí chybějící definice směn jako neověřené časové kontroly", () => {
    const input = makeInput({
      shiftDefinitions: [],
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[0]}|morning`]: 1,
      }),
    });

    const result = validatePlan(
      input,
      makeProposal([makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning")]),
    );

    expect(result.status).toBe("not_verified");
    expect(
      findUnverified(result, "INPUT_SHIFT_DEFINITION_INVALID"),
    ).toBeDefined();
  });

  it("odmítne nepotvrzená pravidla místo tichého použití jiných hodnot", () => {
    const input = makeInput({
      rules: {
        ...CONFIRMED_PLANNING_RULES,
        longRestHours: 36,
      } as unknown as PlanningRules,
    });

    const result = validatePlan(
      input,
      makeProposal([makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning")]),
    );

    expect(result.status).toBe("not_verified");
    expect(findUnverified(result, "INPUT_RULES_MISMATCH")).toBeDefined();
  });

  it("odmítne týden, který nezačíná pondělím", () => {
    const input = makeInput({ weekStart: "2026-06-02" });

    const result = validatePlan(
      input,
      makeProposal([], "2026-06-02"),
    );

    expect(result.status).toBe("not_verified");
    expect(findUnverified(result, "INPUT_WEEK_START_INVALID")).toBeDefined();
  });

  it("odhalí přiřazení mimo plánovaný týden", () => {
    const input = makeInput();
    const result = validatePlan(
      input,
      makeProposal([makeAssignment(EMPLOYEE_1, "2026-06-08", "morning")]),
    );

    expect(result.status).toBe("invalid");
    expect(findProblem(result, "ASSIGNMENT_OUTSIDE_WEEK")).toBeDefined();
  });

  it("odhalí duplicitní přiřazení bez dvojího započtení do pokrytí", () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[0]}|morning`]: 1,
      }),
    });

    const result = validatePlan(
      input,
      makeProposal([
        makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning"),
        makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning"),
      ]),
    );

    expect(result.status).toBe("invalid");
    expect(findProblem(result, "ASSIGNMENT_DUPLICATE")).toBeDefined();
    expect(findProblem(result, "COVERAGE_UNDERSTAFFED")).toBeUndefined();
    expect(findProblem(result, "COVERAGE_OVERSTAFFED")).toBeUndefined();
  });
});

describe("validatePlan — více problémů současně", () => {
  it("vrátí překryv, absenci i nedostatečné obsazení v jednom výsledku", () => {
    const input = makeInput({
      staffingRequirements: makeRequirements({
        [`${WEEK_DATES[0]}|morning`]: 3,
        [`${WEEK_DATES[0]}|afternoon`]: 1,
      }),
      absences: [
        {
          id: "absence-1",
          employeeId: EMPLOYEE_1,
          from: WEEK_DATES[0],
          to: WEEK_DATES[0],
          type: "sick",
          status: "approved",
        },
      ],
    });

    const result = validatePlan(
      input,
      makeProposal([
        makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "morning"),
        makeAssignment(EMPLOYEE_1, WEEK_DATES[0], "afternoon"),
        makeAssignment(EMPLOYEE_2, WEEK_DATES[0], "morning"),
      ]),
    );

    expect(result.status).toBe("invalid");
    expect(findProblem(result, "SHIFT_OVERLAP")).toBeDefined();
    expect(findProblem(result, "ABSENCE_APPROVED")).toBeDefined();
    expect(findProblem(result, "COVERAGE_UNDERSTAFFED")).toBeDefined();
  });
});

function makeEmployee(id: string) {
  return {
    id,
    displayName: `Syntetický zaměstnanec ${id}`,
    employmentType: "full_time" as const,
  };
}

function makeRequirements(
  overrides: Readonly<Record<string, number>> = {},
): StaffingRequirement[] {
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

function makeProposal(
  assignments: readonly ProposedAssignment[],
  weekStart: string = WEEK_START,
): PlanProposal<PlanDraft> {
  return {
    id: "proposal-1",
    source: { kind: "manual" },
    plan: {
      weekStart,
      assignments,
      explanations: [],
      alternatives: [],
      assumptions: [],
    },
  };
}

function makeAssignment(
  employeeId: string,
  date: string,
  shiftKind: ShiftKind,
): ProposedAssignment {
  return { employeeId, date, shiftKind };
}

function historySixDays(lastShift: ShiftKind): PlanningHistory {
  const dates = [
    "2026-05-25",
    "2026-05-26",
    "2026-05-27",
    "2026-05-28",
    "2026-05-29",
    "2026-05-30",
  ];

  return {
    assignments: dates.map((date) => ({
      employeeId: EMPLOYEE_1,
      date,
      shiftKind: date === "2026-05-30" ? lastShift : "morning",
    })),
    complete: true,
  };
}

function findProblem(
  result: PlanValidationResult,
  code: PlanValidationResult["problems"][number]["code"],
) {
  return result.problems.find((problem) => problem.code === code);
}

function findUnverified(
  result: PlanValidationResult,
  code: PlanValidationResult["unverifiedChecks"][number]["code"],
) {
  return result.unverifiedChecks.find((check) => check.code === code);
}
