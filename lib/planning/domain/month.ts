import { addDays, weekdayIndex } from "./time";
import type { IsoDate } from "./types";

/** Kalendářní dny platného měsíce v podobě YYYY-MM. */
export function datesInMonth(month: string): IsoDate[] {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match || Number(match[1]) < 100) {
    throw new RangeError(`Neplatný měsíc "${month}".`);
  }
  const first = `${month}-01`;
  const count = new Date(Date.UTC(Number(match[1]), Number(match[2]), 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) => addDays(first, index));
}

/** Pondělí všech týdnů, které zasahují do měsíce. */
export function monthWeekStarts(month: string): IsoDate[] {
  const dates = datesInMonth(month);
  const first = dates[0];
  const last = dates[dates.length - 1];
  const result: IsoDate[] = [];
  for (let start = addDays(first, -weekdayIndex(first)); start <= last; start = addDays(start, 7)) {
    result.push(start);
  }
  return result;
}
