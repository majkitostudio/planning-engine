import { describe, expect, it, vi } from "vitest";
import { loadMonthlyBoundary, loadPreviousWeeklyEmployees } from "./monthly-history-service";

const weekly = (start: string) => ({ weekStart: start, confirmedAt: new Date("2026-11-01T00:00:00Z"), input: { employees: [{ id: "e1" }] }, confirmedPlan: { weekStart: start, assignments: [] } });

describe("načtení sousedních potvrzených rozpisů", () => {
  it("použije potvrzené týdenní plány a prázdný den rozliší od chybějícího rozpisu", async () => {
    const findMany = vi.fn().mockResolvedValue([weekly("2026-10-19"), weekly("2026-10-26"), weekly("2026-11-30"), weekly("2026-12-07")]);
    const boundary = await loadMonthlyBoundary("2026-11", ["e1"], { planningRunRecord: { findMany } });
    expect(boundary.before.complete).toBe(true);
    expect(boundary.after.complete).toBe(true);
    expect(findMany).toHaveBeenCalledOnce();
  });
  it("nezapočte nepotvrzený nebo nejednoznačný rozpis jako úplný", async () => {
    const findMany = vi.fn().mockResolvedValue([weekly("2026-10-26"), weekly("2026-10-26"), { ...weekly("2026-11-30"), confirmedAt: null }]);
    const boundary = await loadMonthlyBoundary("2026-11", ["e1"], { planningRunRecord: { findMany } });
    expect(boundary.before.complete).toBe(false);
    expect(boundary.after.complete).toBe(false);
  });
  it("načte i potvrzené měsíční rozpisy", async () => {
    const monthly = (month: string) => ({ month, confirmedAt: new Date("2026-11-01T00:00:00Z"), input: { employees: [{ id: "e1" }] }, draft: { month, assignments: [] } });
    const db = { planningRunRecord: { findMany: vi.fn().mockResolvedValue([]) }, monthlyPlanningRun: { findMany: vi.fn().mockResolvedValue([monthly("2026-10"), monthly("2026-12")]) } };
    const boundary = await loadMonthlyBoundary("2026-11", ["e1"], db);
    expect(boundary.before.complete).toBe(true);
    expect(boundary.after.complete).toBe(true);
  });

  it("načte poslední verzi uloženého rosteru a nepovažuje chybějící buňku za volno", async () => {
    const dates = ["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"];
    const roster = (version: number, entries: readonly { date: string; status: "shift" | "off"; startTime: string | null; endTime: string | null }[]) => ({
      scopeKey: "scope", version, periodStart: dates[0], periodEnd: dates[6],
      employees: [{ employeeId: "e1", entries }],
    });
    const full = dates.map((date) => ({ date, status: "off" as const, startTime: null, endTime: null }));
    const latestEntries = full.filter((entry) => entry.date !== "2026-10-28");
    const db = {
      planningRunRecord: { findMany: vi.fn().mockResolvedValue([]) },
      rosterHistoryImport: { findMany: vi.fn().mockResolvedValue([roster(2, latestEntries), roster(1, full)]) },
    };

    const boundary = await loadMonthlyBoundary("2026-11", ["e1"], db);

    expect(boundary.before.complete).toBe(false);
    expect(db.rosterHistoryImport.findMany).toHaveBeenCalledOnce();
  });
});

describe("převzetí zaměstnanců ze staršího týdenního rozpisu", () => {
  it("použije identity z posledního potvrzeného týdne před začátkem měsíce", async () => {
    const row = { ...weekly("2026-10-26"), input: { employees: [{ id: "e1", displayName: "Testovací zaměstnanec" }] } };
    const db = { planningRunRecord: { findMany: vi.fn().mockResolvedValue([row]) } };
    expect(await loadPreviousWeeklyEmployees("2026-11", db)).toEqual({ ok: true, employees: [{ id: "e1", displayName: "Testovací zaměstnanec" }] });
  });
  it("odmítne nejednoznačné nebo neúplné záznamy", async () => {
    const row = { ...weekly("2026-10-26"), input: { employees: [{ id: "e1", displayName: "Test" }] } };
    const findMany = vi.fn().mockResolvedValue([row, row]);
    expect((await loadPreviousWeeklyEmployees("2026-11", { planningRunRecord: { findMany } })).ok).toBe(false);
    findMany.mockResolvedValue([{ ...row, input: { employees: [{ id: "e1" }] } }]);
    expect((await loadPreviousWeeklyEmployees("2026-11", { planningRunRecord: { findMany } })).ok).toBe(false);
  });
});
