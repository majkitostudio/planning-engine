/**
 * SYNTETICKÁ DEMONSTRAČNÍ DATA PRO UI.
 *
 * Všechna jména a čísla jsou smyšlená a slouží výhradně k vizuální ukázce
 * rozvržení. Nejedná se o skutečný rozpis, schválená provozní pravidla ani
 * zaměstnanecká data. Časy směn se odvozují z potvrzených konstant, aby se
 * demo UI nerozešlo s doménovým kontraktem.
 */

import {
  CONFIRMED_SHIFT_DEFINITIONS,
  getShiftWindow,
} from "./planning/domain/confirmed";

export type ShiftKind = "morning" | "afternoon" | "off" | "vacation" | "sick";

export type DemoEmployee = {
  id: string;
  name: string;
  role: string;
  color: string;
  status: "ok" | "warning" | "conflict";
  /** 7 položek: pondělí až neděle. */
  shifts: ShiftKind[];
};

export type DemoStat = {
  key: string;
  label: string;
  value: string;
  meta?: string;
  trend?: "up" | "down" | "flat";
  detail?: boolean;
  icon: "users" | "checkCircle" | "alert" | "clipboard";
  tone: "blue" | "green" | "red" | "amber";
};

function formatWindow(kind: "morning" | "afternoon", isWeekend: boolean): string {
  const window = getShiftWindow(CONFIRMED_SHIFT_DEFINITIONS, kind, isWeekend);
  return `${window.start}–${window.end}`;
}

export const SHIFT_META: Record<
  ShiftKind,
  { label: string; weekendLabel: string; className: string; option: string }
> = {
  morning: {
    label: formatWindow("morning", false),
    weekendLabel: formatWindow("morning", true),
    className: "shift--morning",
    option: `Ranní (${formatWindow("morning", false)})`,
  },
  afternoon: {
    label: formatWindow("afternoon", false),
    weekendLabel: formatWindow("afternoon", true),
    className: "shift--afternoon",
    option: `Odpolední (${formatWindow("afternoon", false)} / víkend ${formatWindow("afternoon", true)})`,
  },
  off: {
    label: "Volno",
    weekendLabel: "Volno",
    className: "shift--off",
    option: "Volno",
  },
  vacation: {
    label: "Dovolená",
    weekendLabel: "Dovolená",
    className: "shift--vacation",
    option: "Dovolená",
  },
  sick: {
    label: "Nemoc",
    weekendLabel: "Nemoc",
    className: "shift--sick",
    option: "Nemoc",
  },
};

const M: ShiftKind = "morning";
const A: ShiftKind = "afternoon";
const O: ShiftKind = "off";
const V: ShiftKind = "vacation";
const S: ShiftKind = "sick";

export const DEMO_EMPLOYEES: DemoEmployee[] = [
  {
    id: "e1",
    name: "Jan Novák",
    role: "Operátor",
    color: "blue",
    status: "ok",
    shifts: [M, M, M, M, M, O, O],
  },
  {
    id: "e2",
    name: "Petra Dvořáková",
    role: "Operátor",
    color: "purple",
    status: "warning",
    shifts: [M, M, M, M, A, A, O],
  },
  {
    id: "e3",
    name: "Lucie Svobodová",
    role: "Operátor",
    color: "rose",
    status: "ok",
    shifts: [A, A, O, M, M, M, A],
  },
  {
    id: "e4",
    name: "Tomáš Malý",
    role: "Operátor",
    color: "orange",
    status: "ok",
    shifts: [M, M, M, M, M, O, O],
  },
  {
    id: "e5",
    name: "Eva Černá",
    role: "Operátor",
    color: "green",
    status: "warning",
    shifts: [M, M, A, A, A, O, O],
  },
  {
    id: "e6",
    name: "Martin Procházka",
    role: "Operátor",
    color: "indigo",
    status: "conflict",
    shifts: [A, A, A, A, A, O, O],
  },
  {
    id: "e7",
    name: "Jana Kovářová",
    role: "Operátor",
    color: "teal",
    status: "ok",
    shifts: [M, M, M, V, V, O, O],
  },
  {
    id: "e8",
    name: "David Šimek",
    role: "Supervizor",
    color: "amber",
    status: "ok",
    shifts: [M, M, M, M, A, A, O],
  },
  {
    id: "e9",
    name: "Petra Benešová",
    role: "Operátor",
    color: "green",
    status: "conflict",
    shifts: [M, M, M, M, S, S, O],
  },
  {
    id: "e10",
    name: "Klára Růžičková",
    role: "Operátor",
    color: "purple",
    status: "ok",
    shifts: [A, A, A, M, M, O, O],
  },
];

export const DEMO_STATS: DemoStat[] = [
  {
    key: "employees",
    label: "Celkem zaměstnanců",
    value: "108",
    meta: "+2 oproti minulému měsíci",
    trend: "up",
    icon: "users",
    tone: "blue",
  },
  {
    key: "coverage",
    label: "Pokrytí směn",
    value: "96 %",
    meta: "+4 % oproti minulému měsíci",
    trend: "up",
    icon: "checkCircle",
    tone: "green",
  },
  {
    key: "conflicts",
    label: "Konflikty / upozornění",
    value: "7",
    detail: true,
    icon: "alert",
    tone: "red",
  },
  {
    key: "unmet",
    label: "Nesplněné požadavky",
    value: "12",
    detail: true,
    icon: "clipboard",
    tone: "amber",
  },
];

export const DEMO_OVERVIEW = [
  {
    label: "Dovolená",
    value: "24",
    delta: "+2 %",
    trend: "up" as const,
    icon: "umbrella" as const,
    tone: "green" as const,
  },
  {
    label: "Nemoc",
    value: "8",
    delta: "−3 %",
    trend: "down" as const,
    icon: "heart" as const,
    tone: "red" as const,
  },
  {
    label: "Volno",
    value: "32",
    delta: "+1 %",
    trend: "up" as const,
    icon: "calendar" as const,
    tone: "blue" as const,
  },
  {
    label: "Požadavky zaměstnanců",
    value: "12",
    delta: "",
    trend: "flat" as const,
    icon: "clipboard" as const,
    tone: "blue" as const,
    link: true,
  },
];

export const DEMO_ALERTS = [
  { label: "Chybějící pokrytí směn (pátek)", count: 3 },
  { label: "Konflikt požadavků", count: 2 },
  { label: "Nesplněné požadavky", count: 2 },
];

export const DEMO_FREQUENT = [
  {
    label: "Dovolená",
    value: "42",
    delta: "+8",
    trend: "up" as const,
    icon: "umbrella" as const,
    tone: "green" as const,
  },
  {
    label: "Volno",
    value: "18",
    delta: "+3",
    trend: "up" as const,
    icon: "calendar" as const,
    tone: "blue" as const,
  },
  {
    label: "Nemoc",
    value: "6",
    delta: "−1",
    trend: "down" as const,
    icon: "heart" as const,
    tone: "red" as const,
  },
  {
    label: "Jiné absence",
    value: "4",
    delta: "0",
    trend: "flat" as const,
    icon: "clipboard" as const,
    tone: "blue" as const,
  },
];

export type DemoRequest = {
  id: string;
  employee: string;
  color: string;
  type: string;
  term: string;
};

export const DEMO_REQUESTS: DemoRequest[] = [
  {
    id: "r1",
    employee: "Jana Kovářová",
    color: "teal",
    type: "Dovolená",
    term: "7. 10. – 8. 10.",
  },
  {
    id: "r2",
    employee: "Petra Benešová",
    color: "green",
    type: "Nemoc",
    term: "9. 10. – 10. 10.",
  },
  {
    id: "r3",
    employee: "Tomáš Malý",
    color: "orange",
    type: "Volno",
    term: "12. 10.",
  },
  {
    id: "r4",
    employee: "Lucie Svobodová",
    color: "rose",
    type: "Dovolená",
    term: "19. 10. – 23. 10.",
  },
  {
    id: "r5",
    employee: "David Šimek",
    color: "amber",
    type: "Volno",
    term: "26. 10.",
  },
  {
    id: "r6",
    employee: "Klára Růžičková",
    color: "purple",
    type: "Jiné",
    term: "30. 10.",
  },
];

export type DemoAbsence = {
  id: string;
  employee: string;
  color: string;
  type: string;
  term: string;
};

export const DEMO_ABSENCES: DemoAbsence[] = [
  {
    id: "a1",
    employee: "Jana Kovářová",
    color: "teal",
    type: "Dovolená",
    term: "7. 10. – 8. 10.",
  },
  {
    id: "a2",
    employee: "Petra Benešová",
    color: "green",
    type: "Nemoc",
    term: "9. 10. – 10. 10.",
  },
  {
    id: "a3",
    employee: "Lucie Svobodová",
    color: "rose",
    type: "Dovolená",
    term: "19. 10. – 23. 10.",
  },
];

/** Ukázkový týden prvního řezu: pondělí 5. 10. 2026. */
export const DEMO_WEEK_START = new Date(2026, 9, 5);

export function isSupportedDemoWeek(weekStart: Date): boolean {
  return (
    weekStart.getFullYear() === DEMO_WEEK_START.getFullYear() &&
    weekStart.getMonth() === DEMO_WEEK_START.getMonth() &&
    weekStart.getDate() === DEMO_WEEK_START.getDate()
  );
}

export const CZECH_DAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Sedm dní od zadaného pondělí. */
export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function weekLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  return `${formatDayMonth(weekStart)} – ${formatDayMonth(weekEnd)} ${weekEnd.getFullYear()}`;
}

export function formatDayMonth(date: Date): string {
  return `${date.getDate()}.${date.getMonth() + 1}.`;
}

/** ISO datum pro API podle lokálního kalendářního dne, ne podle UTC. */
export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftCount(shifts: ShiftKind[]): number {
  return shifts.filter((shift) => shift === "morning" || shift === "afternoon")
    .length;
}
