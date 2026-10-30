import {
  CONFIRMED_PLANNING_RULES,
  CONFIRMED_SHIFT_DEFINITIONS,
  DEFAULT_TIME_ZONE,
} from "../domain/confirmed";
import type {
  ConfirmedPlan,
  Employee,
  PlanningInput,
  ProposedAssignment,
  ReplacementDraft,
  ReplacementRequest,
} from "../domain/types";

export const SIMULATED_REPLACEMENT_SCENARIO_IDS = ["single-absence"] as const;
export type SimulatedReplacementScenarioId =
  (typeof SIMULATED_REPLACEMENT_SCENARIO_IDS)[number];

export interface SimulatedReplacementScenario {
  readonly id: SimulatedReplacementScenarioId;
  readonly label: string;
  readonly input: PlanningInput;
  readonly basePlan: ConfirmedPlan;
  readonly request: ReplacementRequest;
  readonly drafts: readonly ReplacementDraft[];
}

const WEEK_START = "2026-10-05";
const TARGET_DATE = "2026-10-06";
const TARGET_SHIFT = "afternoon" as const;
const BASE_ASSIGNMENTS: readonly ProposedAssignment[] = [
  ...["e1", "e2", "e3", "e4", "e5", "e6", "e7"].map((employeeId) => ({
    employeeId,
    date: TARGET_DATE,
    shiftKind: TARGET_SHIFT,
  })),
  ...[
    "e1",
    "e3",
    "e4",
    "e5",
    "e6",
    "e7",
    "e9",
    "e10",
    "e11",
    "e12",
    "e13",
    "e14",
    "e15",
    "e16",
    "e17",
  ].map((employeeId) => ({
    employeeId,
    date: WEEK_START,
    shiftKind: "morning" as const,
  })),
  ...["e18", "e19", "e20", "e21", "e22", "e23", "e24", "e25"].map((employeeId) => ({
    employeeId,
    date: WEEK_START,
    shiftKind: "morning" as const,
  })),
  { employeeId: "e26", date: TARGET_DATE, shiftKind: TARGET_SHIFT },
];

const EMPLOYEES: readonly Employee[] = [
  ...[
    "e1",
    "e2",
    "e3",
    "e4",
    "e5",
    "e6",
    "e7",
    "e8",
    "e9",
    "e10",
    "e11",
    "e12",
    "e13",
    "e14",
    "e15",
    "e16",
    "e17",
    "e18",
    "e19",
    "e20",
    "e21",
    "e22",
    "e23",
    "e24",
    "e25",
    "e26",
  ].map((id) => ({
    id,
    displayName: `Syntetický zaměstnanec ${id}`,
    employmentType: "full_time" as const,
  })),
];

const BASE_PLAN: ConfirmedPlan = {
  proposalId: "replacement-base-1",
  weekStart: WEEK_START,
  assignments: BASE_ASSIGNMENTS,
  confirmedAt: "2026-10-05T08:00:00.000Z",
};

const REQUEST: ReplacementRequest = {
  id: "replacement-request-1",
  baseProposalId: BASE_PLAN.proposalId,
  weekStart: WEEK_START,
  incident: {
    id: "incident-1",
    status: "open",
    date: TARGET_DATE,
    shiftKind: TARGET_SHIFT,
    absentEmployeeId: "e1",
  },
};

const DIRECT_ASSIGNMENTS = replaceAbsent("e8");
const DOMINO_ASSIGNMENTS = [
  ...BASE_ASSIGNMENTS.filter(
    (assignment) =>
      !(
        assignment.date === TARGET_DATE &&
        assignment.shiftKind === TARGET_SHIFT &&
        (assignment.employeeId === "e1" || assignment.employeeId === "e2")
      ) &&
      !(
        assignment.date === WEEK_START &&
        assignment.shiftKind === "morning" &&
        assignment.employeeId === "e9"
      ),
  ),
  { employeeId: "e8", date: TARGET_DATE, shiftKind: TARGET_SHIFT },
  { employeeId: "e9", date: TARGET_DATE, shiftKind: TARGET_SHIFT },
  { employeeId: "e2", date: WEEK_START, shiftKind: "morning" as const },
];
const UNDERSTAFFED_ASSIGNMENTS = replaceAbsent("e8").filter(
  (assignment) => assignment.employeeId !== "e2",
);

export const SIMULATED_REPLACEMENT_SCENARIO: SimulatedReplacementScenario = {
  id: "single-absence",
  label: "Výpadek celé odpolední směny",
  input: {
    weekStart: WEEK_START,
    timeZone: DEFAULT_TIME_ZONE,
    employees: EMPLOYEES,
    shiftDefinitions: CONFIRMED_SHIFT_DEFINITIONS,
    staffingRequirements: [
      ...weekDates().flatMap((date) =>
        (["morning", "afternoon"] as const).map((shiftKind) => ({
          date,
          shiftKind,
      requiredEmployees:
            date === WEEK_START && shiftKind === "morning"
              ? 23
              : date === TARGET_DATE && shiftKind === TARGET_SHIFT
                ? 8
                : 0,
        })),
      ),
    ],
    absences: [],
    requests: [],
    existingAssignments: BASE_ASSIGNMENTS,
    rules: CONFIRMED_PLANNING_RULES,
    history: { assignments: [], complete: true },
  },
  basePlan: BASE_PLAN,
  request: REQUEST,
  drafts: [
    {
      id: "replacement-direct",
      candidateEmployeeId: "e8",
      assignments: DIRECT_ASSIGNMENTS,
      summary: "Přímá náhrada volným zaměstnancem",
      rationale: "e8 nemá v základním týdnu jiné přiřazení.",
    },
    {
      id: "replacement-domino",
      candidateEmployeeId: "e8",
      assignments: DOMINO_ASSIGNMENTS,
      summary: "Náhrada s přesunem dalšího zaměstnance",
      rationale:
        "e8 nahradí výpadek, e9 uvolní místo a e2 se přesune na ranní směnu.",
      tradeOffs: ["Varianta mění přiřazení e2 a e9 mimo řešenou směnu."],
    },
    {
      id: "replacement-understaffed",
      candidateEmployeeId: "e8",
      assignments: UNDERSTAFFED_ASSIGNMENTS,
      summary: "Náhrada s novým nedostatkem",
      rationale: "Návrh e2 neupraví a přizná nový nedostatek pokrytí.",
      tradeOffs: ["Na řešené směně zůstane méně než 7 lidí."],
    },
  ],
};

export function getSimulatedReplacementScenario(
  id: string,
): SimulatedReplacementScenario | undefined {
  return id === SIMULATED_REPLACEMENT_SCENARIO.id
    ? SIMULATED_REPLACEMENT_SCENARIO
    : undefined;
}

function replaceAbsent(candidateEmployeeId: string): ProposedAssignment[] {
  return [
    ...BASE_ASSIGNMENTS.filter(
      (assignment) =>
        !(
          assignment.employeeId === "e1" &&
          assignment.date === TARGET_DATE &&
          assignment.shiftKind === TARGET_SHIFT
        ),
    ),
    { employeeId: candidateEmployeeId, date: TARGET_DATE, shiftKind: TARGET_SHIFT },
  ];
}

function weekDates(): readonly string[] {
  return [
    "2026-10-05",
    "2026-10-06",
    "2026-10-07",
    "2026-10-08",
    "2026-10-09",
    "2026-10-10",
    "2026-10-11",
  ];
}
