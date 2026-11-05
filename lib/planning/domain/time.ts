import { getShiftWindow, getPartTimeShiftWindow } from "./confirmed";
import type {
  EmploymentType,
  IsoDate,
  LocalTime,
  ShiftDefinition,
  ShiftKind,
  ShiftWindow,
} from "./types";

/** Absolutní časové rozmezí směny včetně přechodu přes půlnoc. */
export interface ShiftInterval {
  readonly startMs: number;
  readonly endMs: number;
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
  readonly window: ShiftWindow;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const formatterCache = new Map<string, Intl.DateTimeFormat>();
const zonedDateTimeStatusCache = new Map<string, ZonedDateTimeStatus>();
export type ZonedDateTimeStatus = "valid" | "nonexistent" | "ambiguous";

/** Ověří kalendářní datum `YYYY-MM-DD`; neplatné datum (např. 2026-02-30) odmítne. */
export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string") return false;
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Ověří místní čas `HH:mm` v rozsahu 00:00–23:59. */
export function isLocalTime(value: unknown): value is LocalTime {
  return typeof value === "string" && LOCAL_TIME_PATTERN.test(value);
}

/** Rozloží platné datum na části. Neplatné datum je chyba volajícího. */
export function parseIsoDate(value: IsoDate): {
  readonly year: number;
  readonly month: number;
  readonly day: number;
} {
  if (!isIsoDate(value)) {
    throw new RangeError(`Neplatné datum "${value}".`);
  }
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) {
    throw new RangeError(`Neplatné datum "${value}".`);
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

/** Rozloží platný místní čas na hodiny a minuty. */
export function parseLocalTime(value: LocalTime): {
  readonly hour: number;
  readonly minute: number;
} {
  if (!isLocalTime(value)) {
    throw new RangeError(`Neplatný místní čas "${value}".`);
  }
  const match = LOCAL_TIME_PATTERN.exec(value);
  if (!match) {
    throw new RangeError(`Neplatný místní čas "${value}".`);
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/** Převede místní čas na minuty od půlnoci. */
export function timeToMinutes(value: LocalTime): number {
  const { hour, minute } = parseLocalTime(value);
  return hour * 60 + minute;
}

/** Přidá kalendářní dny k datu. */
export function addDays(date: IsoDate, days: number): IsoDate {
  const { year, month, day } = parseIsoDate(date);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

/** Index dne v týdnu: pondělí = 0, neděle = 6. */
export function weekdayIndex(date: IsoDate): number {
  const { year, month, day } = parseIsoDate(date);
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (jsDay + 6) % 7;
}

/** Je datum sobota nebo neděle? */
export function isWeekendDate(date: IsoDate): boolean {
  return weekdayIndex(date) >= 5;
}

/** Všech sedm kalendářních dnů týdne začínajícího pondělím. */
export function datesInWeek(weekStart: IsoDate): IsoDate[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

/**
 * Převede místní datum a čas v časové zóně na UTC milisekundy.
 *
 * Čas se přijme pouze tehdy, pokud v dané zóně určuje právě jeden okamžik.
 * Neexistující a opakované místní časy při změně času se odmítnou.
 */
export function zonedDateTimeToUtcMs(
  date: IsoDate,
  time: LocalTime,
  timeZone: string,
): number {
  const { year, month, day } = parseIsoDate(date);
  const { hour, minute } = parseLocalTime(time);
  const naiveUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  const status = getZonedDateTimeStatus(date, time, timeZone);
  if (status !== "valid") {
    throw new RangeError(`Místní čas ${date} ${time} v zóně ${timeZone} je ${status === "ambiguous" ? "nejednoznačný" : "neexistující"}.`);
  }

  const firstOffset = getTimeZoneOffsetMs(naiveUtcMs, timeZone);
  let candidate = naiveUtcMs - firstOffset;
  const secondOffset = getTimeZoneOffsetMs(candidate, timeZone);
  if (secondOffset !== firstOffset) {
    candidate = naiveUtcMs - secondOffset;
  }
  return candidate;
}

/** Určí, zda místní datum a čas odpovídají jednomu okamžiku v časové zóně. */
export function getZonedDateTimeStatus(
  date: IsoDate,
  time: LocalTime,
  timeZone: string,
): ZonedDateTimeStatus {
  const cacheKey = `${timeZone}|${date}|${time}`;
  const cached = zonedDateTimeStatusCache.get(cacheKey);
  if (cached) return cached;

  const { year, month, day } = parseIsoDate(date);
  const { hour, minute } = parseLocalTime(time);
  const localAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const sampleOffsets = [-36, 0, 36].map((hours) =>
    getTimeZoneOffsetMs(localAsUtcMs + hours * 60 * 60 * 1000, timeZone),
  );
  const candidates = new Set<number>();

  for (const offset of new Set(sampleOffsets)) {
    const candidate = localAsUtcMs - offset;
    if (getLocalDateTimeAsUtcMs(candidate, timeZone) === localAsUtcMs) {
      candidates.add(candidate);
    }
  }

  const status = candidates.size === 0
    ? "nonexistent"
    : candidates.size === 1 ? "valid" : "ambiguous";
  zonedDateTimeStatusCache.set(cacheKey, status);
  if (zonedDateTimeStatusCache.size > 4096) {
    const oldestKey = zonedDateTimeStatusCache.keys().next().value;
    if (oldestKey) zonedDateTimeStatusCache.delete(oldestKey);
  }
  return status;
}

/** Vytvoří absolutní interval směny; konec po půlnoci se posune na další den. */
export function getShiftInterval(
  date: IsoDate,
  kind: ShiftKind,
  definitions: readonly ShiftDefinition[],
  timeZone: string,
  employmentType: EmploymentType = "full_time",
): ShiftInterval {
  const window = employmentType === "part_time"
    ? getPartTimeShiftWindow(kind, isWeekendDate(date))
    : getShiftWindow(definitions, kind, isWeekendDate(date));
  if (timeToMinutes(window.start) === timeToMinutes(window.end)) {
    throw new RangeError(`Směna "${kind}" má stejný začátek a konec.`);
  }

  const startMs = zonedDateTimeToUtcMs(date, window.start, timeZone);
  let endMs = zonedDateTimeToUtcMs(date, window.end, timeZone);
  let endDate = date;

  if (endMs <= startMs) {
    endDate = addDays(date, 1);
    endMs = zonedDateTimeToUtcMs(endDate, window.end, timeZone);
  }

  return { startMs, endMs, startDate: date, endDate, window };
}

/** Lidsky čitelná délka z minut, např. `34 h 45 min`. */
export function formatDurationMinutes(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes);
  const sign = rounded < 0 ? "-" : "";
  const absolute = Math.abs(rounded);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return `${sign}${hours} h ${String(minutes).padStart(2, "0")} min`;
}

function getTimeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const formatter = getFormatter(timeZone);
  const parts = formatter.formatToParts(new Date(utcMs));
  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  const asUtcMs = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return asUtcMs - utcMs;
}

function getLocalDateTimeAsUtcMs(utcMs: number, timeZone: string): number {
  const parts = getFormatter(timeZone).formatToParts(new Date(utcMs));
  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }
  return Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
}

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
}
