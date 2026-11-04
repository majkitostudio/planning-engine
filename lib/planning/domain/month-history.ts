import { CONFIRMED_SHIFT_DEFINITIONS, getShiftWindow } from "./confirmed";
import { datesInMonth } from "./month";
import { addDays, isIsoDate, isLocalTime, isWeekendDate } from "./time";
import type { MonthlyBoundaryAssignment, MonthlyBoundaryData } from "./month-validation";
import type { MonthlyRosterDay, MonthlyRosterSnapshot } from "./month-input";
import type { ExistingAssignment, IsoDate, ShiftKind } from "./types";

/** Potvrzený rozpis se známým rozsahem a seznamem zahrnutých zaměstnanců. */
export interface ConfirmedHistoryPeriod {
  readonly start: IsoDate;
  readonly end: IsoDate;
  readonly employeeIds: readonly string[];
  readonly assignments: readonly ExistingAssignment[];
}

/** Výslovně převzaté buňky; absence záznamu pro den znamená neznámý den. */
export interface RosterHistoryPeriod {
  readonly id?: string;
  readonly version?: number;
  readonly fingerprint?: string;
  readonly start: IsoDate;
  readonly end: IsoDate;
  readonly employeeIds: readonly string[];
  readonly entries: readonly {
    readonly employeeId: string;
    readonly date: string;
    readonly status: "shift" | "off";
    readonly startTime?: string | null;
    readonly endTime?: string | null;
  }[];
}

type HistoryFact =
  | { readonly status: "off" }
  | { readonly status: "shift"; readonly startTime: string; readonly endTime: string; readonly shiftKind?: ShiftKind };

const isShiftKind = (value: unknown): value is ShiftKind => value === "morning" || value === "afternoon";
const inPeriod = (date: string, start: string, end: string) => isIsoDate(start) && isIsoDate(end) && start <= date && end >= date;

function validateConfirmedPeriod(period: ConfirmedHistoryPeriod): boolean {
  if (!inPeriod(period.start, period.start, period.end) || !Array.isArray(period.employeeIds) || !Array.isArray(period.assignments)) return false;
  const seen = new Set<string>();
  for (const item of period.assignments) {
    if (!item || typeof item.employeeId !== "string" || !period.employeeIds.includes(item.employeeId)
      || !isIsoDate(item.date) || item.date < period.start || item.date > period.end || !isShiftKind(item.shiftKind)) return false;
    const key = `${item.employeeId}|${item.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

function validateRosterPeriod(period: RosterHistoryPeriod): boolean {
  if (!inPeriod(period.start, period.start, period.end) || !Array.isArray(period.employeeIds) || !Array.isArray(period.entries)) return false;
  const seen = new Set<string>();
  for (const item of period.entries) {
    if (!item || typeof item.employeeId !== "string" || !period.employeeIds.includes(item.employeeId)
      || !isIsoDate(item.date) || item.date < period.start || item.date > period.end
      || (item.status !== "shift" && item.status !== "off")) return false;
    const key = `${item.employeeId}|${item.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    if (item.status === "off") {
      if (item.startTime != null || item.endTime != null) return false;
    } else if (!isLocalTime(item.startTime) || !isLocalTime(item.endTime) || item.startTime >= item.endTime) return false;
  }
  return true;
}

function factKey(fact: HistoryFact): string {
  return fact.status === "off" ? "off" : `shift|${fact.startTime}|${fact.endTime}`;
}

function confirmedFact(date: IsoDate, shiftKind: ShiftKind): HistoryFact {
  const window = getShiftWindow(CONFIRMED_SHIFT_DEFINITIONS, shiftKind, isWeekendDate(date));
  return { status: "shift", startTime: window.start, endTime: window.end, shiftKind };
}

function importedFact(date: string, item: RosterHistoryPeriod["entries"][number]): HistoryFact {
  if (item.status === "off") return { status: "off" };
  const startTime = item.startTime!;
  const endTime = item.endTime!;
  const shiftKind = ( ["morning", "afternoon"] as const).find((kind) => {
    const window = getShiftWindow(CONFIRMED_SHIFT_DEFINITIONS, kind, isWeekendDate(date));
    return window.start === startTime && window.end === endTime;
  });
  return { status: "shift", startTime, endTime, ...(shiftKind ? { shiftKind } : {}) };
}

/** Vytvoří měsíční snapshot bez jmen pro pevné dny mimo doplňovaný úsek. */
export function resolveMonthlyRosterHistory(
  month: string,
  employeeIds: readonly string[],
  rosterPeriods: readonly RosterHistoryPeriod[],
): MonthlyRosterSnapshot {
  const dates = datesInMonth(month);
  const ids = [...new Set(employeeIds)];
  const periods = rosterPeriods.filter((period) => validateRosterPeriod(period)
    && isIsoDate(period.start) && isIsoDate(period.end)
    && period.start <= dates[dates.length - 1] && period.end >= dates[0]
    && period.employeeIds.some((employeeId) => ids.includes(employeeId)));
  const imports = periods.flatMap((period) => period.id && period.version && period.fingerprint
    ? [{ id: period.id, version: period.version, fingerprint: period.fingerprint }]
    : []).sort((a, b) => a.id.localeCompare(b.id));
  const days: MonthlyRosterDay[] = [];
  for (const employeeId of ids) for (const date of dates) {
    const facts: HistoryFact[] = [];
    for (const period of periods) {
      if (!period.employeeIds.includes(employeeId) || !inPeriod(date, period.start, period.end)) continue;
      const entry = period.entries.find((item) => item.employeeId === employeeId && item.date === date);
      if (entry) facts.push(importedFact(date, entry));
    }
    const keys = new Set(facts.map(factKey));
    if (keys.size === 0) days.push({ employeeId, date, status: "unknown" });
    else if (keys.size > 1) days.push({ employeeId, date, status: "conflict" });
    else if (facts[0].status === "off") days.push({ employeeId, date, status: "off" });
    else days.push({ employeeId, date, status: "shift", startTime: facts[0].startTime, endTime: facts[0].endTime, ...(facts[0].shiftKind ? { shiftKind: facts[0].shiftKind } : {}) });
  }
  return { imports, days };
}

/**
 * Sloučí potvrzené rozpisy a výslovně uložené rosterové buňky. Shodné překryvy
 * se sjednotí, rozporné záznamy zůstanou neúplné a chybějící buňky nejsou volno.
 */
export function buildMonthlyBoundary(
  month: string,
  employeeIds: readonly string[],
  periods: readonly ConfirmedHistoryPeriod[],
  rosterPeriods: readonly RosterHistoryPeriod[] = [],
): MonthlyBoundaryData {
  const dates = datesInMonth(month);
  const requiredIds = [...new Set(employeeIds)];
  const validConfirmed = periods.filter(validateConfirmedPeriod);
  const validRoster = rosterPeriods.filter(validateRosterPeriod);

  const collect = (days: readonly IsoDate[]) => {
    let complete = true;
    const assignments: MonthlyBoundaryAssignment[] = [];
    for (const date of days) {
      for (const employeeId of requiredIds) {
        const facts: HistoryFact[] = [];
        for (const period of validConfirmed) {
          if (!inPeriod(date, period.start, period.end) || !period.employeeIds.includes(employeeId)) continue;
          const assignment = period.assignments.find((item) => item.employeeId === employeeId && item.date === date);
          facts.push(assignment ? confirmedFact(date, assignment.shiftKind) : { status: "off" });
        }
        for (const period of validRoster) {
          if (!inPeriod(date, period.start, period.end) || !period.employeeIds.includes(employeeId)) continue;
          const entry = period.entries.find((item) => item.employeeId === employeeId && item.date === date);
          if (entry) facts.push(importedFact(date, entry));
        }
        const keys = new Set(facts.map(factKey));
        if (keys.size !== 1) { complete = false; continue; }
        const fact = facts[0];
        if (fact.status === "shift") assignments.push({
          employeeId,
          date,
          startTime: fact.startTime as MonthlyBoundaryAssignment["startTime"],
          endTime: fact.endTime as MonthlyBoundaryAssignment["endTime"],
          ...(fact.shiftKind ? { shiftKind: fact.shiftKind } : {}),
        });
      }
    }
    return { complete, assignments };
  };
  return {
    before: collect(Array.from({ length: 7 }, (_, index) => addDays(dates[0], index - 7))),
    after: collect(Array.from({ length: 7 }, (_, index) => addDays(dates[dates.length - 1], index + 1))),
  };
}
