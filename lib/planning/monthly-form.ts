import { datesInMonth } from "./domain/month";
import { weekdayIndex } from "./domain/time";
import { validateMonthlyInput, type MonthlyAvailability, type MonthlyPlanningInput } from "./domain/month-input";
import type { Absence, ShiftKind } from "./domain/types";
import type { StaffingSetting } from "./staffing-settings";

export interface MonthlyFormData {
  readonly month: string;
  readonly employees: readonly { id: string; name: string; availableAllMonth: boolean }[];
  readonly absences: readonly Absence[];
  readonly availability: readonly MonthlyAvailability[];
  /** Pondělí až neděle, každému dni odpovídá ranní a odpolední směna. */
  readonly staffing: readonly string[];
  readonly instructions: string;
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
  for (const employee of form.employees) if (employee.availableAllMonth) {
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
