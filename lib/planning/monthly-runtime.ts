import { prisma } from "../db";
import { getPlanningPersistenceRuntime } from "./persistence-runtime";
import { getPlanningRuntime } from "./server-config";
import { InMemoryMonthlyStore } from "./monthly-store";
import { PrismaMonthlyStore } from "./monthly-prisma-store";
import { loadMonthlyBoundary, loadPreviousWeeklyEmployees } from "./monthly-history-service";
import type { PlanningActor } from "../auth/actor";
import type { MonthlyDraftRecord } from "./monthly-store";

const memory = new InMemoryMonthlyStore();
const missingBoundary = { before: { complete: false, assignments: [] }, after: { complete: false, assignments: [] } } as const;

export function getMonthlyPersistenceRuntime() {
  const persistence = getPlanningPersistenceRuntime();
  if (!persistence.configured) return { configured: false as const, reason: persistence.reason };
  if (persistence.mode === "memory") {
    return { configured: true as const, create: (record: MonthlyDraftRecord) => memory.create(record), getConfirmed: (month: string) => memory.getConfirmed(month), loadPreviousWeeklyEmployees: async () => ({ ok: true as const, employees: [] }), loadBoundary: async () => missingBoundary, confirm: (id: string, actor: PlanningActor) => memory.confirm(id, actor, missingBoundary, new Date()) };
  }
  const store = new PrismaMonthlyStore(prisma);
  return { configured: true as const, create: (record: MonthlyDraftRecord) => store.create(record), getConfirmed: (month: string) => store.getConfirmed(month), loadPreviousWeeklyEmployees: (month: string) => loadPreviousWeeklyEmployees(month, prisma), loadBoundary: (month: string, employeeIds: readonly string[]) => loadMonthlyBoundary(month, employeeIds, prisma), confirm: (id: string, actor: PlanningActor) => store.confirm(id, actor, new Date()) };
}

export function getMonthlyRuntime() {
  const planning = getPlanningRuntime();
  if (!planning.configured) return { configured: false as const, reason: planning.reason };
  const persistence = getMonthlyPersistenceRuntime();
  if (!persistence.configured) return persistence;
  return { ...persistence, mode: planning.mode };
}
