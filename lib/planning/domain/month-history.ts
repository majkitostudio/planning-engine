import { datesInMonth } from "./month";
import { addDays, isIsoDate } from "./time";
import type { MonthlyBoundaryData } from "./month-validation";
import type { ExistingAssignment, IsoDate } from "./types";

/** Potvrzený rozpis se známým rozsahem a seznamem zahrnutých zaměstnanců. */
export interface ConfirmedHistoryPeriod {
  readonly start: IsoDate;
  readonly end: IsoDate;
  readonly employeeIds: readonly string[];
  readonly assignments: readonly ExistingAssignment[];
}

/** Nejednoznačné překryvy se nepovažují za doklad úplnosti ani za zdroj směn. */
export function buildMonthlyBoundary(month: string, employeeIds: readonly string[], periods: readonly ConfirmedHistoryPeriod[]): MonthlyBoundaryData {
  const dates = datesInMonth(month);
  const requiredIds = new Set(employeeIds);
  const collect = (days: readonly string[]) => {
    let complete = true;
    const assignments: ExistingAssignment[] = [];
    for (const date of days) {
      const candidates = periods.filter((period) => isIsoDate(period.start) && isIsoDate(period.end) && period.start <= date && period.end >= date);
      if (candidates.length !== 1) { complete = false; continue; }
      const period = candidates[0];
      if (!Array.isArray(period.employeeIds) || !Array.isArray(period.assignments) || [...requiredIds].some((id) => !period.employeeIds.includes(id))) { complete = false; continue; }
      if (period.assignments.some((assignment) => !assignment || typeof assignment.employeeId !== "string" || !period.employeeIds.includes(assignment.employeeId) || !isIsoDate(assignment.date) || assignment.date < period.start || assignment.date > period.end || (assignment.shiftKind !== "morning" && assignment.shiftKind !== "afternoon"))) { complete = false; continue; }
      const dayAssignments = period.assignments.filter((assignment) => assignment.date === date && requiredIds.has(assignment.employeeId));
      if (dayAssignments.some((assignment) => assignment.shiftKind !== "morning" && assignment.shiftKind !== "afternoon")) { complete = false; continue; }
      assignments.push(...dayAssignments);
    }
    return { complete, assignments };
  };
  return {
    before: collect(Array.from({ length: 7 }, (_, i) => addDays(dates[0], i - 7))),
    after: collect(Array.from({ length: 7 }, (_, i) => addDays(dates[dates.length - 1], i + 1))),
  };
}
