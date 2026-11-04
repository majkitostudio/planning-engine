import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { prisma } from "../db";
import { datesInMonth } from "./domain/month";
import { addDays, weekdayIndex } from "./domain/time";
import { PrismaMonthlyStore } from "./monthly-prisma-store";
import { loadMonthlyBoundary } from "./monthly-history-service";
import type { MonthlyPlanningInput } from "./domain/month-input";
import type { PlanningActor } from "../auth/actor";

const enabled = process.env.PLANNING_MONTHLY_INTEGRATION === "1";

describe.skipIf(!enabled)("měsíční rozpis v izolované PostgreSQL", () => {
  it("oddělí návrh od potvrzení, ověří návaznosti a zapíše jediný audit", async () => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (url.hostname !== "localhost" || url.port !== "55439" || url.pathname !== "/planning_monthly_test") throw new Error("Integrační test vyžaduje výhradně vyhrazenou izolovanou databázi.");
    const suffix = randomUUID();
    const employeeId = `synthetic-${suffix}`;
    const manager: PlanningActor = { userId: `manager-${suffix}`, email: `${suffix}@example.test`, displayName: "Syntetický manažer", role: "manager" };
    const employees = [{ id: employeeId, displayName: "Syntetický zaměstnanec", employmentType: "full_time" as const }];
    const month = `${2100 + Number.parseInt(suffix.slice(0, 6), 16) % 7000}-11`;
    const input: MonthlyPlanningInput = { month, employees, absences: [], availability: [], instructions: "", staffingRequirements: datesInMonth(month).flatMap((date) => (["morning", "afternoon"] as const).map((shiftKind) => ({ date, shiftKind, requiredEmployees: 0 }))) };
    const draft = { month, assignments: [], explanations: [], alternatives: [], assumptions: [], instructionsOutcome: "" };
    const monthDates = datesInMonth(month);
    const boundaryDates = [...Array.from({ length: 7 }, (_, i) => addDays(monthDates[0], i - 7)), ...Array.from({ length: 7 }, (_, i) => addDays(monthDates[monthDates.length - 1], i + 1))];
    const boundaryWeeks = new Set(boundaryDates.map((date) => addDays(date, -weekdayIndex(date))));
    for (const weekStart of boundaryWeeks) {
      await prisma.planningRunRecord.create({ data: { proposalId: `${suffix}-${weekStart}`, scenarioId: "synthetic", scenarioLabel: "synthetic", providerName: "simulated", mode: "simulated", weekStart, input: { employees }, result: {}, confirmedPlan: { weekStart, assignments: [] }, confirmedAt: new Date("2026-10-01T00:00:00Z") } });
    }
    const store = new PrismaMonthlyStore(prisma);
    const id = `synthetic-${suffix}`;
    await store.create({ id, input, draft, providerName: "simulated", mode: "simulated" });
    const competingId = `${id}-competing`;
    await store.create({ id: competingId, input, draft, providerName: "simulated", mode: "simulated" });
    expect((await store.get(id))?.confirmed).toBeNull();
    expect(await store.confirm(id, { ...manager, role: "viewer" }, new Date())).toMatchObject({ ok: false, code: "forbidden" });
    const results = await Promise.all([store.confirm(id, manager, new Date("2026-11-01T00:00:00Z")), store.confirm(competingId, manager, new Date("2026-11-01T00:00:00Z"))]);
    const successes = results.filter((result) => result.ok);
    expect(successes).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toMatchObject([{ ok: false, code: "month_conflict" }]);
    const winner = successes[0];
    if (!winner.ok) throw new Error("Chybí potvrzený návrh.");
    expect(await store.confirm(winner.run.id, manager, new Date())).toMatchObject({ ok: true, alreadyConfirmed: true });
    expect(await store.getConfirmed(month)).toMatchObject({ ok: true, run: { id: winner.run.id } });
    expect(await prisma.auditEvent.count({ where: { entityType: "monthly_planning_run", entityId: { in: [id, competingId] }, action: "planning.confirmed" } })).toBe(1);
    expect(await store.remove(winner.run.id, manager, new Date("2026-11-02T00:00:00Z"), false)).toEqual({ ok: false, code: "changed" });
    expect(await store.remove(winner.run.id, manager, new Date("2026-11-02T00:00:00Z"), true)).toEqual({ ok: true });
    expect(await store.get(winner.run.id)).toBeNull();
    expect(await store.getConfirmed(month)).toEqual({ ok: true, run: null });
    expect(await prisma.monthlyPlanningRun.findUnique({ where: { id: winner.run.id } })).toMatchObject({ deletedAt: expect.any(Date), draft });
    expect(await prisma.auditEvent.count({ where: { entityType: "monthly_planning_run", entityId: winner.run.id, action: "planning.removed" } })).toBe(1);
    const replacementId = `${id}-replacement`;
    await store.create({ id: replacementId, input, draft, providerName: "simulated", mode: "simulated" });
    const raceId = `${id}-race`;
    await store.create({ id: raceId, input, draft, providerName: "simulated", mode: "simulated" });
    const [raceConfirm, raceRemove] = await Promise.all([
      store.confirm(raceId, manager, new Date("2026-11-03T00:00:00Z")),
      store.remove(raceId, manager, new Date("2026-11-03T00:00:00Z"), false),
    ]);
    if (raceConfirm.ok) {
      expect(raceRemove).toEqual({ ok: false, code: "changed" });
      expect(await store.remove(raceId, manager, new Date("2026-11-03T00:00:00Z"), true)).toEqual({ ok: true });
    } else {
      expect(raceRemove).toEqual({ ok: true });
      expect(await store.get(raceId)).toBeNull();
    }
    expect(await store.confirm(replacementId, manager, new Date("2026-11-03T00:00:00Z"))).toMatchObject({ ok: true, alreadyConfirmed: false });
    expect(await store.getConfirmed(month)).toMatchObject({ ok: true, run: { id: replacementId } });
    const rollbackId = `${id}-rollback`;
    await store.create({ id: rollbackId, input, draft, providerName: "simulated", mode: "simulated" });
    await expect(store.remove(rollbackId, { ...manager, userId: `${manager.userId}-other` }, new Date(), false)).rejects.toThrow();
    expect(await store.get(rollbackId)).toMatchObject({ id: rollbackId, confirmed: null });
    expect(await prisma.auditEvent.count({ where: { entityType: "monthly_planning_run", entityId: rollbackId, action: "planning.removed" } })).toBe(0);
  });

  it("odmítne bývalého manažera po změně role i při zastaralé session", async () => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (url.hostname !== "localhost" || url.port !== "55439" || url.pathname !== "/planning_monthly_test") throw new Error("Integrační test vyžaduje výhradně vyhrazenou izolovanou databázi.");
    const suffix = randomUUID();
    const accountId = `stale-${suffix}`;
    await prisma.appUser.create({ data: { id: accountId, email: `${suffix}@example.test`, displayName: "Syntetický uživatel", role: "viewer", active: true, mustChangePassword: false, passwordHash: "synthetic-hash" } });
    const previousMode = process.env.PLANNING_AUTH_MODE;
    process.env.PLANNING_AUTH_MODE = "database";
    try {
      const actor: PlanningActor = { userId: accountId, email: `${suffix}@example.test`, displayName: "Syntetický uživatel", role: "manager" };
      expect(await new PrismaMonthlyStore(prisma).confirm("does-not-matter", actor, new Date())).toMatchObject({ ok: false, code: "forbidden" });
      expect(await new PrismaMonthlyStore(prisma).remove("does-not-matter", actor, new Date(), false)).toMatchObject({ ok: false, code: "forbidden" });
    } finally {
      if (previousMode === undefined) delete process.env.PLANNING_AUTH_MODE;
      else process.env.PLANNING_AUTH_MODE = previousMode;
    }
  });

  it("odstraněný potvrzený měsíc nezakryje chybějící návaznost", async () => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (url.hostname !== "localhost" || url.port !== "55439" || url.pathname !== "/planning_monthly_test") throw new Error("Integrační test vyžaduje výhradně vyhrazenou izolovanou databázi.");
    const suffix = randomUUID();
    const year = 2100 + Number.parseInt(suffix.slice(0, 6), 16) % 7000;
    const month = `${year}-11`;
    const nextMonth = `${year}-12`;
    const employeeId = `boundary-${suffix}`;
    const id = `boundary-run-${suffix}`;
    const manager: PlanningActor = { userId: `manager-${suffix}`, email: `${suffix}@example.test`, displayName: "Syntetický manažer", role: "manager" };
    const input = { month, employees: [{ id: employeeId, displayName: "Syntetický zaměstnanec", employmentType: "full_time" }], absences: [], availability: [], staffingRequirements: [], instructions: "" };
    const draft = { month, assignments: [], explanations: [], alternatives: [], assumptions: [], instructionsOutcome: "" };
    await prisma.monthlyPlanningRun.create({ data: { id, month, input, draft, mode: "simulated", providerName: "simulated", confirmedAt: new Date("2026-11-01T00:00:00Z") } });
    expect((await loadMonthlyBoundary(nextMonth, [employeeId], prisma)).before.complete).toBe(true);
    expect(await new PrismaMonthlyStore(prisma).remove(id, manager, new Date(), true)).toEqual({ ok: true });
    expect((await loadMonthlyBoundary(nextMonth, [employeeId], prisma)).before.complete).toBe(false);
  });
});
