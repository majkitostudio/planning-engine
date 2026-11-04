import { DEFAULT_TIME_ZONE } from "./domain/confirmed";
import { getZonedDateTimeStatus, isIsoDate, weekdayIndex } from "./domain/time";
import { datesInMonth } from "./domain/month";

export interface RosterImportEmployeeReference {
  readonly id: string;
  readonly displayName: string;
}

export type RosterImportDay =
  | { readonly status: "shift"; readonly startTime: string; readonly endTime: string; readonly sourceCell: string }
  | { readonly status: "off"; readonly sourceCell: string }
  | { readonly status: "unknown"; readonly reason: "blank" | "unsupported_cell"; readonly sourceCell?: string };

export interface RosterImportPreviewEmployee {
  readonly sourceName: string;
  readonly employeeId: string | null;
  readonly match: "exact" | "unmatched" | "ambiguous";
  readonly days: Readonly<Record<string, RosterImportDay>>;
}

export type RosterImportResult =
  | { readonly ok: true; readonly month: string; readonly employees: readonly RosterImportPreviewEmployee[] }
  | { readonly ok: false; readonly code: "invalid_month" | "invalid_csv" | "invalid_header" | "header_month_mismatch" | "invalid_row" | "invalid_shift_time" | "duplicate_person" };

const weekdayByLabel: Readonly<Record<string, number>> = { po: 0, ut: 1, st: 2, ct: 3, pa: 4, so: 5, ne: 6 };
const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("cs-CZ");
const isClockTime = (value: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

/** Parse semicolon-delimited CSV, including quoted delimiters, quotes, and line breaks. */
function parseSemicolonCsv(text: string): string[][] | null {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { cell += '"'; index++; }
      else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"') {
      if (cell.length) return null;
      quoted = true;
    } else if (char === ";") {
      row.push(cell); cell = "";
    } else if (char === "\n" || char === "\r") {
      row.push(cell); cell = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      if (char === "\r" && source[index + 1] === "\n") index++;
    } else cell += char;
  }
  if (quoted) return null;
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function headerDates(header: readonly string[], month: string): readonly string[] | null {
  const dates = datesInMonth(month);
  const dayHeaders = header.slice(1).filter((value, index) => index < dates.length && value.trim());
  if (dayHeaders.length !== dates.length || header.length < dates.length + 1) return null;
  const parsed: string[] = [];
  for (let index = 0; index < dates.length; index++) {
    const match = /^(\d{1,2})\s+([A-Za-zÀ-ž]{2,3})$/u.exec(header[index + 1].trim());
    if (!match || Number(match[1]) !== index + 1) return null;
    const label = normalize(match[2]).slice(0, 2);
    if (!(label in weekdayByLabel) || weekdayByLabel[label] !== weekdayIndex(dates[index])) return null;
    parsed.push(dates[index]);
  }
  return parsed;
}

/**
 * Converts the observed monthly CSV export to an in-memory preview. Names and source cells
 * remain in the returned preview only; the caller chooses which explicit facts to save.
 */
export function parseRosterCsv(
  text: string,
  month: string,
  references: readonly RosterImportEmployeeReference[],
): RosterImportResult {
  if (!/^\d{4}-\d{2}$/.test(month) || !isIsoDate(`${month}-01`)) return { ok: false, code: "invalid_month" };
  if (typeof text !== "string" || !text.trim() || text.length > 5_000_000) return { ok: false, code: "invalid_csv" };
  const rows = parseSemicolonCsv(text);
  if (!rows || rows.length < 2) return { ok: false, code: "invalid_csv" };
  const dates = headerDates(rows[0], month);
  if (!dates) {
    const dayNumbers = rows[0].slice(1).map((cell) => /^(\d{1,2})\s+/.exec(cell.trim())?.[1]).filter(Boolean);
    const code = dayNumbers.length ? "header_month_mismatch" : "invalid_header";
    return { ok: false, code };
  }

  const indexes = new Map<string, RosterImportEmployeeReference[]>();
  for (const reference of references) {
    const key = normalize(reference.displayName);
    indexes.set(key, [...(indexes.get(key) ?? []), reference]);
  }

  const employees: RosterImportPreviewEmployee[] = [];
  const sourceNames = new Set<string>();
  for (const sourceRow of rows.slice(1)) {
    if (sourceRow.length > dates.length + 1 && sourceRow.slice(dates.length + 1).some((value) => value.trim())) return { ok: false, code: "invalid_row" };
    const name = sourceRow[0]?.trim();
    if (!name) {
      if (sourceRow.slice(1, dates.length + 1).some((value) => value.trim())) return { ok: false, code: "invalid_row" };
      continue;
    }
    const cells = Array.from({ length: dates.length }, (_, index) => sourceRow[index + 1]?.trim() ?? "");
    if (/^\d+\s*:/.test(name) && cells.every((cell) => !cell)) continue;
    const normalizedName = normalize(name);
    if (sourceNames.has(normalizedName)) return { ok: false, code: "duplicate_person" };
    sourceNames.add(normalizedName);

    const matches = indexes.get(normalizedName) ?? [];
    const match = matches.length === 1 ? "exact" : matches.length > 1 ? "ambiguous" : "unmatched";
    const days: Record<string, RosterImportDay> = {};
    for (let index = 0; index < dates.length; index++) {
      const sourceCell = cells[index];
      if (!sourceCell) { days[dates[index]] = { status: "unknown", reason: "blank" }; continue; }
      if (normalize(sourceCell) === "volno") { days[dates[index]] = { status: "off", sourceCell }; continue; }
      const shift = /^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})$/.exec(sourceCell);
      if (shift) {
        const startTime = shift[1].padStart(5, "0");
        const endTime = shift[2].padStart(5, "0");
        if (!isClockTime(startTime) || !isClockTime(endTime) || startTime >= endTime
          || getZonedDateTimeStatus(dates[index], startTime, DEFAULT_TIME_ZONE) !== "valid"
          || getZonedDateTimeStatus(dates[index], endTime, DEFAULT_TIME_ZONE) !== "valid") return { ok: false, code: "invalid_shift_time" };
        days[dates[index]] = { status: "shift", startTime, endTime, sourceCell };
      } else days[dates[index]] = { status: "unknown", reason: "unsupported_cell", sourceCell };
    }
    employees.push({ sourceName: name, employeeId: matches.length === 1 ? matches[0].id : null, match, days });
  }
  if (!employees.length) return { ok: false, code: "invalid_row" };
  return { ok: true, month, employees };
}
