/**
 * SIMULATED fixtures pro Fázi 2.
 *
 * Tři ručně napsané scénáře pro pevný týden 5.–11. 10. 2026. Nejsou to
 * plánovací algoritmy ani skutečná zaměstnanecká data. Každý scénář má vlastní
 * `PlanningInput` a `PlanDraft`, aby výsledek orchestrátoru pokryl jeden
 * z stavů, které musí UI umět zobrazit.
 *
 * Fixtures se nesmí „dopočítávat“ pro jiný týden. Provider pro neznámý týden
 * selže, místo aby vymyslel náhradní plán.
 */

import {
  CONFIRMED_PLANNING_RULES,
  CONFIRMED_SHIFT_DEFINITIONS,
} from "../domain/confirmed";
import { DEFAULT_TIME_ZONE } from "../domain/confirmed";
import { addDays, datesInWeek, isWeekendDate } from "../domain/time";
import type {
  Alternative,
  Employee,
  ExistingAssignment,
  Explanation,
  IsoDate,
  PlanDraft,
  PlanningInput,
  PlanningRunStatus,
  PlanValidationStatus,
  ProposedAssignment,
  ShiftKind,
  StaffingRequirement,
} from "../domain/types";

/** Pevný týden všech simulovaných scénářů; pondělí. */
export const SIMULATED_WEEK_START = "2026-10-05";

export const SIMULATED_SCENARIO_IDS = [
  "complete",
  "partial",
  "unverified",
] as const;

export type SimulatedScenarioId = (typeof SIMULATED_SCENARIO_IDS)[number];

export function isSimulatedScenarioId(
  value: unknown,
): value is SimulatedScenarioId {
  return (
    typeof value === "string" &&
    (SIMULATED_SCENARIO_IDS as readonly string[]).includes(value)
  );
}

export interface SimulatedScenarioSummary {
  readonly id: SimulatedScenarioId;
  readonly label: string;
  readonly description: string;
  readonly expectedStatus: PlanningRunStatus;
  readonly expectedCompleteness: "complete" | "partial";
}

export interface SimulatedScenario extends SimulatedScenarioSummary {
  readonly input: PlanningInput;
  readonly draft: PlanDraft;
  readonly expectedValidationStatus: PlanValidationStatus;
}

const EMPLOYEES: readonly Employee[] = [
  {
    id: "e1",
    displayName: "Anna Nováková",
    employmentType: "full_time",
    role: "Operátor",
  },
  {
    id: "e2",
    displayName: "Petr Svoboda",
    employmentType: "full_time",
    role: "Operátor",
  },
  {
    id: "e3",
    displayName: "Lucie Svobodová",
    employmentType: "full_time",
    role: "Operátor",
  },
  {
    id: "e4",
    displayName: "Tomáš Malý",
    employmentType: "full_time",
    role: "Operátor",
  },
  {
    id: "e5",
    displayName: "Eva Černá",
    employmentType: "full_time",
    role: "Operátor",
  },
  {
    id: "e6",
    displayName: "Martin Procházka",
    employmentType: "full_time",
    role: "Operátor",
  },
];

const MONDAY_TO_FRIDAY: readonly IsoDate[] = [
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08",
  "2026-10-09",
];

const WEEKEND: readonly IsoDate[] = ["2026-10-10", "2026-10-11"];

function assign(
  employeeId: string,
  dates: readonly IsoDate[],
  shiftKind: ShiftKind,
): ProposedAssignment[] {
  return dates.map((date) => ({ employeeId, date, shiftKind }));
}

/**
 * Rozvrh, který při požadavku 2/2 ve všední den a 1/1 o víkendu pokryje vše.
 *
 * e1–e4 pracují pondělí–pátek, e5 a e6 jen o víkendu. Nikdo nemá šest
 * po sobě jdoucích pracovních dnů a oba víkendoví pracovníci mají pondělí–pátek
 * volno, tedy víc než dva po sobě jdoucí dny volna.
 */
const COMPLETE_ASSIGNMENTS: readonly ProposedAssignment[] = [
  ...assign("e1", MONDAY_TO_FRIDAY, "morning"),
  ...assign("e2", MONDAY_TO_FRIDAY, "morning"),
  ...assign("e3", MONDAY_TO_FRIDAY, "afternoon"),
  ...assign("e4", MONDAY_TO_FRIDAY, "afternoon"),
  ...assign("e5", WEEKEND, "morning"),
  ...assign("e6", WEEKEND, "afternoon"),
];

const EXISTING_ASSIGNMENTS: readonly ExistingAssignment[] = [
  { employeeId: "e1", date: "2026-10-05", shiftKind: "morning" },
  { employeeId: "e3", date: "2026-10-05", shiftKind: "afternoon" },
  { employeeId: "e6", date: "2026-10-10", shiftKind: "afternoon" },
  // Tyto dvě směny návrh ruší; v UI se musí objevit jako `removed`.
  { employeeId: "e5", date: "2026-10-05", shiftKind: "morning" },
  { employeeId: "e2", date: "2026-10-06", shiftKind: "afternoon" },
];

function buildRequirements(
  weekday: { readonly morning: number; readonly afternoon: number },
  weekend: { readonly morning: number; readonly afternoon: number },
): StaffingRequirement[] {
  return datesInWeek(SIMULATED_WEEK_START).flatMap((date) => {
    const isWeekend = isWeekendDate(date);
    return [
      {
        date,
        shiftKind: "morning" as const,
        requiredEmployees: isWeekend ? weekend.morning : weekday.morning,
      },
      {
        date,
        shiftKind: "afternoon" as const,
        requiredEmployees: isWeekend ? weekend.afternoon : weekday.afternoon,
      },
    ];
  });
}

function buildInput(
  staffingRequirements: readonly StaffingRequirement[],
  history: PlanningInput["history"],
): PlanningInput {
  return {
    weekStart: SIMULATED_WEEK_START,
    timeZone: DEFAULT_TIME_ZONE,
    employees: EMPLOYEES,
    shiftDefinitions: CONFIRMED_SHIFT_DEFINITIONS,
    staffingRequirements,
    absences: [],
    requests: [],
    existingAssignments: EXISTING_ASSIGNMENTS,
    rules: CONFIRMED_PLANNING_RULES,
    history,
  };
}

const COMPLETE_EXPLANATIONS: readonly Explanation[] = [
  {
    topic: "coverage",
    text: "Ve všední den jsou ranní i odpolední směna obsazeny dvěma zaměstnanci, o víkendu jedním.",
  },
  {
    topic: "weekend",
    text: "Eva Černá a Martin Procházka pracují jen o víkendu a mají pondělí až pátek volno, tedy víc než dva po sobě jdoucí dny volna.",
  },
  {
    topic: "rest",
    text: "Nikdo nepracuje šest dní v řadě, proto v tomto týdnu nevzniká nárok na dlouhý odpočinek.",
  },
];

const PARTIAL_ALTERNATIVE: Alternative = {
  id: "alt-presun-e4",
  summary: "Přesunout Tomáše Malého na ranní směnu",
  impact:
    "Ranní nedostatek se sníží, ale na odpolední směně vznikne nedostatek jiný. Konflikt se tím nevyřeší.",
  assignments: [
    ...assign("e1", MONDAY_TO_FRIDAY, "morning"),
    ...assign("e2", MONDAY_TO_FRIDAY, "morning"),
    ...assign("e3", MONDAY_TO_FRIDAY, "afternoon"),
    ...assign("e4", MONDAY_TO_FRIDAY, "morning"),
    ...assign("e5", WEEKEND, "morning"),
    ...assign("e6", WEEKEND, "afternoon"),
  ],
  tradeOffs: [
    "Odpolední směna ve všední den zůstane pod požadovaným obsazením.",
    "Řešení vyžaduje dalšího zaměstnance, ne jen přesun stávajících.",
  ],
};

function makeDraft(
  assignments: readonly ProposedAssignment[],
  explanations: readonly Explanation[],
  alternatives: readonly Alternative[],
  assumptions: readonly string[],
): PlanDraft {
  return {
    weekStart: SIMULATED_WEEK_START,
    assignments,
    explanations,
    alternatives,
    assumptions,
  };
}

const COMPLETE_SCENARIO: SimulatedScenario = {
  id: "complete",
  label: "Kompletní návrh",
  description:
    "Plné pokrytí, úplná historie i pravidla. Výsledek má být připravený ke kontrole, ne schválený.",
  expectedStatus: "ready_for_review",
  expectedCompleteness: "complete",
  expectedValidationStatus: "valid",
  input: buildInput(
    buildRequirements(
      { morning: 2, afternoon: 2 },
      { morning: 1, afternoon: 1 },
    ),
    // SIMULATED: fixture tvrdí, že před týdnem nikdo nesměl na směnu.
    { assignments: [], complete: true },
  ),
  draft: makeDraft(
    COMPLETE_ASSIGNMENTS,
    COMPLETE_EXPLANATIONS,
    [],
    [
      "Zaměstnanci jsou na plný úvazek.",
      "Historie před týdnem je podle vstupu úplná a neobsahuje směny.",
    ],
  ),
};

const PARTIAL_SCENARIO: SimulatedScenario = {
  id: "partial",
  label: "Chybějící obsazení",
  description:
    "Ve všední den chybí jeden zaměstnanec na ranní směně. Návrh je použitelný k diskusi, ale potvrzení je blokované.",
  expectedStatus: "needs_changes",
  expectedCompleteness: "partial",
  expectedValidationStatus: "invalid",
  input: buildInput(
    buildRequirements(
      { morning: 3, afternoon: 2 },
      { morning: 1, afternoon: 1 },
    ),
    { assignments: [], complete: true },
  ),
  draft: makeDraft(
    COMPLETE_ASSIGNMENTS,
    [
      {
        topic: "coverage",
        text: "Na ranní směně ve všední den chybí proti požadavku jeden zaměstnanec.",
      },
      {
        topic: "other",
        text: "Bez dalšího zaměstnance nelze plné obsazení sestavit; návrh to přiznává a nabízí alternativu.",
      },
    ],
    [PARTIAL_ALTERNATIVE],
    [
      "Zaměstnanci jsou na plný úvazek.",
      "Požadavek je 3 ranní a 2 odpolední zaměstnanci ve všední den.",
    ],
  ),
};

const UNVERIFIED_SCENARIO: SimulatedScenario = {
  id: "unverified",
  label: "Neúplná historie",
  description:
    "Pokrytí je plné, ale historie před týdnem chybí. Validace proto nesmí tvrdit, že je plán ověřený.",
  expectedStatus: "not_verified",
  expectedCompleteness: "partial",
  expectedValidationStatus: "not_verified",
  input: buildInput(
    buildRequirements(
      { morning: 2, afternoon: 2 },
      { morning: 1, afternoon: 1 },
    ),
    { assignments: [], complete: false },
  ),
  draft: makeDraft(
    COMPLETE_ASSIGNMENTS,
    [
      {
        topic: "rest",
        text: "Předchozí týden není v historii úplný, proto odpočinek po šesti dnech nelze spolehlivě ověřit.",
      },
    ],
    [],
    [
      "Zaměstnanci jsou na plný úvazek.",
      "Historie před týdnem není úplná; odpočinek zůstává neověřený.",
    ],
  ),
};

export const SIMULATED_SCENARIOS: readonly SimulatedScenario[] = [
  COMPLETE_SCENARIO,
  PARTIAL_SCENARIO,
  UNVERIFIED_SCENARIO,
];

export function getSimulatedScenario(
  id: string,
): SimulatedScenario | undefined {
  return SIMULATED_SCENARIOS.find((scenario) => scenario.id === id);
}

export const SIMULATED_SCENARIO_SUMMARIES: readonly SimulatedScenarioSummary[] =
  SIMULATED_SCENARIOS.map(
    ({ id, label, description, expectedStatus, expectedCompleteness }) => ({
      id,
      label,
      description,
      expectedStatus,
      expectedCompleteness,
    }),
  );

/** Pomocník pro testy a UI: je datum ve fixture týdnu? */
export function isSimulatedWeek(date: IsoDate): boolean {
  return (
    date >= SIMULATED_WEEK_START &&
    date <= addDays(SIMULATED_WEEK_START, 6)
  );
}
