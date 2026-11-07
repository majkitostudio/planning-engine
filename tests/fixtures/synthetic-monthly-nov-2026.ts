import { datesInMonth } from "../../lib/planning/domain/month";
import type { MonthlyPlanningInput } from "../../lib/planning/domain/month-input";
import type { MonthlyBoundaryData } from "../../lib/planning/domain/month-validation";
import type { ProposedAssignment, ShiftKind } from "../../lib/planning/domain/types";

/** Offline synthetic witness only. IDs and names do not refer to real people. */
const month = "2026-11";
const dates = datesInMonth(month);
const shiftKinds: readonly ShiftKind[] = ["morning", "afternoon"];
const employees = Array.from({ length: 29 }, (_, index) => ({
  id: `synthetic-employee-${String(index + 1).padStart(2, "0")}`,
  displayName: `Syntetický zaměstnanec ${String(index + 1).padStart(2, "0")}`,
  employmentType: "full_time" as const,
}));

function requiredEmployees(date: string, shiftKind: ShiftKind): number {
  const weekend = new Date(`${date}T12:00:00Z`).getUTCDay() === 0 || new Date(`${date}T12:00:00Z`).getUTCDay() === 6;
  if (weekend) return shiftKind === "morning" ? 7 : 3;
  return shiftKind === "morning" ? 15 : 7;
}

function hasSixConsecutiveDays(employeeId: string, date: string, assignedDates: Set<string>): boolean {
  const trial = new Set([...assignedDates, date]);
  for (let start = -5; start <= 0; start += 1) {
    const first = new Date(`${date}T12:00:00Z`);
    first.setUTCDate(first.getUTCDate() + start);
    const run = Array.from({ length: 6 }, (_, offset) => {
      const day = new Date(first);
      day.setUTCDate(day.getUTCDate() + offset);
      return day.toISOString().slice(0, 10);
    });
    if (run.every((day) => trial.has(`${employeeId}|${day}`))) return true;
  }
  return false;
}

/** Deterministic least-loaded construction with at most five shifts per Mon–Sun week. */
function buildWitness(): ProposedAssignment[] {
  const assignments: ProposedAssignment[] = [];
  const workDays = new Map<string, Set<string>>();
  const weekDays = new Map<string, Set<string>>();
  for (const date of dates) {
    const weekStart = new Date(`${date}T12:00:00Z`);
    weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
    const week = weekStart.toISOString().slice(0, 10);
    for (const shiftKind of shiftKinds) {
      const needed = requiredEmployees(date, shiftKind);
      const assignedToday = new Set(assignments.filter((item) => item.date === date).map((item) => item.employeeId));
      for (let slot = 0; slot < needed; slot += 1) {
        const candidates = employees.filter((employee) => {
          const days = weekDays.get(`${week}|${employee.id}`) ?? new Set<string>();
          const workedDays = workDays.get(employee.id) ?? new Set<string>();
          return !assignedToday.has(employee.id)
            && !days.has(date)
            && days.size < 5
            && !hasSixConsecutiveDays(employee.id, date, workedDays);
        }).sort((left, right) => {
          const leftWeek = weekDays.get(`${week}|${left.id}`)?.size ?? 0;
          const rightWeek = weekDays.get(`${week}|${right.id}`)?.size ?? 0;
          const leftMonth = workDays.get(left.id)?.size ?? 0;
          const rightMonth = workDays.get(right.id)?.size ?? 0;
          const leftTie = (Number(left.id.slice(-2)) + dates.indexOf(date) * 7 + slot * 11) % employees.length;
          const rightTie = (Number(right.id.slice(-2)) + dates.indexOf(date) * 7 + slot * 11) % employees.length;
          return leftWeek - rightWeek || leftMonth - rightMonth || leftTie - rightTie;
        });
        const selected = candidates[0];
        if (!selected) throw new Error(`No feasible witness candidate for ${date} ${shiftKind} slot ${slot + 1}`);
        assignments.push({ employeeId: selected.id, date, shiftKind });
        assignedToday.add(selected.id);
        const employeeDays = workDays.get(selected.id) ?? new Set<string>();
        employeeDays.add(date);
        workDays.set(selected.id, employeeDays);
        const employeeWeekDays = weekDays.get(`${week}|${selected.id}`) ?? new Set<string>();
        employeeWeekDays.add(date);
        weekDays.set(`${week}|${selected.id}`, employeeWeekDays);
      }
    }
  }
  return assignments;
}

export const syntheticMonthlyAssignments = buildWitness();

const assignedKeys = new Set(syntheticMonthlyAssignments.map(({ employeeId, date, shiftKind }) => `${employeeId}|${date}|${shiftKind}`));
const employeeWorkDays = new Map<string, Set<string>>();
for (const assignment of syntheticMonthlyAssignments) {
  const days = employeeWorkDays.get(assignment.employeeId) ?? new Set<string>();
  days.add(assignment.date);
  employeeWorkDays.set(assignment.employeeId, days);
}

// Generate many synthetic multi-day absences only on days without a witness shift.
const absences = employees.flatMap((employee, employeeIndex) => {
  const offDates = dates.filter((date) => !employeeWorkDays.get(employee.id)?.has(date));
  return offDates
    .filter((_, offIndex) => (offIndex + employeeIndex) % 3 === 0)
    .slice(0, 3)
    .map((date) => ({
      id: `synthetic-absence-${String(employeeIndex + 1).padStart(2, "0")}-${date.slice(-2)}`,
      employeeId: employee.id,
      from: date,
      to: date,
      type: (employeeIndex % 3 === 0 ? "sick" : "vacation") as "sick" | "vacation",
      status: "approved" as const,
    }));
});

export const syntheticMonthlyInput: MonthlyPlanningInput = {
  month,
  employees,
  absences,
  // One explicit cell for every employee/date/shift; assigned cells are available.
  availability: employees.flatMap((employee, employeeIndex) => dates.flatMap((date, dateIndex) => shiftKinds.map((shiftKind, shiftIndex) => {
    const key = `${employee.id}|${date}|${shiftKind}`;
    const onApprovedAbsence = absences.some((absence) => absence.employeeId === employee.id && absence.from <= date && absence.to >= date);
    const sampledUnavailable = (employeeIndex * 31 + dateIndex * 7 + shiftIndex * 13) % 11 < 3;
    return {
      employeeId: employee.id,
      date,
      shiftKind,
      available: assignedKeys.has(key) || (!onApprovedAbsence && !sampledUnavailable),
    };
  }))),
  staffingRequirements: dates.flatMap((date) => shiftKinds.map((shiftKind) => ({
    date,
    shiftKind,
    requiredEmployees: requiredEmployees(date, shiftKind),
  }))),
  instructions: "Pouze syntetický testovací vstup; neobsahuje doménové pokyny ani skutečná osobní data.",
  shiftRotationPreference: false,
};

// Completeness explicitly asserts no shifts in the adjacent six-day windows.
export const syntheticMonthlyBoundary: MonthlyBoundaryData = {
  before: { complete: true, assignments: [] },
  after: { complete: true, assignments: [] },
};
