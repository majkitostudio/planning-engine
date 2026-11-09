import { datesInMonth } from "./domain/month";
import type { MonthlyPlanningInput } from "./domain/month-input";
import type { MonthlyBoundaryData } from "./domain/month-validation";
import type { ProposedAssignment } from "./domain/types";

/** Izolovaný překlad kontraktu; sám nevolá solver ani nezapíná provider. */
export function createOrtoolsRequest(input: MonthlyPlanningInput, boundary: MonthlyBoundaryData, timeoutSeconds: number) {
  if (input.planningRange || input.rosterHistory || input.employees.some((employee) => employee.employmentType !== "full_time")) {
    throw new Error("OR-Tools podporuje pouze celý měsíc a plné úvazky.");
  }
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0 || timeoutSeconds > 300) throw new Error("Neplatný limit solveru.");
  const ids = new Map(input.employees.map((employee, index) => [employee.id, `employee-${index}`]));
  if (ids.size !== input.employees.length) throw new Error("Duplicitní zaměstnanec.");
  const token = (id: string) => {
    const value = ids.get(id);
    if (value === undefined) throw new Error("Neznámý zaměstnanec ve vstupu.");
    return value;
  };
  const side = (part: MonthlyBoundaryData["before"]) => ({
    complete: part.complete,
    assignments: part.assignments.map((item) => ({
      employeeId: token(item.employeeId), date: item.date,
      ...(item.shiftKind === undefined ? {} : { shiftKind: item.shiftKind }),
      ...(item.startTime === undefined ? {} : { startTime: item.startTime }),
      ...(item.endTime === undefined ? {} : { endTime: item.endTime }),
    })),
  });
  const request = {
    input: {
      month: input.month,
      employees: input.employees.map((employee) => ({ id: token(employee.id), employmentType: employee.employmentType })),
      absences: input.absences.map((item) => ({ employeeId: token(item.employeeId), from: item.from, to: item.to, type: item.type, status: item.status })),
      availability: input.availability.map((item) => ({ employeeId: token(item.employeeId), date: item.date, shiftKind: item.shiftKind, available: item.available })),
      staffingRequirements: input.staffingRequirements.map(({ date, shiftKind, requiredEmployees }) => ({ date, shiftKind, requiredEmployees })),
    },
    boundary: { before: side(boundary.before), after: side(boundary.after) },
    timeoutSeconds,
  };
  return { request, employeeIds: new Map([...ids].map(([id, value]) => [value, id])) };
}

export type OrtoolsResult =
  | { readonly status: "OPTIMAL" | "FEASIBLE"; readonly modelVersion: string; readonly assignments: readonly ProposedAssignment[] }
  | { readonly status: "INFEASIBLE" | "UNKNOWN" | "invalid_input" | "unavailable" | "error" };

/** Nedůvěryhodnou odpověď kontroluje před zpětným mapováním identit. */
export function parseOrtoolsResponse(value: unknown, month: string, employeeIds: ReadonlyMap<string, string>): OrtoolsResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Neplatná odpověď solveru.");
  const result = value as Record<string, unknown>;
  if (result.status === "INFEASIBLE" || result.status === "UNKNOWN" || result.status === "invalid_input" || result.status === "unavailable" || result.status === "error") return { status: result.status };
  if ((result.status !== "OPTIMAL" && result.status !== "FEASIBLE") || result.modelVersion !== "monthly-cpsat-v1" || !Array.isArray(result.assignments)) throw new Error("Neplatná odpověď solveru.");
  const dates = new Set(datesInMonth(month));
  const seen = new Set<string>();
  const assignments: ProposedAssignment[] = result.assignments.map((entry: unknown) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) throw new Error("Neplatné přiřazení solveru.");
    const item = entry as Record<string, unknown>;
    if (typeof item.employeeId !== "string" || !employeeIds.has(item.employeeId) || typeof item.date !== "string" || !dates.has(item.date) || (item.shiftKind !== "morning" && item.shiftKind !== "afternoon")) throw new Error("Neplatné přiřazení solveru.");
    const key = JSON.stringify([item.employeeId, item.date]);
    if (seen.has(key)) throw new Error("Duplicitní přiřazení solveru.");
    seen.add(key);
    return { employeeId: employeeIds.get(item.employeeId)!, date: item.date, shiftKind: item.shiftKind };
  });
  return { status: result.status, modelVersion: result.modelVersion, assignments };
}
