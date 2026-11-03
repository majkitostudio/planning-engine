import { buildMonthlyBoundary, type ConfirmedHistoryPeriod, type RosterHistoryPeriod } from "./domain/month-history";
import { datesInMonth } from "./domain/month";
import { addDays, isIsoDate, weekdayIndex } from "./domain/time";
import type { ExistingAssignment } from "./domain/types";

type HistoryRow = { weekStart: string; confirmedAt: Date | null; input: unknown; confirmedPlan: unknown };
type MonthlyHistoryRow = { month: string; confirmedAt: Date | null; input: unknown; draft: unknown };
type RosterHistoryRow = {
  scopeKey: string;
  version: number;
  periodStart: string;
  periodEnd: string;
  employees: readonly {
    employeeId: string;
    entries: readonly { date: string; status: "shift" | "off"; startTime: string | null; endTime: string | null }[];
  }[];
};
export interface MonthlyHistoryReader {
  readonly planningRunRecord: {
    findMany(args: { where: { confirmedAt: { not: null }; weekStart: { gte: string; lte: string } }; select: { weekStart: true; confirmedAt: true; input: true; confirmedPlan: true } }): Promise<readonly HistoryRow[]>;
  };
  readonly monthlyPlanningRun?: {
    findMany(args: { where: { confirmedAt: { not: null }; month: { in: string[] } }; select: { month: true; confirmedAt: true; input: true; draft: true } }): Promise<readonly MonthlyHistoryRow[]>;
  };
  readonly rosterHistoryImport?: {
    findMany(args: {
      where: { periodStart: { lte: string }; periodEnd: { gte: string } };
      orderBy: { version: "desc" };
      select: {
        scopeKey: true; version: true; periodStart: true; periodEnd: true;
        employees: { select: { employeeId: true; entries: { select: { date: true; status: true; startTime: true; endTime: true } } } };
      };
    }): Promise<readonly RosterHistoryRow[]>;
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Převezme identity z nejbližšího předcházejícího potvrzeného týdne, jen pokud je jednoznačný. */
export async function loadPreviousWeeklyEmployees(month: string, db: MonthlyHistoryReader) {
  const first = datesInMonth(month)[0];
  const rows = await db.planningRunRecord.findMany({
    where: { confirmedAt: { not: null }, weekStart: { gte: addDays(first, -14), lte: addDays(first, -1) } },
    select: { weekStart: true, confirmedAt: true, input: true, confirmedPlan: true },
  });
  const eligible = rows.filter((row) => row.confirmedAt && isIsoDate(row.weekStart) && weekdayIndex(row.weekStart) === 0 && row.weekStart < first).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  if (eligible.length === 0) return { ok: true as const, employees: [] };
  if (eligible[1]?.weekStart === eligible[0].weekStart) return { ok: false as const };
  const input = isRecord(eligible[0].input) ? eligible[0].input : {};
  const plan = isRecord(eligible[0].confirmedPlan) ? eligible[0].confirmedPlan : {};
  if (plan.weekStart !== eligible[0].weekStart || !Array.isArray(plan.assignments)) return { ok: false as const };
  const employees = input.employees;
  if (!Array.isArray(employees) || employees.some((employee: unknown) => !isRecord(employee) || typeof employee.id !== "string" || !employee.id.trim() || typeof employee.displayName !== "string" || !employee.displayName.trim())) return { ok: false as const };
  const result = employees.map((employee: { id: string; displayName: string }) => ({ id: employee.id, displayName: employee.displayName }));
  if (new Set(result.map((employee) => employee.id)).size !== result.length) return { ok: false as const };
  return { ok: true as const, employees: result };
}

/** Načítá jen potvrzené rozpisy. Nejasné souběžné verze nepovažuje za jednoznačnou historii. */
export async function loadMonthlyBoundary(month: string, employeeIds: readonly string[], db: MonthlyHistoryReader) {
  const dates = datesInMonth(month);
  const rows = await db.planningRunRecord.findMany({
    where: { confirmedAt: { not: null }, weekStart: { gte: addDays(dates[0], -38), lte: addDays(dates[dates.length - 1], 7) } },
    select: { weekStart: true, confirmedAt: true, input: true, confirmedPlan: true },
  });
  const periods: ConfirmedHistoryPeriod[] = [];
  for (const row of rows) {
    if (!row.confirmedAt || !isIsoDate(row.weekStart) || weekdayIndex(row.weekStart) !== 0) continue;
    const input = isRecord(row.input) ? row.input : {};
    const plan = isRecord(row.confirmedPlan) ? row.confirmedPlan : {};
    const validEmployees = Array.isArray(input.employees) && input.employees.every((employee: unknown) => isRecord(employee) && typeof employee.id === "string");
    const validPlan = plan.weekStart === row.weekStart && Array.isArray(plan.assignments);
    periods.push({
      start: row.weekStart,
      end: addDays(row.weekStart, 6),
      employeeIds: validEmployees && validPlan ? (input.employees as { id: string }[]).map((employee) => employee.id) : [],
      assignments: validPlan ? plan.assignments as ExistingAssignment[] : [],
    });
  }
  if (db.monthlyPlanningRun) {
    const months = [addDays(dates[0], -1).slice(0, 7), addDays(dates[dates.length - 1], 1).slice(0, 7)];
    const monthlyRows = await db.monthlyPlanningRun.findMany({ where: { confirmedAt: { not: null }, month: { in: months } }, select: { month: true, confirmedAt: true, input: true, draft: true } });
    for (const row of monthlyRows) {
      if (!row.confirmedAt || !months.includes(row.month)) continue;
      const monthDates = datesInMonth(row.month);
      const input = isRecord(row.input) ? row.input : {};
      const draft = isRecord(row.draft) ? row.draft : {};
      const validEmployees = Array.isArray(input.employees) && input.employees.every((employee: unknown) => isRecord(employee) && typeof employee.id === "string");
      const validDraft = draft.month === row.month && Array.isArray(draft.assignments);
      periods.push({ start: monthDates[0], end: monthDates[monthDates.length - 1], employeeIds: validEmployees && validDraft ? (input.employees as { id: string }[]).map((employee) => employee.id) : [], assignments: validDraft ? draft.assignments as ExistingAssignment[] : [] });
    }
  }
  let rosterPeriods: RosterHistoryPeriod[] = [];
  if (db.rosterHistoryImport) {
    const rows = await db.rosterHistoryImport.findMany({
      where: { periodStart: { lte: addDays(dates[dates.length - 1], 7) }, periodEnd: { gte: addDays(dates[0], -7) } },
      orderBy: { version: "desc" },
      select: {
        scopeKey: true, version: true, periodStart: true, periodEnd: true,
        employees: { select: { employeeId: true, entries: { select: { date: true, status: true, startTime: true, endTime: true } } } },
      },
    });
    const latest = new Map<string, RosterHistoryRow>();
    for (const row of [...rows].sort((a, b) => b.version - a.version)) {
      if (!latest.has(row.scopeKey)) latest.set(row.scopeKey, row);
    }
    rosterPeriods = [...latest.values()].map((row) => ({
      start: row.periodStart,
      end: row.periodEnd,
      employeeIds: row.employees.map((item) => item.employeeId),
      entries: row.employees.flatMap((item) => item.entries.map((entry) => ({ ...entry, employeeId: item.employeeId }))),
    }));
  }
  return buildMonthlyBoundary(month, employeeIds, periods, rosterPeriods);
}
