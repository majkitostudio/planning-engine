import { CONFIRMED_SHIFT_DEFINITIONS, DEFAULT_TIME_ZONE } from "./confirmed";
import { datesInMonth, monthWeekStarts } from "./month";
import { validateMonthlyInput, type MonthlyPlanningInput } from "./month-input";
import { addDays, datesInWeek, getShiftInterval, isIsoDate, isWeekendDate } from "./time";
import type { ExistingAssignment, ProposedAssignment, ShiftKind } from "./types";

export interface MonthlyBoundaryData {
  readonly before: { readonly complete: boolean; readonly assignments: readonly ExistingAssignment[] };
  readonly after: { readonly complete: boolean; readonly assignments: readonly ExistingAssignment[] };
}
export interface MonthlyFinding {
  readonly code: string;
  readonly message: string;
  readonly date?: string;
  readonly employeeId?: string;
  readonly shiftKind?: ShiftKind;
}
export interface MonthlyValidation {
  readonly status: "valid" | "invalid" | "not_verified";
  readonly problems: readonly MonthlyFinding[];
  readonly unverified: readonly MonthlyFinding[];
  readonly canConfirm: boolean;
}

/** Kontroluje celý měsíční návrh; samotný výsledek nepotvrzuje rozpis. */
export function validateMonthlyPlan(input: MonthlyPlanningInput, assignments: readonly ProposedAssignment[], boundary: MonthlyBoundaryData): MonthlyValidation {
  const problems: MonthlyFinding[] = [];
  const unverified: MonthlyFinding[] = [];
  const parsed = validateMonthlyInput(input);
  if (!parsed.ok) return { status: "invalid", problems: [{ code: "INPUT_INVALID", message: parsed.message }], unverified, canConfirm: false };
  const dates = datesInMonth(input.month);
  const first = dates[0];
  const last = dates[dates.length - 1];
  const employees = new Set(input.employees.map((employee) => employee.id));
  const beforeComplete = boundary?.before?.complete === true && Array.isArray(boundary.before.assignments);
  const afterComplete = boundary?.after?.complete === true && Array.isArray(boundary.after.assignments);
  const before = Array.isArray(boundary?.before?.assignments) ? boundary.before.assignments : [];
  const after = Array.isArray(boundary?.after?.assignments) ? boundary.after.assignments : [];
  const isValidAssignment = (a: unknown): a is ProposedAssignment => {
    if (typeof a !== "object" || a === null) return false;
    const item = a as Record<string, unknown>;
    return typeof item.employeeId === "string" && employees.has(item.employeeId) && isIsoDate(item.date) && (item.shiftKind === "morning" || item.shiftKind === "afternoon");
  };
  const boundaryAssignments: ProposedAssignment[] = [];
  for (const [items, side] of [[before, "before"], [after, "after"]] as const) {
    for (const item of items) {
      if (!isValidAssignment(item) || (side === "before" ? item.date >= first : item.date <= last)) {
        unverified.push({ code: "BOUNDARY_HISTORY_INVALID", message: "Podklady navazujícího rozpisu obsahují neplatné přiřazení." });
      } else boundaryAssignments.push(item);
    }
  }
  const valid: ProposedAssignment[] = [];
  const seen = new Set<string>();
  if (!Array.isArray(assignments)) problems.push({ code: "PROPOSAL_INVALID", message: "Návrh neobsahuje seznam směn." });
  for (const a of Array.isArray(assignments) ? assignments : []) {
    if (!isValidAssignment(a) || a.date < first || a.date > last) {
      problems.push({ code: "ASSIGNMENT_INVALID", message: "Návrh obsahuje neplatnou směnu nebo směnu mimo měsíc." });
      continue;
    }
    const key = `${a.employeeId}|${a.date}|${a.shiftKind}`;
    if (seen.has(key)) { problems.push({ code: "ASSIGNMENT_DUPLICATE", message: "Směna je uvedena vícekrát.", date: a.date, employeeId: a.employeeId }); continue; }
    seen.add(key);
    valid.push(a);
    if (input.absences.some((absence) => absence.employeeId === a.employeeId && absence.status === "approved" && absence.from <= a.date && absence.to >= a.date)) problems.push({ code: "ABSENCE_APPROVED", message: "Směna zasahuje do schválené absence.", date: a.date, employeeId: a.employeeId });
    const availability = input.availability.find((item) => item.employeeId === a.employeeId && item.date === a.date && item.shiftKind === a.shiftKind);
    if (availability?.available === false) problems.push({ code: "AVAILABILITY_UNAVAILABLE", message: "Zaměstnanec není na směnu dostupný.", date: a.date, employeeId: a.employeeId, shiftKind: a.shiftKind });
    else if (!availability) unverified.push({ code: "AVAILABILITY_MISSING", message: "Dostupnost zaměstnance není pro směnu známá.", date: a.date, employeeId: a.employeeId, shiftKind: a.shiftKind });
  }
  const weeks = monthWeekStarts(input.month);
  const partialWeekNeedsHistory = (week: string) => {
    const monthDays = datesInWeek(week).filter((date) => date >= first && date <= last);
    return input.employees.some((employee) => {
      const worked = new Set(valid.filter((item) => item.employeeId === employee.id).map((item) => item.date));
      const off = monthDays.filter((date) => !worked.has(date));
      return !off.some((date) => off.includes(addDays(date, 1)));
    });
  };
  const beforeWeek = weeks[0];
  const afterWeek = weeks[weeks.length - 1];
  const beforeNeeded = valid.some((item) => item.date <= addDays(first, 5)) || (beforeWeek < first && partialWeekNeedsHistory(beforeWeek));
  const afterNeeded = valid.some((item) => item.date >= addDays(last, -5)) || (addDays(afterWeek, 6) > last && partialWeekNeedsHistory(afterWeek));
  if ((!beforeComplete && beforeNeeded) || (!afterComplete && afterNeeded)) {
    unverified.push({ code: "BOUNDARY_HISTORY_INCOMPLETE", message: "Pro kontrolu odpočinku nebo víkendového volna chybí potřebné podklady před měsícem nebo po něm." });
  }
  for (const date of dates) for (const kind of ["morning", "afternoon"] as const) {
    const requirement = input.staffingRequirements.find((item) => item.date === date && item.shiftKind === kind);
    if (!requirement) { unverified.push({ code: "COVERAGE_REQUIREMENT_MISSING", message: "Chybí požadované obsazení směny.", date, shiftKind: kind }); continue; }
    if (valid.filter((item) => item.date === date && item.shiftKind === kind).length < requirement.requiredEmployees) problems.push({ code: "COVERAGE_UNDERSTAFFED", message: "Směna není dostatečně obsazena.", date, shiftKind: kind });
  }
  const all = [...boundaryAssignments, ...valid];
  for (const employee of input.employees) {
    const work = all.filter((item) => item.employeeId === employee.id);
    const workDates = [...new Set(work.map((item) => item.date))].sort();
    const interval = (date: string) => {
      const spans = work.filter((item) => item.date === date).map((item) => getShiftInterval(date, item.shiftKind, CONFIRMED_SHIFT_DEFINITIONS, DEFAULT_TIME_ZONE));
      return { start: Math.min(...spans.map((span) => span.startMs)), end: Math.max(...spans.map((span) => span.endMs)) };
    };
    for (const date of workDates) {
      const day = work.filter((item) => item.date === date);
      if (day.length > 1 && date >= first && date <= last) {
        const spans = day.map((item) => getShiftInterval(date, item.shiftKind, CONFIRMED_SHIFT_DEFINITIONS, DEFAULT_TIME_ZONE)).sort((a, b) => a.startMs - b.startMs);
        if (spans.some((span, index) => index > 0 && span.startMs < spans[index - 1].endMs)) problems.push({ code: "SHIFT_OVERLAP", message: "Směny zaměstnance se překrývají.", date, employeeId: employee.id });
      }
    }
    for (let i = 0; i + 5 < workDates.length; i++) {
      const start = workDates[i];
      if (!Array.from({ length: 6 }, (_, n) => addDays(start, n)).every((date, n) => workDates[i + n] === date)) continue;
      const sixth = workDates[i + 5];
      const next = workDates[i + 6];
      if (!next || start > last || next < first) continue;
      if (interval(next).start - interval(sixth).end < 35 * 60 * 60 * 1000) problems.push({ code: "REST_AFTER_SIX_DAYS", message: "Po šesti pracovních dnech nenásleduje 35 hodin odpočinku.", date: sixth, employeeId: employee.id });
    }
    for (const week of weeks) {
      const weekDates = datesInWeek(week);
      if (!work.some((item) => weekDates.includes(item.date) && isWeekendDate(item.date))) continue;
      if ((week < first && !beforeComplete) || (weekDates[6] > last && !afterComplete)) continue;
      const off = weekDates.filter((date) => !workDates.includes(date));
      if (off.length < 2) problems.push({ code: "WEEKEND_TWO_DAYS_OFF", message: "Při víkendové práci chybí dva dny volna v týdnu.", date: week, employeeId: employee.id });
    }
  }
  const status = problems.length ? "invalid" : unverified.length ? "not_verified" : "valid";
  return { status, problems, unverified, canConfirm: status === "valid" };
}
