import { prisma } from "../db";
import { getPlanningPersistenceRuntime } from "./persistence-runtime";
import { getPlanningRuntime } from "./server-config";
import type { MonthlyPlanningMode } from "./runtime-types";
import { InMemoryMonthlyStore } from "./monthly-store";
import { PrismaMonthlyStore } from "./monthly-prisma-store";
import { loadMonthlyBoundary, loadMonthlyRosterSnapshot, loadPreviousWeeklyEmployees } from "./monthly-history-service";
import { resolveMonthlyRosterHistory } from "./domain/month-history";
import type { PlanningActor } from "../auth/actor";
import type { MonthlyDraftRecord } from "./monthly-store";
import { resolveOrtoolsUrl } from "./monthly-ortools-client";

const memory = new InMemoryMonthlyStore();
const missingBoundary = { before: { complete: false, assignments: [] }, after: { complete: false, assignments: [] } } as const;
const monthlyGeminiUnavailable = {
  configured: false as const,
  reason: "Externí Gemini pro měsíční vstupy zůstává vypnuté: bezplatná úroveň není pro aplikaci dostupnou v EHP přípustná a placená varianta odporuje rozpočtu projektu. Použijte „cloudflare“.",
};
const monthlyCloudflareUnavailable = {
  configured: false as const,
  reason: "Režim „cloudflare“ je zvolený, ale chybí CLOUDFLARE_ACCOUNT_ID nebo CLOUDFLARE_API_TOKEN. Doplňte je do prostředí; aplikace je nevypisuje ani neukládá do repozitáře.",
};

function hasCloudflareCredentials(env: Readonly<Record<string, string | undefined>>): boolean {
  return Boolean(env.CLOUDFLARE_ACCOUNT_ID?.trim() && env.CLOUDFLARE_API_TOKEN?.trim());
}

export type MonthlyProviderRuntime =
  | { readonly configured: true; readonly mode: MonthlyPlanningMode }
  | { readonly configured: false; readonly reason: string };

export function getMonthlyProviderRuntime(env: Readonly<Record<string, string | undefined>> = process.env): MonthlyProviderRuntime {
  const explicit = env.PLANNING_MONTHLY_PROVIDER?.trim();
  if (explicit === "ortools") {
    try {
      const url = new URL(resolveOrtoolsUrl(env));
      const token = env.PLANNING_ORTOOLS_TOKEN ?? "";
      if (url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash && token.length >= 32 && token.trim() === token && !/[\r\n]/.test(token)) return { configured: true, mode: explicit };
    } catch { /* Neplatná konfigurace nesmí zapnout jiný provider. */ }
    return { configured: false, reason: "Režim OR-Tools vyžaduje platnou HTTPS adresu solveru a přístupový klíč v nastavení serveru." };
  }
  if (explicit === "gemini") return monthlyGeminiUnavailable;
  if (explicit === "cloudflare") {
    return hasCloudflareCredentials(env)
      ? { configured: true, mode: explicit }
      : monthlyCloudflareUnavailable;
  }
  if (explicit === "simulated") return { configured: true, mode: explicit };
  if (explicit) return { configured: false, reason: "PLANNING_MONTHLY_PROVIDER má neznámou hodnotu. Povolené jsou „simulated“, „gemini“, „cloudflare“ a „ortools“." };
  const planning = getPlanningRuntime(env);
  if (planning.configured && planning.mode === "gemini") return monthlyGeminiUnavailable;
  return planning.configured ? { configured: true, mode: planning.mode } : { configured: false, reason: planning.reason };
}

export function getMonthlyPersistenceRuntime() {
  const persistence = getPlanningPersistenceRuntime();
  if (!persistence.configured) return { configured: false as const, reason: persistence.reason };
  if (persistence.mode === "memory") {
    return { configured: true as const, create: (record: MonthlyDraftRecord) => memory.create(record), get: (id: string) => memory.get(id), list: (month: string) => memory.list(month), remove: (id: string, actor: PlanningActor, confirmed: boolean) => memory.remove(id, actor, new Date(), confirmed), getConfirmed: (month: string) => memory.getConfirmed(month), loadPreviousWeeklyEmployees: async () => ({ ok: true as const, employees: [] }), loadBoundary: async () => missingBoundary, loadRosterSnapshot: async (month: string, employeeIds: readonly string[]) => resolveMonthlyRosterHistory(month, employeeIds, []), confirm: (id: string, actor: PlanningActor) => memory.confirm(id, actor, missingBoundary, new Date()) };
  }
  const store = new PrismaMonthlyStore(prisma);
  return { configured: true as const, create: (record: MonthlyDraftRecord) => store.create(record), get: (id: string) => store.get(id), list: (month: string) => store.list(month), remove: (id: string, actor: PlanningActor, confirmed: boolean) => store.remove(id, actor, new Date(), confirmed), getConfirmed: (month: string) => store.getConfirmed(month), loadPreviousWeeklyEmployees: (month: string) => loadPreviousWeeklyEmployees(month, prisma), loadBoundary: (month: string, employeeIds: readonly string[]) => loadMonthlyBoundary(month, employeeIds, prisma), loadRosterSnapshot: (month: string, employeeIds: readonly string[]) => loadMonthlyRosterSnapshot(month, employeeIds, prisma), confirm: (id: string, actor: PlanningActor) => store.confirm(id, actor, new Date()) };
}

export function getMonthlyRuntime() {
  const provider = getMonthlyProviderRuntime();
  if (!provider.configured) return provider;
  const persistence = getMonthlyPersistenceRuntime();
  if (!persistence.configured) return persistence;
  return { ...persistence, mode: provider.mode };
}
