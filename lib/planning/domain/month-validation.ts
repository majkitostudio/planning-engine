import { CONFIRMED_SHIFT_DEFINITIONS, DEFAULT_TIME_ZONE, getConfirmedShiftWindow } from "./confirmed";
import { datesInMonth, monthWeekStarts } from "./month";
import { validateMonthlyInput, type MonthlyPlanningInput } from "./month-input";
import { addDays, datesInWeek, getShiftInterval, getZonedDateTimeStatus, isIsoDate, isLocalTime, isWeekendDate, zonedDateTimeToUtcMs } from "./time";
import type { EmploymentType, LocalTime, ProposedAssignment, ShiftKind } from "./types";

export interface MonthlyBoundaryAssignment {
  readonly employeeId: string;
  readonly date: string;
  readonly shiftKind?: ShiftKind;
  readonly startTime?: LocalTime;
  readonly endTime?: LocalTime;
}

export interface MonthlyBoundaryData {
  readonly before: { readonly complete: boolean; readonly assignments: readonly MonthlyBoundaryAssignment[] };
  readonly after: { readonly complete: boolean; readonly assignments: readonly MonthlyBoundaryAssignment[] };
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
  readonly preferenceFindings: readonly MonthlyFinding[];
  /** Nezávazná kontrola měsíčního fondu; nikdy sama neblokuje potvrzení. */
  readonly workFundFindings: readonly MonthlyFinding[];
  readonly canConfirm: boolean;
}

const formatFundHours = (seconds: number) => String(Math.round(seconds / 36) / 100).replace(".", ",");

/** Kontroluje celý měsíční návrh; samotný výsledek nepotvrzuje rozpis. */
export function validateMonthlyPlan(input: MonthlyPlanningInput, assignments: readonly ProposedAssignment[], boundary: MonthlyBoundaryData): MonthlyValidation {
  const problems: MonthlyFinding[] = [];
  const unverified: MonthlyFinding[] = [];
  const preferenceFindings: MonthlyFinding[] = [];
  const workFundFindings: MonthlyFinding[] = [];
  const parsed = validateMonthlyInput(input);
  if (!parsed.ok) return { status: "invalid", problems: [{ code: "INPUT_INVALID", message: parsed.message }], unverified, preferenceFindings, workFundFindings, canConfirm: false };
  const dates = datesInMonth(input.month);
  const first = dates[0];
  const last = dates[dates.length - 1];
  const employees = new Set(input.employees.map((employee) => employee.id));
  const beforeComplete = boundary?.before?.complete === true && Array.isArray(boundary.before.assignments);
  const afterComplete = boundary?.after?.complete === true && Array.isArray(boundary.after.assignments);
  const before = Array.isArray(boundary?.before?.assignments) ? boundary.before.assignments : [];
  const after = Array.isArray(boundary?.after?.assignments) ? boundary.after.assignments : [];
  const range = input.planningRange;
  const isValidAssignment = (a: unknown): a is ProposedAssignment => {
    if (typeof a !== "object" || a === null) return false;
    const item = a as Record<string, unknown>;
    return typeof item.employeeId === "string" && employees.has(item.employeeId) && isIsoDate(item.date) && (item.shiftKind === "morning" || item.shiftKind === "afternoon");
  };
  const isValidBoundaryAssignment = (a: unknown): a is MonthlyBoundaryAssignment => {
    if (typeof a !== "object" || a === null) return false;
    const item = a as Record<string, unknown>;
    if (typeof item.employeeId !== "string" || !employees.has(item.employeeId) || !isIsoDate(item.date)) return false;
    if (item.shiftKind === "morning" || item.shiftKind === "afternoon") {
      if (item.startTime === undefined && item.endTime === undefined) return true;
      if (!isLocalTime(item.startTime) || !isLocalTime(item.endTime) || item.startTime >= item.endTime) return false;
      const employee = input.employees.find((e) => e.id === item.employeeId);
const employmentType = (employee?.employmentType === "part_time" ? "part_time" : "full_time") as EmploymentType;
const expected = getConfirmedShiftWindow(item.shiftKind, isWeekendDate(item.date), employmentType);
      return item.startTime === expected.start && item.endTime === expected.end;
    }
    return isLocalTime(item.startTime) && isLocalTime(item.endTime) && item.startTime < item.endTime
      && getZonedDateTimeStatus(item.date, item.startTime, DEFAULT_TIME_ZONE) === "valid"
      && getZonedDateTimeStatus(item.date, item.endTime, DEFAULT_TIME_ZONE) === "valid";
  };
  const boundaryAssignments: MonthlyBoundaryAssignment[] = [];
  for (const [items, side] of [[before, "before"], [after, "after"]] as const) {
    for (const item of items) {
      if (!isValidBoundaryAssignment(item) || (side === "before" ? item.date >= first : item.date <= last)) {
        unverified.push({ code: "BOUNDARY_HISTORY_INVALID", message: "Podklady navazujícího rozpisu obsahují neplatné přiřazení." });
      } else boundaryAssignments.push(item);
    }
  }
  const valid: ProposedAssignment[] = [];
  const seen = new Set<string>();
  const checkAssignmentConstraints = (item: MonthlyBoundaryAssignment) => {
    if (input.absences.some((absence) => absence.employeeId === item.employeeId && absence.status === "approved" && absence.from <= item.date && absence.to >= item.date)) problems.push({ code: "ABSENCE_APPROVED", message: "Směna zasahuje do schválené absence.", date: item.date, employeeId: item.employeeId });
    if (!item.shiftKind) return;
    const availability = input.availability.find((entry) => entry.employeeId === item.employeeId && entry.date === item.date && entry.shiftKind === item.shiftKind);
    if (availability?.available === false) problems.push({ code: "AVAILABILITY_UNAVAILABLE", message: "Zaměstnanec není na směnu dostupný.", date: item.date, employeeId: item.employeeId, shiftKind: item.shiftKind });
    else if (!availability) unverified.push({ code: "AVAILABILITY_MISSING", message: "Dostupnost zaměstnance není pro směnu známá.", date: item.date, employeeId: item.employeeId, shiftKind: item.shiftKind });
  };
  if (!Array.isArray(assignments)) problems.push({ code: "PROPOSAL_INVALID", message: "Návrh neobsahuje seznam směn." });
  for (const a of Array.isArray(assignments) ? assignments : []) {
    if (!isValidAssignment(a) || a.date < first || a.date > last) {
      problems.push({ code: "ASSIGNMENT_INVALID", message: "Návrh obsahuje neplatnou směnu nebo směnu mimo měsíc." });
      continue;
    }
    if (range && (a.date < range.startDate || a.date > range.endDate)) {
      problems.push({ code: "ASSIGNMENT_OUTSIDE_RANGE", message: "Návrh obsahuje směnu mimo zvolený úsek doplánování.", date: a.date, employeeId: a.employeeId });
      continue;
    }
    const key = `${a.employeeId}|${a.date}|${a.shiftKind}`;
    if (seen.has(key)) { problems.push({ code: "ASSIGNMENT_DUPLICATE", message: "Směna je uvedena vícekrát.", date: a.date, employeeId: a.employeeId }); continue; }
    seen.add(key);
    valid.push(a);
    checkAssignmentConstraints(a);
  }
  const fixedRosterAssignments: MonthlyBoundaryAssignment[] = [];
  if (range) {
    if (!input.rosterHistory) unverified.push({ code: "ROSTER_HISTORY_MISSING", message: "Pro doplánování části měsíce chybí aktuální měsíční podklady rosteru." });
    else for (const item of input.rosterHistory.days) {
      const inside = item.date >= range.startDate && item.date <= range.endDate;
      if (item.status === "conflict") {
        problems.push({ code: "ROSTER_HISTORY_CONFLICT", message: "Podklady rosteru si pro tento den odporují.", date: item.date, employeeId: item.employeeId });
      } else if (inside && item.status !== "unknown") {
        problems.push({ code: "ROSTER_RANGE_OVERLAP", message: "Zvolený úsek obsahuje již zaznamenaný den; vyřešte překryv nebo změňte rozsah.", date: item.date, employeeId: item.employeeId });
      } else if (!inside && item.status === "unknown") {
        unverified.push({ code: "ROSTER_HISTORY_OUTSIDE_RANGE_UNKNOWN", message: "Pevné dny mimo doplňovaný úsek nejsou úplně pokryté rosterem.", date: item.date, employeeId: item.employeeId });
      } else if (!inside && item.status === "shift") {
        fixedRosterAssignments.push({ employeeId: item.employeeId, date: item.date, startTime: item.startTime as LocalTime, endTime: item.endTime as LocalTime, ...(item.shiftKind ? { shiftKind: item.shiftKind } : {}) });
        checkAssignmentConstraints(item);
      }
    }
  }
  const monthWork = [...valid, ...fixedRosterAssignments];
  const weeks = monthWeekStarts(input.month);
  const partialWeekNeedsHistory = (week: string) => {
    const monthDays = datesInWeek(week).filter((date) => date >= first && date <= last);
    return input.employees.some((employee) => {
      const worked = new Set(monthWork.filter((item) => item.employeeId === employee.id).map((item) => item.date));
      const off = monthDays.filter((date) => !worked.has(date));
      return !off.some((date) => off.includes(addDays(date, 1)));
    });
  };
  const beforeWeek = weeks[0];
  const afterWeek = weeks[weeks.length - 1];
  const beforeNeeded = monthWork.some((item) => item.date <= addDays(first, 5)) || (beforeWeek < first && partialWeekNeedsHistory(beforeWeek));
  const afterNeeded = monthWork.some((item) => item.date >= addDays(last, -5)) || (addDays(afterWeek, 6) > last && partialWeekNeedsHistory(afterWeek));
  if ((!beforeComplete && beforeNeeded) || (!afterComplete && afterNeeded)) {
    unverified.push({ code: "BOUNDARY_HISTORY_INCOMPLETE", message: "Pro kontrolu odpočinku nebo víkendového volna chybí potřebné podklady před měsícem nebo po něm." });
  }
  for (const date of dates) for (const kind of ["morning", "afternoon"] as const) {
    const requirement = input.staffingRequirements.find((item) => item.date === date && item.shiftKind === kind);
    if (!requirement) { unverified.push({ code: "COVERAGE_REQUIREMENT_MISSING", message: "Chybí požadované obsazení směny.", date, shiftKind: kind }); continue; }
    const fixed = fixedRosterAssignments.filter((item) => item.date === date);
    const unclassified = fixed.some((item) => !item.shiftKind);
    if (unclassified) unverified.push({ code: "COVERAGE_SHIFT_UNCLASSIFIED", message: "Převzatá směna má vlastní čas a nelze ji přiřadit k rannímu či odpolednímu obsazení.", date, shiftKind: kind });
    const count = valid.filter((item) => item.date === date && item.shiftKind === kind).length + fixed.filter((item) => item.shiftKind === kind).length;
    if (!unclassified && count < requirement.requiredEmployees) problems.push({ code: "COVERAGE_UNDERSTAFFED", message: "Směna není dostatečně obsazena.", date, shiftKind: kind });
  }
  const all: MonthlyBoundaryAssignment[] = [...boundaryAssignments, ...fixedRosterAssignments, ...valid];
  for (const employee of input.employees) {
    const work = all.filter((item) => item.employeeId === employee.id);
    const workDates = [...new Set(work.map((item) => item.date))].sort();
    const shiftInterval = (item: MonthlyBoundaryAssignment) => {
      if (item.shiftKind) return getShiftInterval(item.date, item.shiftKind, CONFIRMED_SHIFT_DEFINITIONS, DEFAULT_TIME_ZONE, employee.employmentType as EmploymentType);
      const startMs = zonedDateTimeToUtcMs(item.date, item.startTime!, DEFAULT_TIME_ZONE);
      let endMs = zonedDateTimeToUtcMs(item.date, item.endTime!, DEFAULT_TIME_ZONE);
      if (endMs <= startMs) endMs = zonedDateTimeToUtcMs(addDays(item.date, 1), item.endTime!, DEFAULT_TIME_ZONE);
      return { startMs, endMs };
    };
    const interval = (date: string) => {
      const spans = work.filter((item) => item.date === date).map(shiftInterval);
      return { start: Math.min(...spans.map((span) => span.startMs)), end: Math.max(...spans.map((span) => span.endMs)) };
    };
    for (const date of workDates) {
      const day = work.filter((item) => item.date === date);
      if (day.length > 1 && date >= first && date <= last) {
        const spans = day.map(shiftInterval).sort((a, b) => a.startMs - b.startMs);
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

    const fund = input.workFunds?.find((item) => item.employeeId === employee.id);
    if (!fund) {
      workFundFindings.push({ code: "WORK_FUND_MISSING", message: "Pracovní fond zaměstnance není zadán; naplnění fondu nelze ověřit.", employeeId: employee.id });
    } else {
      const plannedSeconds = Math.round(work
        .filter((item) => item.date >= first && item.date <= last)
        .reduce((sum, item) => {
          const span = shiftInterval(item);
          return sum + (span.endMs - span.startMs);
        }, 0) / 1000);
      const targetSeconds = Math.round(fund.hours * 3600);
      const excusedSeconds = Math.round(fund.excusedHours * 3600);
      const totalSeconds = plannedSeconds + excusedSeconds;
      const detail = `naplánováno ${formatFundHours(plannedSeconds)} h a omluveno ${formatFundHours(excusedSeconds)} h z fondu ${formatFundHours(targetSeconds)} h`;
      if (totalSeconds < targetSeconds) workFundFindings.push({ code: "WORK_FUND_UNDER", message: `Fond práce není naplněn: ${detail}.`, employeeId: employee.id });
      else if (totalSeconds > targetSeconds) workFundFindings.push({ code: "WORK_FUND_OVER", message: `Fond práce je překročen: ${detail}.`, employeeId: employee.id });
    }

    if (input.shiftRotationPreference) {
      const employeeWork = work.filter((item) => item.employeeId === employee.id).sort((a, b) => a.date.localeCompare(b.date));
      const monthWork = employeeWork.filter((item) => item.date >= first && item.date <= last);
      if (monthWork.length > 0 && (!beforeComplete || !employeeWork.some((item) => item.date < first))) {
        preferenceFindings.push({ code: "SHIFT_ROTATION_HISTORY_INCOMPLETE", message: "Střídání na začátku měsíce nelze ověřit bez známé předchozí směny.", date: monthWork[0].date, employeeId: employee.id });
      }
      if (monthWork.length > 0 && (!afterComplete || !employeeWork.some((item) => item.date > last))) {
        preferenceFindings.push({ code: "SHIFT_ROTATION_HISTORY_INCOMPLETE", message: "Střídání po konci měsíce nelze ověřit bez známé navazující směny.", date: monthWork[monthWork.length - 1].date, employeeId: employee.id });
      }
      for (let index = 1; index < employeeWork.length; index++) {
        const previous = employeeWork[index - 1];
        const current = employeeWork[index];
        if ((previous.date < first && !beforeComplete) || (current.date > last && !afterComplete)) continue;
        if (previous.shiftKind && current.shiftKind && previous.shiftKind === current.shiftKind) {
          preferenceFindings.push({ code: "SHIFT_ROTATION_REPEATED", message: "Dvě sousední pracovní směny mají stejný typ, přestože je zapnuté přání střídání.", date: current.date, employeeId: employee.id, shiftKind: current.shiftKind });
        } else if (!previous.shiftKind || !current.shiftKind) {
          preferenceFindings.push({ code: "SHIFT_ROTATION_HISTORY_UNCLASSIFIED", message: "Přání střídání nelze ověřit, protože navazující směna nemá potvrzený typ ranní nebo odpolední.", date: current.date, employeeId: employee.id });
        }
      }
    }
  }
  const status = problems.length ? "invalid" : unverified.length ? "not_verified" : "valid";
  return { status, problems, unverified, preferenceFindings, workFundFindings, canConfirm: status === "valid" };
}
