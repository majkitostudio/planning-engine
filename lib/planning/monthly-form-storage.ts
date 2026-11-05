import type { Absence, ShiftKind } from "./domain/types";
import type { MonthlyFormData, PartialAbsence } from "./monthly-form";

export interface MonthlyFormSnapshot {
  readonly employees: MonthlyFormData["employees"];
  readonly name: string;
  readonly absences: readonly Absence[];
  readonly partialAbsences: readonly (PartialAbsence & { id: string })[];
  readonly staffing: readonly string[];
  readonly instructions: string;
  readonly shiftRotationPreference: boolean;
  readonly partialMonth: boolean;
  readonly rangeStart: string;
  readonly rangeEnd: string;
  readonly employeeId: string;
  readonly date: string;
  readonly endDate: string;
  readonly absenceShift: ShiftKind | "full_day";
  readonly step: number;
}

type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export interface FormLockManager { request<T>(name: string, callback: () => T | PromiseLike<T>): Promise<T> }
type AtomicResult = { status: "saved"; raw: string | null } | { status: "conflict" | "unavailable" | "cancelled" };
type LoadResult = { status: "empty"; raw: null } | { status: "invalid"; raw: string } | { status: "unavailable" } | { status: "found"; raw: string; value: MonthlyFormSnapshot };
export const monthlyFormStorageKey = (userId: string, month: string) => `planning-monthly-input:v1:${encodeURIComponent(userId)}:${month}`;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const strings = (item: Record<string, unknown>, keys: readonly string[]) => keys.every((name) => typeof item[name] === "string");

function isSnapshot(value: unknown): value is MonthlyFormSnapshot {
  if (!record(value) || !strings(value, ["name", "instructions", "rangeStart", "rangeEnd", "employeeId", "date", "endDate"])) return false;
  if (typeof value.shiftRotationPreference !== "boolean" || typeof value.partialMonth !== "boolean" || !Number.isInteger(value.step) || Number(value.step) < 0 || Number(value.step) > 4) return false;
  if (!["full_day", "morning", "afternoon"].includes(String(value.absenceShift))) return false;
  if (!Array.isArray(value.staffing) || value.staffing.length !== 14 || !value.staffing.every((item) => typeof item === "string")) return false;
  if (!Array.isArray(value.employees) || !value.employees.every((item) => record(item) && strings(item, ["id", "name"]))) return false;
  if (!Array.isArray(value.absences) || !value.absences.every((item) => record(item) && strings(item, ["id", "employeeId", "from", "to"]) && ["other", "sick", "vacation"].includes(String(item.type)) && ["approved", "pending", "rejected"].includes(String(item.status)))) return false;
  return Array.isArray(value.partialAbsences) && value.partialAbsences.every((item) => record(item) && strings(item, ["id", "employeeId", "from", "to"]) && (item.shiftKind === "morning" || item.shiftKind === "afternoon"));
}

export function loadMonthlyForm(storage: BrowserStorage, userId: string, month: string): LoadResult {
  let raw: string | null;
  try { raw = storage.getItem(monthlyFormStorageKey(userId, month)); } catch { return { status: "unavailable" }; }
  if (raw === null) return { status: "empty", raw: null };
  try {
    const parsed: unknown = JSON.parse(raw);
    return record(parsed) && parsed.version === 1 && isSnapshot(parsed.data) ? { status: "found", raw, value: parsed.data } : { status: "invalid", raw };
  } catch { return { status: "invalid", raw }; }
}

export async function saveMonthlyFormAtomically(
  storage: BrowserStorage, locks: FormLockManager | undefined, userId: string, month: string,
  value: MonthlyFormSnapshot | null, expected: string | null, force = false, shouldWrite: () => boolean = () => true,
): Promise<AtomicResult> {
  const storageKey = monthlyFormStorageKey(userId, month);
  if (!locks) {
    // Bez koordinace v tomto prostředí nezapisujeme. Výslovné odstranění
    // zůstává možné, pokud se uložený obsah mezitím nezměnil.
    if (value !== null) return { status: "unavailable" };
    try {
      if (!shouldWrite()) return { status: "cancelled" };
      if (!force && storage.getItem(storageKey) !== expected) return { status: "conflict" };
      storage.removeItem(storageKey);
      return { status: "saved", raw: null };
    } catch { return { status: "unavailable" }; }
  }
  try {
    return await locks.request(storageKey, () => {
      if (!shouldWrite()) return { status: "cancelled" as const };
      if (!force && storage.getItem(storageKey) !== expected) return { status: "conflict" as const };
      if (value === null) { storage.removeItem(storageKey); return { status: "saved" as const, raw: null }; }
      const raw = JSON.stringify({ version: 1, data: value });
      storage.setItem(storageKey, raw);
      return { status: "saved" as const, raw };
    });
  } catch { return { status: "unavailable" }; }
}
