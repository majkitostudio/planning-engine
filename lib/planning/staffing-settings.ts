import { isIsoDate, weekdayIndex } from "./domain/time";
import type { PlanningInput, ShiftKind } from "./domain/types";

export const DEFAULT_STAFFING_MINIMUMS = {
  weekday: { morning: 23, afternoon: 8 },
  weekend: { morning: 12, afternoon: 9 },
};

export function getDefaultStaffingRequirement(dayOfWeek: number, shiftKind: ShiftKind): number {
  const profile = dayOfWeek >= 5 ? "weekend" : "weekday";
  return DEFAULT_STAFFING_MINIMUMS[profile][shiftKind];
}

export const STAFFING_SHIFT_KINDS: readonly ShiftKind[] = ["morning", "afternoon"];
export const STAFFING_DAY_COUNT = 7;

export interface StaffingSetting {
  readonly dayOfWeek: number;
  readonly shiftKind: ShiftKind;
  readonly requiredEmployees: number;
}

export type StaffingProfileStatus =
  | "complete"
  | "partial"
  | "missing"
  | "unavailable";

export function getStaffingProfileStatus(
  savedSettings: readonly StaffingSetting[],
  available = true,
): StaffingProfileStatus {
  if (!available) return "unavailable";
  const savedKeys = new Set(
    savedSettings.map((setting) => settingKey(setting.dayOfWeek, setting.shiftKind)),
  );
  if (savedKeys.size === STAFFING_DAY_COUNT * STAFFING_SHIFT_KINDS.length) {
    return "complete";
  }
  return savedKeys.size === 0 ? "missing" : "partial";
}

export type StaffingSettingsValidation =
  | { readonly ok: true; readonly settings: readonly StaffingSetting[] }
  | { readonly ok: false; readonly errors: readonly string[] };

/** Vrátí úplnou týdenní tabulku a chybějící položky doplní bezpečným minimem. */
export function getCompleteStaffingSettings(
  saved: readonly StaffingSetting[],
): readonly StaffingSetting[] {
  const savedByKey = new Map(
    saved.map((setting) => [settingKey(setting.dayOfWeek, setting.shiftKind), setting]),
  );

  return Array.from({ length: STAFFING_DAY_COUNT }, (_, dayOfWeek) =>
    STAFFING_SHIFT_KINDS.map((shiftKind) =>
      savedByKey.get(settingKey(dayOfWeek, shiftKind)) ?? {
        dayOfWeek,
        shiftKind,
        requiredEmployees: getDefaultStaffingRequirement(dayOfWeek, shiftKind),
      },
    ),
  ).flat();
}

/** Najde minimum pro kalendářní datum; neuložený den použije bezpečný fallback. */
export function getStaffingRequirement(
  settings: readonly StaffingSetting[],
  date: string,
  shiftKind: ShiftKind,
): number {
  if (!isIsoDate(date)) return DEFAULT_STAFFING_MINIMUMS.weekday[shiftKind];

  return (
    settings.find(
      (setting) =>
        setting.dayOfWeek === weekdayIndex(date) && setting.shiftKind === shiftKind,
    )?.requiredEmployees ?? getDefaultStaffingRequirement(weekdayIndex(date), shiftKind)
  );
}

/** Promítne uloženou týdenní šablonu do požadavků každé směny v týdnu. */
export function applyStaffingSettings(
  input: PlanningInput,
  settings: readonly StaffingSetting[],
  incident?: { readonly date: string; readonly shiftKind: ShiftKind },
): PlanningInput {
  const findSaved = (date: string, shiftKind: ShiftKind) => isIsoDate(date)
    ? settings.find((setting) => setting.dayOfWeek === weekdayIndex(date) && setting.shiftKind === shiftKind)
    : undefined;
  const staffingRequirements = input.staffingRequirements.flatMap((requirement) => {
    const isIncident = incident?.date === requirement.date && incident.shiftKind === requirement.shiftKind;
    // Nulové položky ukázky značí neaktivní směny; cílovou směnu ověříme vždy.
    if (requirement.requiredEmployees <= 0 && !isIncident) return [requirement];
    const saved = findSaved(requirement.date, requirement.shiftKind);
    return saved ? [{ ...requirement, requiredEmployees: saved.requiredEmployees }] : [];
  });
  if (incident && !input.staffingRequirements.some((item) => item.date === incident.date && item.shiftKind === incident.shiftKind)) {
    const saved = findSaved(incident.date, incident.shiftKind);
    if (saved) staffingRequirements.push({ date: incident.date, shiftKind: incident.shiftKind, requiredEmployees: saved.requiredEmployees });
  }
  return {
    ...input,
    staffingRequirements,
  };
}

/** Ověří JSON payload API bez důvěry v klientskou validaci formuláře. */
export function validateStaffingSettingsPayload(
  payload: unknown,
): StaffingSettingsValidation {
  if (!isRecord(payload) || !Array.isArray(payload.settings)) {
    return invalid("Payload musí obsahovat pole settings.");
  }

  const settings: StaffingSetting[] = [];
  const keys = new Set<string>();
  for (const [index, value] of payload.settings.entries()) {
    if (!isRecord(value)) {
      return invalid(`Položka ${index + 1} nemá platný tvar.`);
    }

    const { dayOfWeek, shiftKind, requiredEmployees } = value;
    if (
      typeof dayOfWeek !== "number" ||
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 0 ||
      dayOfWeek >= STAFFING_DAY_COUNT
    ) {
      return invalid(`Položka ${index + 1} má neplatný den.`);
    }
    if (shiftKind !== "morning" && shiftKind !== "afternoon") {
      return invalid(`Položka ${index + 1} má neplatný typ směny.`);
    }
    if (
      typeof requiredEmployees !== "number" ||
      !Number.isInteger(requiredEmployees) ||
      requiredEmployees < 0
    ) {
      return invalid(
        `Položka ${index + 1} musí být celé číslo větší nebo rovné nule.`,
      );
    }

    const key = settingKey(dayOfWeek, shiftKind);
    if (keys.has(key)) return invalid(`Položka ${index + 1} je duplicitní.`);
    keys.add(key);
    settings.push({ dayOfWeek, shiftKind, requiredEmployees });
  }

  if (settings.length !== STAFFING_DAY_COUNT * STAFFING_SHIFT_KINDS.length) {
    return invalid("Je nutné vyplnit všech sedm dnů a oba typy směn.");
  }

  return { ok: true, settings: getCompleteStaffingSettings(settings) };
}

function settingKey(dayOfWeek: number, shiftKind: ShiftKind): string {
  return `${dayOfWeek}|${shiftKind}`;
}

function invalid(...errors: string[]): StaffingSettingsValidation {
  return { ok: false, errors };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
