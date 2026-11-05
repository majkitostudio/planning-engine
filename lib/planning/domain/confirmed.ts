import type {
  EmploymentType,
  PlanningRules,
  ShiftDefinition,
  ShiftKind,
  ShiftWindow,
} from "./types";

/**
 * Potvrzené časy směn (`VERIFIED`, 24. 10. 2026).
 *
 * Víkendová ranní směna používá stejný čas jako ranní směna ve všední den,
 * protože dokumentace ani potvrzené rozhodnutí neuvádí jiný čas.
 */
export const CONFIRMED_SHIFT_DEFINITIONS = [
  {
    kind: "morning",
    weekday: { start: "07:45", end: "16:30" },
    weekend: { start: "07:45", end: "16:30" },
  },
  {
    kind: "afternoon",
    weekday: { start: "13:15", end: "21:00" },
    weekend: { start: "12:45", end: "21:00" },
  },
] as const satisfies readonly ShiftDefinition[];

/** Potvrzená pravidla první verze. Ostatní limity nejsou potvrzené. */
export const CONFIRMED_PLANNING_RULES = {
  consecutiveWorkingDaysBeforeLongRest: 6,
  longRestHours: 35,
  weekendWorkDaysOff: 2,
} as const satisfies PlanningRules;

/**
 * Časová zóna prvního řezu.
 *
 * Je to označený předpoklad (`ASSUMPTION`), ne potvrzené pravidlo. Do vstupu
 * se předává explicitně, aby se výpočty neopíraly o časové pásmo serveru.
 */
export const DEFAULT_TIME_ZONE = "Europe/Prague";

/** Najde potvrzenou definici směny; neznámý druh je chyba volajícího. */
export function getShiftWindow(
  definitions: readonly ShiftDefinition[],
  kind: ShiftKind,
  isWeekend: boolean,
): ShiftWindow {
  const definition = definitions.find((item) => item.kind === kind);
  if (!definition) {
    throw new RangeError(`Chybí definice směny "${kind}".`);
  }
  return isWeekend ? definition.weekend : definition.weekday;
}

/**
 * Potvrzené časy směn pro poloviční úvazek (VERIFIED, 5. 11. 2026).
 * Ve všední den: ranní 7:45–15:00, odpolední 15:00–21:00.
 * O víkendu se používají plnoúvazkové časy (7:45–16:30, 12:45–21:00).
 */
export function getPartTimeShiftWindow(kind: ShiftKind, isWeekend: boolean): ShiftWindow {
  if (isWeekend) {
    return getShiftWindow(CONFIRMED_SHIFT_DEFINITIONS, kind, true);
  }
  if (kind === "morning") return { start: "07:45", end: "15:00" };
  if (kind === "afternoon") return { start: "15:00", end: "21:00" };
  throw new RangeError(`Neznámý druh směny "${kind}".`);
}

/**
 * Vrátí potvrzený časový interval směny podle druhu úvazku.
 */
export function getConfirmedShiftWindow(kind: ShiftKind, isWeekend: boolean, employmentType: EmploymentType): ShiftWindow {
  if (employmentType === "part_time") {
    return getPartTimeShiftWindow(kind, isWeekend);
  }
  return getShiftWindow(CONFIRMED_SHIFT_DEFINITIONS, kind, isWeekend);
}
