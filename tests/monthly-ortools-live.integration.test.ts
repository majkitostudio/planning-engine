/** Syntetická API → skutečný solver → izolovaná DB; přístup manažera je testovací náhrada session. */
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { datesInMonth } from "@/lib/planning/domain/month";
import { addDays, weekdayIndex } from "@/lib/planning/domain/time";

const actor = { userId: "synthetic-live-manager", email: "synthetic@example.test", displayName: "Syntetický manažer", role: "manager" as const };
vi.mock("@/lib/auth/route-access", () => ({ requirePlanningActor: async () => ({ ok: true, actor }) }));
import { POST as run } from "@/app/api/planning/monthly/run/route";
import { POST as confirm } from "@/app/api/planning/monthly/confirm/route";
import { GET as read } from "@/app/api/planning/monthly/route";

const enabled = process.env.PLANNING_ORTOOLS_LIVE_INTEGRATION === "1";
const request = (body: unknown) => new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe.skipIf(!enabled)("skutečný solver a izolovaná měsíční DB", () => {
  it("uloží skutečný návrh, zablokuje částečný a znovu načte potvrzený", async () => {
    const db = new URL(process.env.DATABASE_URL ?? "");
    if (db.hostname !== "localhost" || db.port !== "55439" || db.pathname !== "/planning_monthly_test") throw new Error("Test vyžaduje výhradně izolovanou databázi.");
    const solver = new URL(process.env.PLANNING_ORTOOLS_URL ?? "");
    if (solver.protocol !== "https:" || !/^planning-engine-[a-z0-9]+-majkito\.vercel\.app$/.test(solver.hostname) || solver.pathname !== "/api/monthly_solver") throw new Error("Test vyžaduje izolované Preview solveru.");
    if (process.env.PLANNING_MONTHLY_PROVIDER !== "ortools" || process.env.PLANNING_PERSISTENCE !== "prisma") throw new Error("Neplatný testovací režim.");
    const suffix = randomUUID();
    const month = `${2100 + Number.parseInt(suffix.slice(0, 6), 16) % 7000}-11`;
    const dates = datesInMonth(month);
    const employee = { id: `synthetic-${suffix}`, displayName: "Syntetický zaměstnanec", employmentType: "full_time" as const };
    const boundaryDates = [...Array.from({ length: 7 }, (_, i) => addDays(dates[0], i - 7)), ...Array.from({ length: 7 }, (_, i) => addDays(dates[dates.length - 1], i + 1))];
    for (const weekStart of new Set(boundaryDates.map((date) => addDays(date, -weekdayIndex(date))))) {
      await prisma.planningRunRecord.create({ data: { proposalId: `${suffix}-${weekStart}`, scenarioId: "synthetic", scenarioLabel: "synthetic", providerName: "simulated", mode: "simulated", weekStart, input: { employees: [employee] }, result: {}, confirmedPlan: { weekStart, assignments: [] }, confirmedAt: new Date("2026-10-01T00:00:00Z") } });
    }
    const kinds = ["morning", "afternoon"] as const;
    const input = { month, employees: [employee], absences: [], instructions: "", availability: [{ employeeId: employee.id, date: dates[9], shiftKind: "morning", available: true }], staffingRequirements: dates.flatMap((date) => kinds.map((shiftKind) => ({ date, shiftKind, requiredEmployees: date === dates[9] && shiftKind === "morning" ? 1 : 0 }))) };
    const partialInput = { ...input, staffingRequirements: input.staffingRequirements.map((item) => item.requiredEmployees === 1 ? { ...item, requiredEmployees: 2 } : item) };
    const partialResponse = await run(request({ input: partialInput }));
    const partial = await partialResponse.json();
    expect(partialResponse.status).toBe(200);
    expect(partial).toMatchObject({ mode: "ortools", validation: { status: "invalid", canConfirm: false } });
    expect((await confirm(request({ id: partial.id }))).status).toBe(409);
    const response = await run(request({ input }));
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result).toMatchObject({ mode: "ortools", draft: { solverModelVersion: "monthly-cpsat-v1" }, validation: { status: "valid", canConfirm: true } });
    expect(await prisma.monthlyPlanningRun.findUnique({ where: { id: result.id }, select: { confirmedAt: true } })).toEqual({ confirmedAt: null });
    const confirmedResponse = await confirm(request({ id: result.id }));
    expect(confirmedResponse.status).toBe(200);
    const restored = await (await read(new Request(`http://localhost/api/planning/monthly?month=${month}`))).json();
    expect(restored).toMatchObject({ ok: true, view: { id: result.id, mode: "ortools", confirmed: true, draft: { solverModelVersion: "monthly-cpsat-v1" } } });
    expect(await prisma.auditEvent.count({ where: { entityId: result.id, action: "planning.confirmed" } })).toBe(1);
  }, 60000);
});
