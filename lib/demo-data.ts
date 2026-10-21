/**
 * SYNTETICKÁ DEMONSTRAČNÍ DATA PRO UI.
 *
 * Všechna jména, čísla i časy směn jsou smyšlené a slouží výhradně
 * k vizuální ukázce rozvržení. Nejedná se o skutečný rozpis, schválená
 * provozní pravidla ani zaměstnanecká data.
 */

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

export const SHIFT_META: Record<
  ShiftKind,
  { label: string; className: string; option: string }
> = {
  morning: {
    label: "8:00–16:00",
    className: "shift--morning",
    option: "Ranní (8:00–16:00)",
  },
  afternoon: {
    label: "12:00–20:00",
    className: "shift--afternoon",
    option: "Odpolední (12:00–20:00)",
  },
  off: { label: "Volno", className: "shift--off", option: "Volno" },
  vacation: {
    label: "Dovolená",
    className: "shift--vacation",
    option: "Dovolená",
  },
  sick: { label: "Nemoc", className: "shift--sick", option: "Nemoc" },
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

export const DEMO_PERIOD = { year: 2026, month: 9 } as const;

export const CZECH_MONTHS = [
  "Leden",
  "Únor",
  "Březen",
  "Duben",
  "Květen",
  "Červen",
  "Červenec",
  "Srpen",
  "Září",
  "Říjen",
  "Listopad",
  "Prosinec",
];

export const CZECH_DAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

export function monthLabel(year: number, month: number): string {
  return `${CZECH_MONTHS[month] ?? ""} ${year}`;
}

/** Pondělí prvního celého týdne v daném měsíci. */
export function getWeekDates(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const day = first.getDay();
  const offset = (8 - day) % 7;
  const monday = new Date(year, month, 1 + offset);
  return Array.from(
    { length: 7 },
    (_, index) =>
      new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index),
  );
}

export function formatDayMonth(date: Date): string {
  return `${date.getDate()}.${date.getMonth() + 1}.`;
}

export function shiftCount(shifts: ShiftKind[]): number {
  return shifts.filter((shift) => shift === "morning" || shift === "afternoon")
    .length;
}
