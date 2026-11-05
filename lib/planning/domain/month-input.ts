import { datesInMonth } from "./month";
import { DEFAULT_TIME_ZONE, getConfirmedShiftWindow } from "./confirmed";
import { getZonedDateTimeStatus, isIsoDate, isLocalTime, isWeekendDate } from "./time";
import type { Absence, Employee, EmploymentType, IsoDate, ShiftKind, StaffingRequirement } from "./types";

/** Jedno explicitní sdělení o dostupnosti; neuvedené položky nejsou automaticky dostupné. */
export interface MonthlyAvailability {
  readonly employeeId: string;
  readonly date: IsoDate;
  readonly shiftKind: ShiftKind;
  readonly available: boolean;
}

export interface MonthlyPlanningRange {
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
}

export type MonthlyRosterDay =
  | { readonly employeeId: string; readonly date: IsoDate; readonly status: "shift"; readonly startTime: string; readonly endTime: string; readonly shiftKind?: ShiftKind }
  | { readonly employeeId: string; readonly date: IsoDate; readonly status: "off" | "unknown" | "conflict" };

export interface MonthlyRosterSnapshot {
  readonly imports: readonly { readonly id: string; readonly version: number; readonly fingerprint: string }[];
  readonly days: readonly MonthlyRosterDay[];
}

/** Měsíční fond práce, který zadává manažer; aplikace výchozí hodnotu nedopočítává. */
export interface MonthlyWorkFund {
  readonly employeeId: string;
  /** Měsíční fond práce v hodinách. */
  readonly hours: number;
  /** Manažerem zadané hodiny započtené jako omluvené (např. schválená absence nebo svátek). */
  readonly excusedHours: number;
}

export interface MonthlyPlanningInput {
  readonly month: string;
  readonly employees: readonly Employee[];
  readonly absences: readonly Absence[];
  readonly availability: readonly MonthlyAvailability[];
  readonly staffingRequirements: readonly StaffingRequirement[];
  /** Doplňující pokyn pro AI, nikoli deterministické pravidlo. */
  readonly instructions: string;
  /** Schválené přání: střídat sousední pracovní směny i přes dny volna. */
  readonly shiftRotationPreference?: boolean;
  /** Volitelný měsíční fond práce; chybějící záznam znamená neověřené naplnění. */
  readonly workFunds?: readonly MonthlyWorkFund[];
  /** Souvislý úsek, který má plánovač vytvořit; absence zachovává celý měsíc. */
  readonly planningRange?: MonthlyPlanningRange;
  /** Serverem načtený podklad mimo rozsah plánování; surový roster se nepřikládá. */
  readonly rosterHistory?: MonthlyRosterSnapshot;
}

type InputResult = { readonly ok: true; readonly value: MonthlyPlanningInput } | { readonly ok: false; readonly message: string };
export const MAX_MONTHLY_EMPLOYEES = 200;
/** Technický strop pro jeden měsíc; nejde o pracovněprávní ani doménové pravidlo. */
export const MAX_WORK_FUND_HOURS = 1000;
const invalid = (message: string): InputResult => ({ ok: false, message });
const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const shift = (v: unknown): v is ShiftKind => v === "morning" || v === "afternoon";

function isMonthlyRosterSnapshot(value: unknown, dates: readonly string[], employeeIds: ReadonlySet<string>, employees: readonly { id: string; employmentType?: string }[] = []): value is MonthlyRosterSnapshot {
  if (!record(value) || !Array.isArray(value.imports) || !Array.isArray(value.days)) return false;
  const importIds = new Set<string>();
  for (const item of value.imports) {
    if (!record(item) || typeof item.id !== "string" || !item.id.trim() || importIds.has(item.id)
      || !Number.isSafeInteger(item.version) || (item.version as number) < 1
      || typeof item.fingerprint !== "string" || !/^[a-f0-9]{64}$/.test(item.fingerprint)) return false;
    importIds.add(item.id);
  }
  const expected = new Set([...employeeIds].flatMap((employeeId) => dates.map((date) => `${employeeId}|${date}`)));
  if (value.days.length !== expected.size) return false;
  const seen = new Set<string>();
  for (const item of value.days) {
    if (!record(item) || typeof item.employeeId !== "string" || !employeeIds.has(item.employeeId)
      || typeof item.date !== "string" || !dates.includes(item.date)) return false;
    const key = `${item.employeeId}|${item.date}`;
    if (!expected.has(key) || seen.has(key)) return false;
    seen.add(key);
    if (item.status === "shift") {
      if (!isLocalTime(item.startTime) || !isLocalTime(item.endTime) || item.startTime >= item.endTime
        || (item.shiftKind !== undefined && !shift(item.shiftKind))) return false;
      if (item.shiftKind === undefined && (
        getZonedDateTimeStatus(item.date as IsoDate, item.startTime, DEFAULT_TIME_ZONE) !== "valid"
        || getZonedDateTimeStatus(item.date as IsoDate, item.endTime, DEFAULT_TIME_ZONE) !== "valid"
      )) return false;
      if (item.shiftKind) {
        const employee = employees.find((e) => e.id === item.employeeId);
        const employmentType = (employee?.employmentType === "part_time" ? "part_time" : "full_time") as EmploymentType;
        const window = getConfirmedShiftWindow(item.shiftKind, isWeekendDate(item.date), employmentType);
        if (window.start !== item.startTime || window.end !== item.endTime) return false;
      }
    } else if (item.status !== "off" && item.status !== "unknown" && item.status !== "conflict") return false;
  }
  return seen.size === expected.size;
}

/** Kontrola tvaru a vzájemných odkazů vstupu před voláním poskytovatele. */
export function validateMonthlyInput(value: unknown): InputResult {
  if (!record(value) || typeof value.month !== "string") return invalid("Chybí měsíc.");
  let dates: string[];
  try { dates = datesInMonth(value.month); } catch { return invalid("Měsíc není platný."); }
  if (!Array.isArray(value.employees) || value.employees.length === 0) return invalid("Zadejte zaměstnance.");
  if (value.employees.length > MAX_MONTHLY_EMPLOYEES) {
    return invalid(`Plán lze připravit nejvýše pro ${MAX_MONTHLY_EMPLOYEES} zaměstnanců.`);
  }
  const ids = new Set<string>();
  for (const employee of value.employees) {
    if (!record(employee) || typeof employee.id !== "string" || !employee.id.trim() || ids.has(employee.id) || typeof employee.displayName !== "string" || !employee.displayName.trim() || (employee.employmentType !== "full_time" && employee.employmentType !== "part_time")) return invalid("Zaměstnanec je neplatný nebo duplicitní.");
    ids.add(employee.id);
  }
  if (!Array.isArray(value.absences) || !Array.isArray(value.availability) || !Array.isArray(value.staffingRequirements) || typeof value.instructions !== "string") return invalid("Vstup nemá platný tvar.");
  if (value.shiftRotationPreference !== undefined && typeof value.shiftRotationPreference !== "boolean") return invalid("Preference střídání směn není platná.");
  if (value.workFunds !== undefined) {
    if (!Array.isArray(value.workFunds)) return invalid("Pracovní fond je neplatný.");
    const fundIds = new Set<string>();
    for (const fund of value.workFunds) {
      if (!record(fund) || typeof fund.employeeId !== "string" || !ids.has(fund.employeeId) || fundIds.has(fund.employeeId)
        || typeof fund.hours !== "number" || !Number.isFinite(fund.hours) || fund.hours < 0 || fund.hours > MAX_WORK_FUND_HOURS
        || typeof fund.excusedHours !== "number" || !Number.isFinite(fund.excusedHours) || fund.excusedHours < 0 || fund.excusedHours > MAX_WORK_FUND_HOURS) return invalid("Pracovní fond je neplatný.");
      fundIds.add(fund.employeeId);
    }
  }
  if (value.planningRange !== undefined) {
    if (!record(value.planningRange) || !isIsoDate(value.planningRange.startDate) || !isIsoDate(value.planningRange.endDate)
      || value.planningRange.startDate > value.planningRange.endDate
      || value.planningRange.startDate < dates[0] || value.planningRange.endDate > dates[dates.length - 1]) return invalid("Rozsah plánování musí být souvislý úsek uvnitř zvoleného měsíce.");
  }
  if (value.rosterHistory !== undefined && !isMonthlyRosterSnapshot(value.rosterHistory, dates, ids, value.employees as { id: string; employmentType?: string }[])) return invalid("Historie rosteru musí mít právě jeden platný záznam pro každý den každého zaměstnance.");
  const absenceIds = new Set<string>();
  for (const absence of value.absences) {
    if (!record(absence) || typeof absence.id !== "string" || !absence.id || absenceIds.has(absence.id) || typeof absence.employeeId !== "string" || !ids.has(absence.employeeId) || !isIsoDate(absence.from) || !isIsoDate(absence.to) || absence.from > absence.to || !["vacation", "sick", "other"].includes(String(absence.type)) || !["approved", "pending", "rejected"].includes(String(absence.status))) return invalid("Absence je neplatná.");
    absenceIds.add(absence.id);
  }
  const dateSet = new Set(dates);
  const availabilityKeys = new Set<string>();
  for (const item of value.availability) {
    if (!record(item) || typeof item.employeeId !== "string" || !ids.has(item.employeeId) || typeof item.date !== "string" || !dateSet.has(item.date) || !shift(item.shiftKind) || typeof item.available !== "boolean") return invalid("Dostupnost je neplatná.");
    const key = `${item.employeeId}|${item.date}|${item.shiftKind}`;
    if (availabilityKeys.has(key)) return invalid("Dostupnost je duplicitní.");
    availabilityKeys.add(key);
  }
  const staffingKeys = new Set<string>();
  for (const item of value.staffingRequirements) {
    if (!record(item) || typeof item.date !== "string" || !dateSet.has(item.date) || !shift(item.shiftKind) || typeof item.requiredEmployees !== "number" || !Number.isSafeInteger(item.requiredEmployees) || item.requiredEmployees < 0) return invalid("Požadavek na obsazení je neplatný.");
    const key = `${item.date}|${item.shiftKind}`;
    if (staffingKeys.has(key)) return invalid("Požadavek na obsazení je duplicitní.");
    staffingKeys.add(key);
  }
  return { ok: true, value: value as unknown as MonthlyPlanningInput };
}
