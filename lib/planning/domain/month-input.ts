import { datesInMonth } from "./month";
import { isIsoDate } from "./time";
import type { Absence, Employee, IsoDate, ShiftKind, StaffingRequirement } from "./types";

/** Jedno explicitní sdělení o dostupnosti; neuvedené položky nejsou automaticky dostupné. */
export interface MonthlyAvailability {
  readonly employeeId: string;
  readonly date: IsoDate;
  readonly shiftKind: ShiftKind;
  readonly available: boolean;
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
}

type InputResult = { readonly ok: true; readonly value: MonthlyPlanningInput } | { readonly ok: false; readonly message: string };
const invalid = (message: string): InputResult => ({ ok: false, message });
const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const shift = (v: unknown): v is ShiftKind => v === "morning" || v === "afternoon";

/** Kontrola tvaru a vzájemných odkazů vstupu před voláním poskytovatele. */
export function validateMonthlyInput(value: unknown): InputResult {
  if (!record(value) || typeof value.month !== "string") return invalid("Chybí měsíc.");
  let dates: string[];
  try { dates = datesInMonth(value.month); } catch { return invalid("Měsíc není platný."); }
  if (!Array.isArray(value.employees) || value.employees.length === 0) return invalid("Zadejte zaměstnance.");
  const ids = new Set<string>();
  for (const employee of value.employees) {
    if (!record(employee) || typeof employee.id !== "string" || !employee.id.trim() || ids.has(employee.id) || typeof employee.displayName !== "string" || !employee.displayName.trim() || employee.employmentType !== "full_time") return invalid("Zaměstnanec je neplatný nebo duplicitní.");
    ids.add(employee.id);
  }
  if (!Array.isArray(value.absences) || !Array.isArray(value.availability) || !Array.isArray(value.staffingRequirements) || typeof value.instructions !== "string") return invalid("Vstup nemá platný tvar.");
  if (value.shiftRotationPreference !== undefined && typeof value.shiftRotationPreference !== "boolean") return invalid("Preference střídání směn není platná.");
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
