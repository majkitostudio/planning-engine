import type {
  EmployeeRequest,
  PlanningInput,
  ProposedAssignment,
  ShiftKind,
} from "./domain/types";
import { getSimulatedScenario } from "./simulated/scenarios";

export interface SimulatedEmployeeRequest extends EmployeeRequest {
  readonly summary: string;
}

const SIMULATED_EMPLOYEE_REQUESTS: readonly SimulatedEmployeeRequest[] = [
  {
    id: "request-e3-2026-10-07",
    employeeId: "e3",
    date: "2026-10-07",
    kind: "day_off",
    status: "pending",
    summary: "Jednodenní žádost o volno",
  },
  {
    id: "request-e4-2026-10-08",
    employeeId: "e4",
    date: "2026-10-08",
    kind: "shift_preference",
    shiftKind: "morning",
    status: "pending",
    summary: "Preference ranní směny",
  },
];

export function getSimulatedEmployeeRequests(): readonly SimulatedEmployeeRequest[] {
  return SIMULATED_EMPLOYEE_REQUESTS;
}

export function getEmployeeRequestById(
  requestId: string,
): SimulatedEmployeeRequest | undefined {
  return SIMULATED_EMPLOYEE_REQUESTS.find((request) => request.id === requestId);
}

export function getEmployeeRequestPreview(request: EmployeeRequest): EmployeeRequestPreview {
  const scenario = getSimulatedScenario("complete");
  if (!scenario) return { requestId: request.id, impacts: [] };
  return previewEmployeeRequest(scenario.input, scenario.draft.assignments, request);
}

export interface RequestShiftImpact {
  readonly date: string;
  readonly shiftKind: ShiftKind;
  readonly currentAssignedEmployees: number;
  readonly assignedAfterRequest: number;
  readonly requiredEmployees: number;
  readonly missingEmployees: number;
  readonly suggestedCandidates: readonly string[];
}

export interface EmployeeRequestPreview {
  readonly requestId: string;
  readonly impacts: readonly RequestShiftImpact[];
}

/**
 * Vypočítá nezávazný náhled přijetí jednoho syntetického požadavku.
 * Výsledek pouze popisuje dopad a volné kandidáty; plán se zde nemění.
 */
export function previewEmployeeRequest(
  input: PlanningInput,
  assignments: readonly ProposedAssignment[],
  request: EmployeeRequest,
): EmployeeRequestPreview {
  const employee = input.employees.find((candidate) => candidate.id === request.employeeId);
  if (!employee) {
    return { requestId: request.id, impacts: [] };
  }

  const currentAssignment = assignments.find(
    (assignment) =>
      assignment.employeeId === request.employeeId &&
      assignment.date === request.date,
  );
  if (!currentAssignment) {
    return { requestId: request.id, impacts: [] };
  }

  const affectedShift = request.kind === "shift_preference"
    ? request.shiftKind
    : undefined;
  const shiftKinds = new Set<ShiftKind>([currentAssignment.shiftKind]);
  if (affectedShift) shiftKinds.add(affectedShift);

  const impacts = [...shiftKinds].map((shiftKind) => {
    const currentAssignedEmployees = assignments.filter(
      (assignment) =>
        assignment.date === request.date && assignment.shiftKind === shiftKind,
    ).length;
    const assignedAfterRequest = request.kind === "day_off"
      ? currentAssignedEmployees - Number(currentAssignment.shiftKind === shiftKind)
      : currentAssignedEmployees - Number(currentAssignment.shiftKind === shiftKind) +
        Number(affectedShift === shiftKind);
    const requiredEmployees = input.staffingRequirements.find(
      (requirement) =>
        requirement.date === request.date && requirement.shiftKind === shiftKind,
    )?.requiredEmployees ?? 0;
    const suggestedCandidates = assignedAfterRequest < requiredEmployees
      ? input.employees
          .filter((candidate) => candidate.id !== request.employeeId)
          .filter((candidate) => !assignments.some(
            (assignment) =>
              assignment.employeeId === candidate.id && assignment.date === request.date,
          ))
          .filter((candidate) => !input.absences.some(
            (absence) =>
              absence.employeeId === candidate.id &&
              absence.status === "approved" &&
              absence.from <= request.date &&
              absence.to >= request.date,
          ))
          .map((candidate) => candidate.id)
      : [];

    return {
      date: request.date,
      shiftKind,
      currentAssignedEmployees,
      assignedAfterRequest,
      requiredEmployees,
      missingEmployees: Math.max(0, requiredEmployees - assignedAfterRequest),
      suggestedCandidates,
    };
  });

  return { requestId: request.id, impacts };
}
