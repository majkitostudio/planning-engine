import { datesInMonth } from "./domain/month";
import { weekdayIndex } from "./domain/time";
import { validateMonthlyInput, type MonthlyAvailability, type MonthlyPlanningInput } from "./domain/month-input";
import type { Absence, ShiftKind } from "./domain/types";
import type { StaffingSetting } from "./staffing-settings";

export interface PartialAbsence {
  readonly employeeId: string;
  readonly from: string;
  readonly to: string;
  readonly shiftKind: ShiftKind;
}

/** Částečné absence se kontrolují jako nedostupnost konkrétní směny. */
export function partialAbsenceAvailability(month: string, absences: readonly PartialAbsence[]): MonthlyAvailability[] {
  const entries = new Map<string, MonthlyAvailability>();
  for (const absence of absences) for (const date of datesInMonth(month)) {
    if (date < absence.from || date > absence.to) continue;
    const entry = { employeeId: absence.employeeId, date, shiftKind: absence.shiftKind, available: false };
    entries.set(`${entry.employeeId}|${date}|${entry.shiftKind}`, entry);
  }
  return [...entries.values()];
}

export interface MonthlyFormData {
  readonly month: string;
  readonly employees: readonly { id: string; name: string }[];
  readonly absences: readonly Absence[];
  readonly availability: readonly MonthlyAvailability[];
  /** Pondělí až neděle, každému dni odpovídá ranní a odpolední směna. */
  readonly staffing: readonly string[];
  readonly instructions: string;
}

export interface MonthlyFormReadiness {
  readonly month: string;
  readonly employeeCount: number;
  readonly absenceCount: number;
  readonly availabilityCount: number;
  readonly filledStaffingCount: number;
  readonly missing: readonly string[];
  readonly warnings: readonly string[];
}

/** Souhrn povinných polí před odesláním celoměsíčního návrhu. */
export function monthlyFormReadiness(form: MonthlyFormData): MonthlyFormReadiness {
  const missing: string[] = [];
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(form.month)) missing.push("Vyberte platný kalendářní měsíc.");
  if (form.employees.length === 0) missing.push("Přidejte alespoň jednoho zaměstnance.");
  const filledStaffingCount = form.staffing.filter((value) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value))).length;
  if (form.staffing.length !== 14 || filledStaffingCount !== 14) missing.push("Vyplňte požadované obsazení pro všech 7 dnů a obě směny.");
  const prepared = buildMonthlyFormInput(form);
  if (!prepared.ok && !missing.includes(prepared.message)) missing.push(prepared.message);
  const warnings: string[] = [];
  if (form.employees.length > 0 && form.staffing.length === 14 && filledStaffingCount === 14) {
    const demand = form.staffing.reduce((sum, value) => sum + Number(value), 0);
    const capacity = form.employees.length * 5;
    if (demand > capacity) warnings.push(`V úplném týdnu požadujete ${demand} směn, ale ${form.employees.length} zaměstnanců může podle víkendového volna a překryvu směn pokrýt nejvýše ${capacity}. Absence a další omezení mohou kapacitu dále snížit.`);
  }
  return {
    month: form.month,
    employeeCount: form.employees.length,
    absenceCount: form.absences.length,
    availabilityCount: form.availability.length,
    filledStaffingCount,
    missing: [...new Set(missing)],
    warnings,
  };
}

export function staffingFormValues(settings: readonly StaffingSetting[] | null): string[] {
  return Array.from({ length: 14 }, (_, index) => {
    const item = settings?.find((setting) => setting.dayOfWeek === Math.floor(index / 2) && setting.shiftKind === (index % 2 === 0 ? "morning" : "afternoon"));
    return item ? String(item.requiredEmployees) : "";
  });
}

export function buildMonthlyFormInput(form: MonthlyFormData): { ok: true; value: MonthlyPlanningInput } | { ok: false; message: string } {
  let dates: string[];
  try { dates = datesInMonth(form.month); } catch { return { ok: false, message: "Vyberte platný měsíc." }; }
  if (form.staffing.length !== 14 || form.staffing.some((value) => !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))) return { ok: false, message: "Vyplňte nezáporný počet pro každou směnu v týdnu." };
  const availability = new Map<string, MonthlyAvailability>();
  const key = (entry: MonthlyAvailability) => `${entry.employeeId}|${entry.date}|${entry.shiftKind}`;
  for (const employee of form.employees) {
    for (const date of dates) for (const shiftKind of ["morning", "afternoon"] as const) {
      const entry = { employeeId: employee.id, date, shiftKind, available: true };
      availability.set(key(entry), entry);
    }
  }
  const exceptions = new Set<string>();
  for (const entry of form.availability) {
    if (exceptions.has(key(entry))) return { ok: false, message: "Dostupnost stejné směny je zadaná vícekrát." };
    exceptions.add(key(entry));
    availability.set(key(entry), entry);
  }
  for (const absence of form.absences) if (absence.status === "approved") {
    for (const date of dates) if (absence.from <= date && date <= absence.to) {
      for (const shiftKind of ["morning", "afternoon"] as const) {
        const entry = { employeeId: absence.employeeId, date, shiftKind, available: false };
        availability.set(key(entry), entry);
      }
    }
  }
  const input: MonthlyPlanningInput = {
    month: form.month,
    employees: form.employees.map((employee) => ({ id: employee.id, displayName: employee.name.trim(), employmentType: "full_time" })),
    absences: form.absences,
    availability: [...availability.values()],
    staffingRequirements: dates.flatMap((date) => (["morning", "afternoon"] as ShiftKind[]).map((shiftKind, index) => ({ date, shiftKind, requiredEmployees: Number(form.staffing[weekdayIndex(date) * 2 + index]) }))),
    instructions: form.instructions,
  };
  return validateMonthlyInput(input);
}
