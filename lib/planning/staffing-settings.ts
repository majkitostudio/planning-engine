import { isIsoDate, weekdayIndex } from "./domain/time";
import type { PlanningInput, ShiftKind } from "./domain/types";

export const DEFAULT_STAFFING_MINIMUMS: Readonly<Record<ShiftKind, number>> = {
  morning: 15,
  afternoon: 7,
};

export const STAFFING_SHIFT_KINDS: readonly ShiftKind[] = ["morning", "afternoon"];
export const STAFFING_DAY_COUNT = 7;

export interface StaffingSetting {
  readonly dayOfWeek: number;
  readonly shiftKind: ShiftKind;
  readonly requiredEmployees: number;
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
        requiredEmployees: DEFAULT_STAFFING_MINIMUMS[shiftKind],
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
  if (!isIsoDate(date)) return DEFAULT_STAFFING_MINIMUMS[shiftKind];

  return (
    settings.find(
      (setting) =>
        setting.dayOfWeek === weekdayIndex(date) && setting.shiftKind === shiftKind,
    )?.requiredEmployees ?? DEFAULT_STAFFING_MINIMUMS[shiftKind]
  );
}

/** Promítne uloženou týdenní šablonu do požadavků každé směny v týdnu. */
export function applyStaffingSettings(
  input: PlanningInput,
  settings: readonly StaffingSetting[],
): PlanningInput {
  return {
    ...input,
    staffingRequirements: input.staffingRequirements.map((requirement) => ({
      ...requirement,
      // Syntetické fixture používají nulu pro neaktivní sloty. Ty zůstávají
      // nulové; skutečně používaný požadavek se přepíše uloženou hodnotou.
      requiredEmployees:
        requirement.requiredEmployees > 0
          ? getStaffingRequirement(settings, requirement.date, requirement.shiftKind)
          : requirement.requiredEmployees,
    })),
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
