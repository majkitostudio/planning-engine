import type { PlanProposal } from "./types";
import {
  validatePlan,
  validateReplacementRequest,
  type AssignmentChange,
  type ConfirmedPlan,
  type CoverageLine,
  type PlanDraft,
  type PlanningInput,
  type ProposedAssignment,
  type ReplacementDraft,
  type ReplacementImpact,
  type ReplacementOption,
  type ReplacementRequest,
  type ReplacementRunResult,
  type ShiftKind,
} from "./domain";

const REPLACEMENT_MINIMUM_STAFFING: Record<ShiftKind, number> = {
  morning: 15,
  afternoon: 7,
};

/**
 * Připraví všechny AI varianty a jejich deterministicky dopočítaný výsledek.
 *
 * `basePlan` je jediný zdroj původního rozpisu. AI dodává pouze výsledné
 * přiřazení varianty; platnost, změny, pokrytí a dopad se počítají zde.
 */
export function createReplacementOptions(
  input: PlanningInput,
  basePlan: ConfirmedPlan,
  request: ReplacementRequest,
  drafts: readonly ReplacementDraft[],
): ReplacementRunResult {
  const requestValidation = validateReplacementRequest(input, basePlan, request);
  if (requestValidation.status === "invalid") {
    return {
      request,
      basePlan,
      options: [],
      selectedOptionId: null,
      completeness: "partial",
      status: "needs_changes",
      confirmed: false,
    };
  }

  const uniqueDrafts = deduplicateDrafts(drafts);
  const options = uniqueDrafts.map((draft) =>
    evaluateReplacementOption(input, basePlan, request, draft),
  );
  const completeness = uniqueDrafts.length >= 3 ? "complete" : "partial";
  const status = replacementRunStatus(options);

  return {
    request,
    basePlan,
    options,
    selectedOptionId: null,
    completeness,
    status,
    confirmed: false,
  };
}

/** Vyhodnotí jednu variantu nad celým výsledným týdnem. */
export function evaluateReplacementOption(
  input: PlanningInput,
  basePlan: ConfirmedPlan,
  request: ReplacementRequest,
  draft: ReplacementDraft,
): ReplacementOption {
  const assignments = removeIncidentAssignment(draft.assignments, request);
  const validationInput = withReplacementMinimum(input, request);
  const proposal: PlanProposal<PlanDraft> = {
    id: `replacement-${draft.id}`,
    source: { kind: "ai", note: "replacement-simulated" },
    plan: {
      weekStart: input.weekStart,
      assignments,
      explanations: [
        {
          topic: "assignment",
          text: draft.rationale,
          employeeIds: [draft.candidateEmployeeId],
          dates: [request.incident.date],
          shiftKinds: [request.incident.shiftKind],
        },
      ],
      alternatives: [],
      assumptions: [],
    },
  };
  const baseValidation = validatePlan(validationInput, proposal);
  const changes = computeChanges(basePlan.assignments, assignments);
  const coverage = computeCoverage(validationInput, assignments);
  const impact = computeImpact(
    changes,
    request,
    input,
    draft.candidateEmployeeId,
  );
  const validation = applyReplacementChecks(
    baseValidation,
    validationInput,
    assignments,
  );

  return {
    id: draft.id,
    requestId: request.id,
    draft,
    changes,
    coverage,
    impact,
    validation,
    status: validation.status,
  };
}

function withReplacementMinimum(
  input: PlanningInput,
  request: ReplacementRequest,
): PlanningInput {
  const targetRequirement = input.staffingRequirements.find(
    (requirement) =>
      requirement.date === request.incident.date &&
      requirement.shiftKind === request.incident.shiftKind,
  );
  const minimumRequirement = {
    date: request.incident.date,
    shiftKind: request.incident.shiftKind,
    requiredEmployees: Math.max(
      REPLACEMENT_MINIMUM_STAFFING[request.incident.shiftKind],
      targetRequirement?.requiredEmployees ?? 0,
    ),
  };

  const staffingRequirements = targetRequirement
    ? input.staffingRequirements.map((requirement) =>
        requirement.date === minimumRequirement.date &&
        requirement.shiftKind === minimumRequirement.shiftKind
          ? minimumRequirement
          : requirement,
      )
    : [...input.staffingRequirements, minimumRequirement];

  return { ...input, staffingRequirements };
}

function removeIncidentAssignment(
  assignments: readonly ProposedAssignment[],
  request: ReplacementRequest,
): readonly ProposedAssignment[] {
  return assignments.filter(
    (assignment) =>
      !(
        assignment.employeeId === request.incident.absentEmployeeId &&
        assignment.date === request.incident.date &&
        assignment.shiftKind === request.incident.shiftKind
      ),
  );
}

function computeChanges(
  baseAssignments: readonly ProposedAssignment[],
  proposedAssignments: readonly ProposedAssignment[],
): readonly AssignmentChange[] {
  const baseKeys = new Set(baseAssignments.map(assignmentKey));
  const proposedKeys = new Set(proposedAssignments.map(assignmentKey));
  const changes: AssignmentChange[] = [];

  for (const assignment of proposedAssignments) {
    changes.push({
      type: baseKeys.has(assignmentKey(assignment)) ? "unchanged" : "added",
      assignment,
    });
  }
  for (const assignment of baseAssignments) {
    if (!proposedKeys.has(assignmentKey(assignment))) {
      changes.push({ type: "removed", assignment });
    }
  }

  return changes;
}

function computeCoverage(
  input: PlanningInput,
  assignments: readonly ProposedAssignment[],
): readonly CoverageLine[] {
  const assignedBySlot = new Map<string, number>();
  for (const assignment of assignments) {
    const key = `${assignment.date}|${assignment.shiftKind}`;
    assignedBySlot.set(key, (assignedBySlot.get(key) ?? 0) + 1);
  }

  return input.staffingRequirements.map((requirement) => {
    const assignedEmployees =
      assignedBySlot.get(`${requirement.date}|${requirement.shiftKind}`) ?? 0;
    return {
      date: requirement.date,
      shiftKind: requirement.shiftKind,
      requiredEmployees: requirement.requiredEmployees,
      assignedEmployees,
      missingEmployees: Math.max(
        0,
        requirement.requiredEmployees - assignedEmployees,
      ),
    };
  });
}

function computeImpact(
  changes: readonly AssignmentChange[],
  request: ReplacementRequest,
  input: PlanningInput,
  candidateEmployeeId: string,
): ReplacementImpact {
  const changed = changes.filter((change) => change.type !== "unchanged");
  const secondaryChanges = changed.filter(
    (change) =>
      change.assignment.employeeId !== request.incident.absentEmployeeId &&
      change.assignment.employeeId !== candidateEmployeeId,
  );
  const affectedEmployeeIds = [
    ...new Set(
      secondaryChanges
        .map((change) => change.assignment.employeeId)
    ),
  ];
  const dominoChain: ProposedAssignment[] = [];
  const chainEmployeeIds = new Set<string>();
  for (const change of secondaryChanges) {
    const employeeId = change.assignment.employeeId;
    if (!chainEmployeeIds.has(employeeId)) {
      chainEmployeeIds.add(employeeId);
      dominoChain.push(change.assignment);
    }
  }
  const changedDates = [
    ...new Set(changed.map((change) => change.assignment.date)),
  ];
  const timeOffChanges = changed
    .filter((change) => change.type === "added")
    .flatMap((change) => timeOffChangeFor(input, change.assignment));
  const unverifiedReasons = timeOffChanges.length > 0
    ? [
        "Varianta zasahuje do potvrzeného volna; přesun nebo zrušení volna vyžaduje samostatné potvrzení a není automaticky právně ani HR ověřené.",
      ]
    : [];

  return {
    kind:
      timeOffChanges.length > 0
        ? "confirmed_time_off_change"
        : affectedEmployeeIds.length > 1
        ? "domino"
        : affectedEmployeeIds.length === 1
          ? "secondary_changes"
          : "none",
    affectedEmployeeIds,
    changedDates,
    dominoChain,
    timeOffChanges,
    unverifiedReasons,
  };
}

function applyReplacementChecks(
  validation: ReturnType<typeof validatePlan>,
  input: PlanningInput,
  assignments: readonly ProposedAssignment[],
): ReturnType<typeof validatePlan> {
  const problems = [...validation.problems];
  const unverifiedChecks = [...validation.unverifiedChecks];

  const confirmedTimeOffAssignments = assignments.filter((assignment) =>
    input.requests.some(
      (request) =>
        request.employeeId === assignment.employeeId &&
        request.date === assignment.date &&
        request.kind === "day_off" &&
        request.status === "approved",
    ),
  );

  for (const assignment of confirmedTimeOffAssignments) {
    unverifiedChecks.push({
      code: "REPLACEMENT_CONFIRMED_TIME_OFF",
      message: `Přiřazení ${assignment.employeeId} na ${assignment.date} zasahuje do schváleného plánovaného volna; změnu nelze potvrdit bez samostatného rozhodnutí.`,
      employeeId: assignment.employeeId,
      date: assignment.date,
      shiftKind: assignment.shiftKind,
    });
  }

  if (input.replacementLimits) {
    const missingLimits = [
      input.replacementLimits.maxHoursPerWeek === undefined
        ? "maxHoursPerWeek"
        : null,
      input.replacementLimits.maxShiftsPerWeek === undefined
        ? "maxShiftsPerWeek"
        : null,
    ].filter((value): value is string => value !== null);

    if (missingLimits.length > 0) {
      unverifiedChecks.push({
        code: "REPLACEMENT_LIMIT_NOT_CONFIGURED",
        message: `Profil limitů operativní náhrady nemá nastaveno: ${missingLimits.join(", ")}.`,
      });
    }

    const shiftCounts = new Map<string, number>();
    for (const assignment of assignments) {
      shiftCounts.set(
        assignment.employeeId,
        (shiftCounts.get(assignment.employeeId) ?? 0) + 1,
      );
    }
    if (input.replacementLimits.maxShiftsPerWeek !== undefined) {
      for (const [employeeId, count] of shiftCounts) {
        if (count > input.replacementLimits.maxShiftsPerWeek) {
          problems.push({
            code: "REPLACEMENT_LIMIT_EXCEEDED",
            severity: "error",
            message: `Zaměstnanec ${employeeId} má ${count} směn, což překračuje konfigurovaný limit ${input.replacementLimits.maxShiftsPerWeek}.`,
            employeeId,
          });
        }
      }
    }
  }

  return {
    ...validation,
    status:
      problems.length > 0
        ? "invalid"
        : unverifiedChecks.length > 0
          ? "not_verified"
          : validation.status,
    problems,
    unverifiedChecks,
  };
}

function timeOffChangeFor(
  input: PlanningInput,
  assignment: ProposedAssignment,
): readonly [ReplacementImpact["timeOffChanges"][number]] | readonly [] {
  const absence = input.absences.find(
    (candidate) =>
      candidate.employeeId === assignment.employeeId &&
      candidate.status === "approved" &&
      candidate.from <= assignment.date &&
      candidate.to >= assignment.date,
  );
  if (absence) {
    return [
      {
        employeeId: assignment.employeeId,
        kind: absence.type === "vacation" ? "approved_vacation" : "unknown",
        originalDate: assignment.date,
        newDate: null,
        verified: false,
      },
    ];
  }

  const plannedDayOff = input.requests.find(
    (request) =>
      request.employeeId === assignment.employeeId &&
      request.date === assignment.date &&
      request.kind === "day_off" &&
      request.status === "approved",
  );
  if (plannedDayOff) {
    return [
      {
        employeeId: assignment.employeeId,
        kind: "planned_day_off",
        originalDate: assignment.date,
        newDate: null,
        verified: false,
      },
    ];
  }

  return [];
}

function deduplicateDrafts(
  drafts: readonly ReplacementDraft[],
): readonly ReplacementDraft[] {
  const seen = new Set<string>();
  return drafts.filter((draft) => {
    if (seen.has(draft.id)) return false;
    seen.add(draft.id);
    return true;
  });
}

function replacementRunStatus(
  options: readonly ReplacementOption[],
): ReplacementRunResult["status"] {
  if (options.some((option) => option.validation.status === "valid")) {
    return "ready_for_review";
  }
  if (options.some((option) => option.validation.status === "not_verified")) {
    return "not_verified";
  }
  return "needs_changes";
}

function assignmentKey(assignment: ProposedAssignment): string {
  return `${assignment.employeeId}|${assignment.date}|${assignment.shiftKind}`;
}
