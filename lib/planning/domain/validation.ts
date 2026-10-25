import type { PlanProposal } from "../types";
import { CONFIRMED_PLANNING_RULES } from "./confirmed";
import {
  addDays,
  datesInWeek,
  formatDurationMinutes,
  getShiftInterval,
  isIsoDate,
  isLocalTime,
  isWeekendDate,
  timeToMinutes,
  weekdayIndex,
} from "./time";
import type {
  Absence,
  Employee,
  ExistingAssignment,
  IsoDate,
  PlanDraft,
  PlanValidationProblem,
  PlanValidationResult,
  PlanValidationUnverifiedCheck,
  PlanningInput,
  ProposedAssignment,
  ShiftDefinition,
  ShiftKind,
  ShiftWindow,
  StaffingRequirement,
} from "./types";

const SHIFT_KINDS: readonly ShiftKind[] = ["morning", "afternoon"];
const RULE_INPUT_SHAPE = "INPUT-SHAPE";
const RULE_INPUT_REFERENCES = "INPUT-REFERENCES";
const RULE_INPUT_COVERAGE = "INPUT-COVERAGE";
const RULE_UNKNOWN_ASSIGNMENT = "UNKNOWN-ASSIGNMENT";
const RULE_ASSIGNMENT_DUPLICATE = "ASSIGNMENT-DUPLICATE";
const RULE_COVERAGE = "COVERAGE-REQUIRED";
const RULE_OVERLAP = "ASSIGNMENT-OVERLAP";
const RULE_ABSENCE = "ABSENCE-APPROVED";
const RULE_REST = "REST-AFTER-SIX-DAYS";
const RULE_WEEKEND = "WEEKEND-TWO-DAYS-OFF";

const ASSUMPTION_WORKING_DAY =
  "Pracovní den pro pravidlo šesti dnů je kalendářní den s alespoň jednou směnou; přesný výklad je otevřený (OQ21).";
const ASSUMPTION_WEEKEND =
  "„Během týdne“ je vyhodnoceno jako pondělí–nedělí; dva dny volna se počítají jako libovolné dva dny, pokud nejsou po sobě jdoucí, výsledek je označen jako neověřený.";
const ASSUMPTION_BREAKS =
  "Validace používá hrubé časy začátku a konce směn; přestávky ani odpracovaná doba se nevyhodnocují (OQ24).";
const ASSUMPTION_REQUESTS =
  "Jako tvrdá překážka se používají jen schválené absence; požadavky a neschválené absence jsou pouze kontext (OQ22).";

interface ValidationState {
  readonly problems: PlanValidationProblem[];
  readonly unverifiedChecks: PlanValidationUnverifiedCheck[];
  readonly checkedRuleIds: Set<string>;
  readonly assumptions: Set<string>;
}

interface WorkDay {
  startMs: number;
  endMs: number;
}

/**
 * Deterministicky zkontroluje návrh týdenního rozpisu.
 *
 * Funkce návrh nikdy neopravuje ani nemění. Vrací tři stavy:
 * - `invalid` — alespoň jeden nález se závažností `error`;
 * - `not_verified` — bez chyb, ale některou kontrolu nešlo spolehlivě provést;
 * - `valid` — bez chyb i bez neověřených kontrol. Varování sama o sobě
 *   neznamenají neplatný plán, ale zůstávají ve výsledku.
 */
export function validatePlan(
  input: PlanningInput,
  proposal: PlanProposal<PlanDraft>,
): PlanValidationResult {
  const state = createState();
  const proposalId =
    proposal && typeof proposal.id === "string" && proposal.id.length > 0
      ? proposal.id
      : "unknown";
  const weekStart =
    input && typeof input.weekStart === "string" ? input.weekStart : "";

  if (!input || typeof input !== "object") {
    addUnverified(state, {
      code: "INPUT_MISSING",
      message: "Chybí vstup plánování; návrh nelze posoudit.",
    });
    return finalize(state, proposalId, weekStart);
  }

  if (
    !proposal ||
    typeof proposal !== "object" ||
    !proposal.plan ||
    typeof proposal.plan !== "object"
  ) {
    addUnverified(state, {
      code: "INPUT_MISSING",
      message: "Chybí návrh plánu; vstup nelze posoudit.",
    });
    return finalize(state, proposalId, weekStart);
  }

  if (!isIsoDate(input.weekStart) || weekdayIndex(input.weekStart) !== 0) {
    addUnverified(state, {
      code: "INPUT_WEEK_START_INVALID",
      message:
        "Začátek týdne musí být pondělí ve formátu YYYY-MM-DD; bez něj nelze plán posoudit.",
      details: { weekStart: input.weekStart },
    });
    return finalize(state, proposalId, weekStart);
  }

  if (typeof input.timeZone !== "string" || input.timeZone.trim() === "") {
    addUnverified(state, {
      code: "INPUT_TIME_ZONE_INVALID",
      message: "Chybí časová zóna; časové kontroly nelze spolehlivě provést.",
    });
    return finalize(state, proposalId, weekStart);
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: input.timeZone });
  } catch {
    addUnverified(state, {
      code: "INPUT_TIME_ZONE_INVALID",
      message: `Časová zóna "${input.timeZone}" není platná.`,
      details: { timeZone: input.timeZone },
    });
    return finalize(state, proposalId, weekStart);
  }

  markChecked(state, RULE_INPUT_SHAPE);
  state.assumptions.add(ASSUMPTION_BREAKS);
  state.assumptions.add(ASSUMPTION_REQUESTS);

  const employees = validateEmployees(input, state);
  const shiftDefinitions = validateShiftDefinitions(input, state);
  const staffingRequirements = validateStaffingRequirements(input, state);
  const absences = validateAbsences(input, employees, state);
  const history = validateHistory(input, employees, state);
  const rulesMatch = validateRules(input, state);
  const weekDates = datesInWeek(input.weekStart);
  const weekDateSet = new Set(weekDates);

  markChecked(state, RULE_INPUT_REFERENCES);

  const assignments = validateAssignments(
    input,
    proposal,
    employees,
    weekDateSet,
    state,
  );

  checkCoverage(
    staffingRequirements,
    assignments,
    weekDates,
    state,
  );

  checkOverlaps(
    assignments,
    shiftDefinitions,
    input.timeZone,
    state,
  );

  checkApprovedAbsences(
    assignments,
    absences,
    shiftDefinitions,
    state,
  );

  if (rulesMatch) {
    checkRest(
      input,
      assignments,
      history,
      shiftDefinitions,
      employees,
      state,
    );
    checkWeekendDaysOff(input, assignments, weekDates, state);
  }

  return finalize(state, proposalId, input.weekStart);
}

function createState(): ValidationState {
  return {
    problems: [],
    unverifiedChecks: [],
    checkedRuleIds: new Set<string>(),
    assumptions: new Set<string>(),
  };
}

function finalize(
  state: ValidationState,
  proposalId: string,
  weekStart: IsoDate,
): PlanValidationResult {
  const hasError = state.problems.some((problem) => problem.severity === "error");
  const status = hasError
    ? "invalid"
    : state.unverifiedChecks.length > 0
      ? "not_verified"
      : "valid";

  return {
    status,
    weekStart,
    proposalId,
    problems: state.problems,
    unverifiedChecks: state.unverifiedChecks,
    checkedRuleIds: [...state.checkedRuleIds],
    assumptions: [...state.assumptions],
  };
}

function addProblem(
  state: ValidationState,
  problem: PlanValidationProblem,
): void {
  state.problems.push(problem);
}

function addUnverified(
  state: ValidationState,
  check: PlanValidationUnverifiedCheck,
): void {
  state.unverifiedChecks.push(check);
}

function markChecked(state: ValidationState, ruleId: string): void {
  state.checkedRuleIds.add(ruleId);
}

function validateEmployees(
  input: PlanningInput,
  state: ValidationState,
): Map<string, Employee> {
  const employees = new Map<string, Employee>();
  if (!Array.isArray(input.employees)) {
    addUnverified(state, {
      code: "INPUT_EMPLOYEE_INVALID",
      message: "Seznam zaměstnanců chybí nebo nemá správný tvar.",
    });
    return employees;
  }

  for (const employee of input.employees) {
    if (
      !employee ||
      typeof employee !== "object" ||
      typeof employee.id !== "string" ||
      employee.id.length === 0
    ) {
      addUnverified(state, {
        code: "INPUT_EMPLOYEE_INVALID",
        message: "Zaměstnanec nemá platný technický identifikátor.",
      });
      continue;
    }

    if (employees.has(employee.id)) {
      addUnverified(state, {
        code: "INPUT_EMPLOYEE_DUPLICATE",
        employeeId: employee.id,
        message: `Zaměstnanec "${employee.id}" je ve vstupu uveden vícekrát.`,
      });
      continue;
    }

    employees.set(employee.id, employee);

    if (
      (employee as { employmentType?: unknown }).employmentType !== "full_time"
    ) {
      addUnverified(state, {
        code: "INPUT_EMPLOYMENT_TYPE_UNSUPPORTED",
        employeeId: employee.id,
        message: `Zaměstnanec "${employee.id}" nemá podporovaný plný úvazek.`,
      });
    }
  }

  return employees;
}

function validateShiftDefinitions(
  input: PlanningInput,
  state: ValidationState,
): ShiftDefinition[] {
  const definitions: ShiftDefinition[] = [];
  if (!Array.isArray(input.shiftDefinitions)) {
    addUnverified(state, {
      code: "INPUT_SHIFT_DEFINITION_INVALID",
      message: "Definice směn chybí nebo nemají správný tvar.",
    });
    return definitions;
  }

  for (const kind of SHIFT_KINDS) {
    const definition = input.shiftDefinitions.find(
      (item) => item && item.kind === kind,
    );
    if (!definition || !isShiftDefinition(definition)) {
      addUnverified(state, {
        code: "INPUT_SHIFT_DEFINITION_INVALID",
        shiftKind: kind,
        message: `Definice směny "${kind}" chybí nebo nemá platné časy.`,
      });
      continue;
    }
    definitions.push(definition);
  }

  return definitions;
}

function validateStaffingRequirements(
  input: PlanningInput,
  state: ValidationState,
): Map<string, StaffingRequirement | null> {
  const requirements = new Map<string, StaffingRequirement | null>();
  if (!Array.isArray(input.staffingRequirements)) {
    addUnverified(state, {
      code: "INPUT_STAFFING_REQUIREMENT_INVALID",
      message: "Potřebné obsazení chybí nebo nemá správný tvar.",
    });
    return requirements;
  }

  for (const requirement of input.staffingRequirements) {
    if (!isStaffingRequirement(requirement)) {
      addUnverified(state, {
        code: "INPUT_STAFFING_REQUIREMENT_INVALID",
        message: "Požadavek na obsazení nemá platný den, směnu nebo počet.",
      });
      continue;
    }

    if (
      requirement.date < input.weekStart ||
      requirement.date > addDays(input.weekStart, 6)
    ) {
      addUnverified(state, {
        code: "INPUT_STAFFING_REQUIREMENT_INVALID",
        date: requirement.date,
        shiftKind: requirement.shiftKind,
        message: `Požadavek na obsazení ${requirement.date} je mimo plánovaný týden.`,
      });
      continue;
    }

    const key = slotKey(requirement.date, requirement.shiftKind);
    if (requirements.has(key)) {
      requirements.set(key, null);
      addUnverified(state, {
        code: "INPUT_STAFFING_REQUIREMENT_DUPLICATE",
        date: requirement.date,
        shiftKind: requirement.shiftKind,
        message: `Pro ${requirement.date} a směnu "${requirement.shiftKind}" existuje více požadavků.`,
      });
      continue;
    }

    requirements.set(key, requirement);
  }

  return requirements;
}

function validateAbsences(
  input: PlanningInput,
  employees: ReadonlyMap<string, Employee>,
  state: ValidationState,
): Absence[] {
  const absences: Absence[] = [];
  if (!Array.isArray(input.absences)) {
    addUnverified(state, {
      code: "INPUT_ABSENCE_INVALID",
      message: "Absence chybí nebo nemají správný tvar; kontrolu absencí nelze provést.",
    });
    return absences;
  }

  for (const absence of input.absences) {
    if (!isAbsence(absence) || !employees.has(absence.employeeId)) {
      addUnverified(state, {
        code: "INPUT_ABSENCE_INVALID",
        message: "Absence nemá platný zaměstnanec, rozsah nebo stav.",
        ...(isRecord(absence) && typeof absence.employeeId === "string"
          ? { employeeId: absence.employeeId }
          : {}),
      });
      continue;
    }
    absences.push(absence);
  }

  return absences;
}

function validateHistory(
  input: PlanningInput,
  employees: ReadonlyMap<string, Employee>,
  state: ValidationState,
): { readonly assignments: readonly ExistingAssignment[]; readonly complete: boolean } {
  const history = input.history;
  if (history === undefined) {
    return { assignments: [], complete: false };
  }

  if (
    !isRecord(history) ||
    !Array.isArray(history.assignments) ||
    typeof history.complete !== "boolean"
  ) {
    addUnverified(state, {
      code: "INPUT_HISTORY_INVALID",
      message: "Historie před začátkem týdne nemá správný tvar.",
    });
    return { assignments: [], complete: false };
  }

  const assignments: ExistingAssignment[] = [];
  let complete = history.complete;

  for (const assignment of history.assignments) {
    if (
      !isExistingAssignment(assignment) ||
      !employees.has(assignment.employeeId)
    ) {
      addUnverified(state, {
        code: "INPUT_HISTORY_INVALID",
        message: "Historie obsahuje neplatné nebo neznámé přiřazení.",
      });
      complete = false;
      continue;
    }

    if (assignment.date >= input.weekStart) {
      addUnverified(state, {
        code: "INPUT_HISTORY_INVALID",
        date: assignment.date,
        shiftKind: assignment.shiftKind,
        message: "Historie musí obsahovat pouze dny před začátkem plánovaného týdne.",
      });
      complete = false;
      continue;
    }

    assignments.push(assignment);
  }

  return { assignments, complete };
}

function validateRules(input: PlanningInput, state: ValidationState): boolean {
  const rules = input.rules;
  const matches =
    !!rules &&
    rules.consecutiveWorkingDaysBeforeLongRest ===
      CONFIRMED_PLANNING_RULES.consecutiveWorkingDaysBeforeLongRest &&
    rules.longRestHours === CONFIRMED_PLANNING_RULES.longRestHours &&
    rules.weekendWorkDaysOff === CONFIRMED_PLANNING_RULES.weekendWorkDaysOff;

  if (!matches) {
    addUnverified(state, {
      code: "INPUT_RULES_MISMATCH",
      message:
        "Vstupní pravidla neodpovídají potvrzeným pravidlům; odpočinek a víkendové dny volna nelze spolehlivě ověřit.",
    });
  }

  return matches;
}

function validateAssignments(
  input: PlanningInput,
  proposal: PlanProposal<PlanDraft>,
  employees: ReadonlyMap<string, Employee>,
  weekDateSet: ReadonlySet<IsoDate>,
  state: ValidationState,
): ProposedAssignment[] {
  const plan = proposal.plan;
  if (!Array.isArray(plan.assignments)) {
    addProblem(state, {
      code: "PROPOSAL_INVALID",
      severity: "error",
      message: "Návrh neobsahuje pole přiřazení.",
    });
    return [];
  }

  if (plan.weekStart !== input.weekStart) {
    addProblem(state, {
      code: "PROPOSAL_WEEK_MISMATCH",
      severity: "error",
      message: `Návrh je pro týden "${plan.weekStart}", ale vstup pro "${input.weekStart}".`,
      details: {
        proposalWeekStart: String(plan.weekStart),
        inputWeekStart: input.weekStart,
      },
    });
  }

  const assignments: ProposedAssignment[] = [];
  const seen = new Set<string>();

  for (const assignment of plan.assignments) {
    if (!isProposedAssignmentShape(assignment)) {
      addProblem(state, {
        code: "ASSIGNMENT_INVALID",
        severity: "error",
        message: "Návrh obsahuje přiřazení bez platného zaměstnance, data nebo směny.",
      });
      continue;
    }

    if (!isIsoDate(assignment.date)) {
      addProblem(state, {
        code: "ASSIGNMENT_INVALID",
        severity: "error",
        employeeId: assignment.employeeId,
        message: `Přiřazení má neplatné datum "${assignment.date}".`,
      });
      continue;
    }

    if (!employees.has(assignment.employeeId)) {
      addProblem(state, {
        code: "ASSIGNMENT_UNKNOWN_EMPLOYEE",
        severity: "error",
        employeeId: assignment.employeeId,
        date: assignment.date,
        message: `Přiřazení odkazuje na neznámého zaměstnance "${assignment.employeeId}".`,
      });
      continue;
    }

    if (!isShiftKind(assignment.shiftKind)) {
      addProblem(state, {
        code: "ASSIGNMENT_UNKNOWN_SHIFT",
        severity: "error",
        employeeId: assignment.employeeId,
        date: assignment.date,
        message: `Přiřazení obsahuje neznámou směnu "${assignment.shiftKind}".`,
      });
      continue;
    }

    if (!weekDateSet.has(assignment.date)) {
      addProblem(state, {
        code: "ASSIGNMENT_OUTSIDE_WEEK",
        severity: "error",
        employeeId: assignment.employeeId,
        date: assignment.date,
        shiftKind: assignment.shiftKind,
        message: `Přiřazení ${assignment.date} nepatří do plánovaného týdne.`,
      });
      continue;
    }

    const normalized: ProposedAssignment = {
      employeeId: assignment.employeeId,
      date: assignment.date,
      shiftKind: assignment.shiftKind,
    };
    const key = assignmentKey(normalized);
    if (seen.has(key)) {
      addProblem(state, {
        code: "ASSIGNMENT_DUPLICATE",
        severity: "error",
        employeeId: normalized.employeeId,
        date: normalized.date,
        shiftKind: normalized.shiftKind,
        message: `Zaměstnanec "${normalized.employeeId}" je na směně ${normalized.date} "${normalized.shiftKind}" uveden vícekrát.`,
      });
      continue;
    }

    seen.add(key);
    assignments.push(normalized);
  }

  markChecked(state, RULE_UNKNOWN_ASSIGNMENT);
  markChecked(state, RULE_ASSIGNMENT_DUPLICATE);
  return assignments;
}

function checkCoverage(
  requirements: ReadonlyMap<string, StaffingRequirement | null>,
  assignments: readonly ProposedAssignment[],
  weekDates: readonly IsoDate[],
  state: ValidationState,
): void {
  const assignmentsBySlot = new Map<string, ProposedAssignment[]>();
  for (const assignment of assignments) {
    const key = slotKey(assignment.date, assignment.shiftKind);
    const list = assignmentsBySlot.get(key) ?? [];
    list.push(assignment);
    assignmentsBySlot.set(key, list);
  }

  markChecked(state, RULE_INPUT_COVERAGE);

  for (const date of weekDates) {
    for (const shiftKind of SHIFT_KINDS) {
      const key = slotKey(date, shiftKind);
      const requirement = requirements.get(key);
      const assigned = assignmentsBySlot.get(key)?.length ?? 0;

      if (requirement === undefined) {
        addUnverified(state, {
          code: "COVERAGE_REQUIREMENT_MISSING",
          date,
          shiftKind,
          message: `Chybí požadavek na obsazení ${date} "${shiftKind}"; pokrytí nelze ověřit.`,
          details: { assignedEmployees: assigned },
        });
        continue;
      }

      if (requirement === null) {
        continue;
      }

      markChecked(state, RULE_COVERAGE);

      if (assigned < requirement.requiredEmployees) {
        const missingEmployees = requirement.requiredEmployees - assigned;
        addProblem(state, {
          code: "COVERAGE_UNDERSTAFFED",
          severity: "error",
          date,
          shiftKind,
          message: `Na směně ${date} "${shiftKind}" chybí ${missingEmployees} zaměstnanců (požadováno ${requirement.requiredEmployees}, přiřazeno ${assigned}).`,
          details: {
            requiredEmployees: requirement.requiredEmployees,
            assignedEmployees: assigned,
            missingEmployees,
          },
        });
      } else if (assigned > requirement.requiredEmployees) {
        const extraEmployees = assigned - requirement.requiredEmployees;
        addProblem(state, {
          code: "COVERAGE_OVERSTAFFED",
          severity: "warning",
          date,
          shiftKind,
          message: `Na směně ${date} "${shiftKind}" je ${extraEmployees} zaměstnanců navíc (požadováno ${requirement.requiredEmployees}, přiřazeno ${assigned}).`,
          details: {
            requiredEmployees: requirement.requiredEmployees,
            assignedEmployees: assigned,
            extraEmployees,
          },
        });
      }
    }
  }
}

function checkOverlaps(
  assignments: readonly ProposedAssignment[],
  definitions: readonly ShiftDefinition[],
  timeZone: string,
  state: ValidationState,
): void {
  if (definitions.length === 0) {
    addUnverified(state, {
      code: "OVERLAP_INTERVAL_UNAVAILABLE",
      message: "Bez platných definic směn nelze překryvy spolehlivě ověřit.",
    });
    return;
  }

  const byEmployee = new Map<
    string,
    { assignment: ProposedAssignment; startMs: number; endMs: number }[]
  >();

  for (const assignment of assignments) {
    try {
      const interval = getShiftInterval(
        assignment.date,
        assignment.shiftKind,
        definitions,
        timeZone,
      );
      const list = byEmployee.get(assignment.employeeId) ?? [];
      list.push({
        assignment,
        startMs: interval.startMs,
        endMs: interval.endMs,
      });
      byEmployee.set(assignment.employeeId, list);
    } catch {
      addUnverified(state, {
        code: "OVERLAP_INTERVAL_UNAVAILABLE",
        employeeId: assignment.employeeId,
        date: assignment.date,
        shiftKind: assignment.shiftKind,
        message: `Časový interval směny ${assignment.date} "${assignment.shiftKind}" nelze spočítat.`,
      });
    }
  }

  for (const [employeeId, intervals] of byEmployee) {
    intervals.sort(
      (left, right) =>
        left.startMs - right.startMs || left.endMs - right.endMs,
    );

    if (intervals.length > 1) {
      markChecked(state, RULE_OVERLAP);
    }

    let current = intervals[0];
    for (let index = 1; index < intervals.length; index += 1) {
      const next = intervals[index];
      if (!current || !next) continue;

      if (next.startMs < current.endMs) {
        const overlapMinutes = Math.max(
          0,
          Math.round(
            (Math.min(current.endMs, next.endMs) - next.startMs) / 60_000,
          ),
        );
        addProblem(state, {
          code: "SHIFT_OVERLAP",
          severity: "error",
          employeeId,
          date: next.assignment.date,
          shiftKind: next.assignment.shiftKind,
          message: `Zaměstnanec "${employeeId}" má překryv směn ${current.assignment.date} "${current.assignment.shiftKind}" a ${next.assignment.date} "${next.assignment.shiftKind}" (${overlapMinutes} min).`,
          details: {
            otherDate: current.assignment.date,
            otherShiftKind: current.assignment.shiftKind,
            overlapMinutes,
          },
        });
      }

      if (next.endMs > current.endMs) {
        current = next;
      }
    }
  }
}

function checkApprovedAbsences(
  assignments: readonly ProposedAssignment[],
  absences: readonly Absence[],
  definitions: readonly ShiftDefinition[],
  state: ValidationState,
): void {
  const approved = absences.filter((absence) => absence.status === "approved");
  let checked = false;

  for (const assignment of assignments) {
    const dates = datesTouchedByAssignment(assignment, definitions);
    const absence = approved.find(
      (candidate) =>
        candidate.employeeId === assignment.employeeId &&
        dates.some((date) => date >= candidate.from && date <= candidate.to),
    );

    checked = true;
    if (!absence) continue;

    addProblem(state, {
      code: "ABSENCE_APPROVED",
      severity: "error",
      employeeId: assignment.employeeId,
      date: assignment.date,
      shiftKind: assignment.shiftKind,
      message: `Zaměstnanec "${assignment.employeeId}" je přiřazen na směnu ${assignment.date} "${assignment.shiftKind}", ale má schválenou absenci ${absence.from}–${absence.to}.`,
      details: {
        absenceId: absence.id,
        absenceFrom: absence.from,
        absenceTo: absence.to,
      },
    });
  }

  if (checked) {
    markChecked(state, RULE_ABSENCE);
  }
}

function checkRest(
  input: PlanningInput,
  assignments: readonly ProposedAssignment[],
  history: { readonly assignments: readonly ExistingAssignment[]; readonly complete: boolean },
  definitions: readonly ShiftDefinition[],
  employees: ReadonlyMap<string, Employee>,
  state: ValidationState,
): void {
  const firstProposalDate = new Map<string, IsoDate>();
  for (const assignment of assignments) {
    const current = firstProposalDate.get(assignment.employeeId);
    if (!current || assignment.date < current) {
      firstProposalDate.set(assignment.employeeId, assignment.date);
    }
  }

  if (definitions.length === 0) {
    addUnverified(state, {
      code: "REST_INTERVAL_UNAVAILABLE",
      message: "Bez platných definic směn nelze odpočinek po šesti dnech ověřit.",
    });
    return;
  }

  state.assumptions.add(ASSUMPTION_WORKING_DAY);
  let fullyChecked = false;

  for (const employeeId of employees.keys()) {
    const firstDate = firstProposalDate.get(employeeId);
    if (!firstDate) continue;

    if (!history.complete && weekdayIndex(firstDate) <= 4) {
      addUnverified(state, {
        code: "REST_HISTORY_INCOMPLETE",
        employeeId,
        date: firstDate,
        message: `Pro zaměstnance "${employeeId}" chybí úplná historie před ${input.weekStart}; pravidlo 35 h odpočinku nelze spolehlivě ověřit.`,
        details: { weekStart: input.weekStart },
      });
      continue;
    }

    const workDays = new Map<IsoDate, WorkDay>();
    let intervalUnavailable = false;

    const addWorkDay = (assignment: ExistingAssignment | ProposedAssignment) => {
      try {
        const interval = getShiftInterval(
          assignment.date,
          assignment.shiftKind,
          definitions,
          input.timeZone,
        );
        const existing = workDays.get(assignment.date);
        if (existing) {
          existing.startMs = Math.min(existing.startMs, interval.startMs);
          existing.endMs = Math.max(existing.endMs, interval.endMs);
        } else {
          workDays.set(assignment.date, {
            startMs: interval.startMs,
            endMs: interval.endMs,
          });
        }
      } catch {
        intervalUnavailable = true;
      }
    };

    for (const assignment of history.assignments) {
      if (assignment.employeeId === employeeId) addWorkDay(assignment);
    }
    for (const assignment of assignments) {
      if (assignment.employeeId === employeeId) addWorkDay(assignment);
    }

    if (intervalUnavailable) {
      addUnverified(state, {
        code: "REST_INTERVAL_UNAVAILABLE",
        employeeId,
        message: `Některou směnu zaměstnance "${employeeId}" nelze časově vyhodnotit; odpočinek nelze spolehlivě ověřit.`,
      });
      continue;
    }

    const dates = [...workDays.keys()].sort();
    if (dates.length === 0) continue;

    const runs: IsoDate[][] = [];
    let run: IsoDate[] = [];
    for (const date of dates) {
      const last = run[run.length - 1];
      if (!last || addDays(last, 1) === date) {
        run.push(date);
      } else {
        runs.push(run);
        run = [date];
      }
    }
    if (run.length > 0) runs.push(run);

    for (const runDates of runs) {
      if (runDates.length < 6) continue;

      const sixthDate = runDates[5];
      if (!sixthDate) continue;
      const sixthDay = workDays.get(sixthDate);
      if (!sixthDay) continue;

      const nextDate =
        runDates[6] ?? dates.find((date) => date > sixthDate);
      if (!nextDate) continue;
      const nextDay = workDays.get(nextDate);
      if (!nextDay) continue;

      const restMs = nextDay.startMs - sixthDay.endMs;
      const requiredMs =
        CONFIRMED_PLANNING_RULES.longRestHours * 60 * 60 * 1_000;
      if (restMs >= requiredMs) continue;

      const runTouchesWeek = runDates.some(
        (date) => date >= input.weekStart,
      );
      if (!runTouchesWeek && nextDate < input.weekStart) continue;

      const restMinutes = Math.max(0, Math.floor(restMs / 60_000));
      addProblem(state, {
        code: "REST_AFTER_SIX_DAYS",
        severity: "error",
        employeeId,
        date: sixthDate,
        message: `Po šesti po sobě jdoucích pracovních dnech následuje jen ${formatDurationMinutes(restMinutes)} odpočinku před směnou ${nextDate}; požadováno je ${CONFIRMED_PLANNING_RULES.longRestHours} h.`,
        details: {
          sixthDate,
          nextDate,
          restMinutes,
          requiredMinutes: CONFIRMED_PLANNING_RULES.longRestHours * 60,
        },
      });
    }

    fullyChecked = true;
  }

  if (fullyChecked) {
    markChecked(state, RULE_REST);
  }
}

function checkWeekendDaysOff(
  input: PlanningInput,
  assignments: readonly ProposedAssignment[],
  weekDates: readonly IsoDate[],
  state: ValidationState,
): void {
  const byEmployee = new Map<string, ProposedAssignment[]>();
  for (const assignment of assignments) {
    const list = byEmployee.get(assignment.employeeId) ?? [];
    list.push(assignment);
    byEmployee.set(assignment.employeeId, list);
  }

  let checked = false;

  for (const [employeeId, employeeAssignments] of byEmployee) {
    const weekendAssignments = employeeAssignments.filter((assignment) =>
      isWeekendDate(assignment.date),
    );
    if (weekendAssignments.length === 0) continue;

    state.assumptions.add(ASSUMPTION_WEEKEND);
    checked = true;

    const assignedDates = new Set(
      employeeAssignments.map((assignment) => assignment.date),
    );
    const offDays = weekDates.filter((date) => !assignedDates.has(date));

    if (offDays.length < CONFIRMED_PLANNING_RULES.weekendWorkDaysOff) {
      const firstWeekendDate = weekendAssignments[0]?.date;
      addProblem(state, {
        code: "WEEKEND_TWO_DAYS_OFF",
        severity: "error",
        employeeId,
        ...(firstWeekendDate ? { date: firstWeekendDate } : {}),
        message: `Zaměstnanec "${employeeId}" pracuje o víkendu, ale má jen ${offDays.length} dny volna v týdnu; požadovány jsou ${CONFIRMED_PLANNING_RULES.weekendWorkDaysOff}.`,
        details: {
          offDays: offDays.length,
          requiredDaysOff: CONFIRMED_PLANNING_RULES.weekendWorkDaysOff,
          weekendDates: weekendAssignments
            .map((assignment) => assignment.date)
            .join(", "),
        },
      });
      continue;
    }

    if (!hasConsecutiveDays(offDays)) {
      addUnverified(state, {
        code: "WEEKEND_DAYS_OFF_INTERPRETATION",
        employeeId,
        date: weekendAssignments[0]?.date,
        message: `Zaměstnanec "${employeeId}" má dva dny volna, ale ne po sobě jdoucí; zda to pravidlo vyžaduje, není potvrzené.`,
        details: {
          offDays: offDays.join(", "),
          requiredDaysOff: CONFIRMED_PLANNING_RULES.weekendWorkDaysOff,
        },
      });
    }
  }

  if (checked) {
    markChecked(state, RULE_WEEKEND);
  }
}

function datesTouchedByAssignment(
  assignment: ProposedAssignment,
  definitions: readonly ShiftDefinition[],
): IsoDate[] {
  const definition = definitions.find(
    (candidate) => candidate.kind === assignment.shiftKind,
  );
  if (!definition) return [assignment.date];

  const window = isWeekendDate(assignment.date)
    ? definition.weekend
    : definition.weekday;

  return timeToMinutes(window.end) <= timeToMinutes(window.start)
    ? [assignment.date, addDays(assignment.date, 1)]
    : [assignment.date];
}

function hasConsecutiveDays(dates: readonly IsoDate[]): boolean {
  for (let index = 1; index < dates.length; index += 1) {
    const previous = dates[index - 1];
    const current = dates[index];
    if (previous && current && addDays(previous, 1) === current) {
      return true;
    }
  }
  return false;
}

function slotKey(date: IsoDate, shiftKind: ShiftKind): string {
  return `${date}|${shiftKind}`;
}

function assignmentKey(assignment: ProposedAssignment): string {
  return `${assignment.employeeId}|${assignment.date}|${assignment.shiftKind}`;
}

function isShiftKind(value: unknown): value is ShiftKind {
  return value === "morning" || value === "afternoon";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isShiftWindow(value: unknown): value is ShiftWindow {
  if (!isRecord(value)) return false;
  if (!isLocalTime(value.start) || !isLocalTime(value.end)) return false;
  return timeToMinutes(value.start) !== timeToMinutes(value.end);
}

function isShiftDefinition(value: unknown): value is ShiftDefinition {
  if (!isRecord(value)) return false;
  return (
    isShiftKind(value.kind) &&
    isShiftWindow(value.weekday) &&
    isShiftWindow(value.weekend)
  );
}

function isStaffingRequirement(
  value: unknown,
): value is StaffingRequirement {
  if (!isRecord(value)) return false;
  return (
    isIsoDate(value.date) &&
    isShiftKind(value.shiftKind) &&
    typeof value.requiredEmployees === "number" &&
    Number.isInteger(value.requiredEmployees) &&
    value.requiredEmployees >= 0
  );
}

function isAbsence(value: unknown): value is Absence {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || value.id.length === 0) return false;
  if (typeof value.employeeId !== "string" || value.employeeId.length === 0) {
    return false;
  }
  if (!isIsoDate(value.from) || !isIsoDate(value.to)) return false;
  if (value.from > value.to) return false;
  if (
    value.type !== "vacation" &&
    value.type !== "sick" &&
    value.type !== "other"
  ) {
    return false;
  }
  return (
    value.status === "approved" ||
    value.status === "pending" ||
    value.status === "rejected"
  );
}

function isExistingAssignment(value: unknown): value is ExistingAssignment {
  if (!isRecord(value)) return false;
  return (
    typeof value.employeeId === "string" &&
    value.employeeId.length > 0 &&
    isIsoDate(value.date) &&
    isShiftKind(value.shiftKind)
  );
}

function isProposedAssignmentShape(
  value: unknown,
): value is {
  readonly employeeId: string;
  readonly date: string;
  readonly shiftKind: string;
} {
  if (!isRecord(value)) return false;
  return (
    typeof value.employeeId === "string" &&
    value.employeeId.length > 0 &&
    typeof value.date === "string" &&
    typeof value.shiftKind === "string"
  );
}
