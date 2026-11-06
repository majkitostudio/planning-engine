import { describe, expect, it, vi } from "vitest";
import { loadMonthlyBoundary, loadMonthlyRosterSnapshot, loadPreviousWeeklyEmployees } from "./monthly-history-service";

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

  it("u potvrzeného doplánování zachová přesné převzaté směny pro další měsíc", async () => {
    const days = Array.from({ length: 31 }, (_, index) => {
      const date = `2026-10-${String(index + 1).padStart(2, "0")}`;
      return date === "2026-10-31"
        ? { employeeId: "e1", date, status: "shift", startTime: "08:05", endTime: "16:45" }
        : { employeeId: "e1", date, status: date <= "2026-10-20" ? "unknown" : "off" };
    });
    const monthlyInput = { month: "2026-10", employees: [{ id: "e1", displayName: "Test", employmentType: "full_time" }], absences: [], availability: [], staffingRequirements: [], instructions: "", planningRange: { startDate: "2026-10-01", endDate: "2026-10-20" }, rosterHistory: { imports: [], days } };
    const row = { month: "2026-10", confirmedAt: new Date("2026-11-01T00:00:00Z"), input: monthlyInput, draft: { month: "2026-10", assignments: [], explanations: [], alternatives: [{ id: "", summary: "Starší alternativa", impact: "Dopad", assignments: [] }], assumptions: [], instructionsOutcome: "" } };
    const db = { planningRunRecord: { findMany: vi.fn().mockResolvedValue([]) }, monthlyPlanningRun: { findMany: vi.fn().mockResolvedValue([row]) } };
    const boundary = await loadMonthlyBoundary("2026-11", ["e1"], db);
    expect(boundary.before.complete).toBe(true);
    expect(boundary.before.assignments).toEqual([{ employeeId: "e1", date: "2026-10-31", startTime: "08:05", endTime: "16:45" }]);
    const missing = { ...monthlyInput, rosterHistory: { imports: [], days: days.map((day) => day.date === "2026-10-31" ? { employeeId: "e1", date: day.date, status: "unknown" } : day) } };
    db.monthlyPlanningRun.findMany.mockResolvedValue([{ ...row, input: missing }]);
    expect((await loadMonthlyBoundary("2026-11", ["e1"], db)).before.complete).toBe(false);
    const invalid = { ...monthlyInput, rosterHistory: undefined };
    db.monthlyPlanningRun.findMany.mockResolvedValue([{ ...row, input: invalid }]);
    expect((await loadMonthlyBoundary("2026-11", ["e1"], db)).before.complete).toBe(false);
  });

  it("po odstranění jediného rosteru zůstane návaznost neúplná a dny neznámé", async () => {
    const db = {
      planningRunRecord: { findMany: vi.fn().mockResolvedValue([]) },
      rosterHistoryImport: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const boundary = await loadMonthlyBoundary("2026-11", ["e1"], db);
    expect(boundary.before.complete).toBe(false);
    expect(boundary.after.complete).toBe(false);

    const snapshot = await loadMonthlyRosterSnapshot("2026-11", ["e1"], db);
    expect(snapshot.imports).toEqual([]);
    expect(snapshot.days.every((day) => day.status === "unknown")).toBe(true);
  });

  it("načte poslední verzi uloženého rosteru a nepovažuje chybějící buňku za volno", async () => {
    const dates = ["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"];
    const roster = (version: number, entries: readonly { date: string; status: "shift" | "off"; startTime: string | null; endTime: string | null }[]) => ({
      scopeKey: "scope", version, periodStart: dates[0], periodEnd: dates[6],
      employees: [{ employeeId: "e1", employee: { employmentType: "full_time" as const }, entries }],
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

describe("načtení podkladů pro doplánování části měsíce", () => {
  it("vrací aktuální verzi rosteru včetně přesných směn, neznámých dnů a otisků importů", async () => {
    const findMany = vi.fn().mockResolvedValue([{
      id: "import-2", scopeKey: "scope", fingerprint: "b".repeat(64), version: 2,
      periodStart: "2026-02-01", periodEnd: "2026-02-28",
      employees: [{ employeeId: "e1", employee: { employmentType: "part_time" as const }, entries: [
        { date: "2026-02-02", status: "shift", startTime: "07:45", endTime: "15:00" },
        { date: "2026-02-03", status: "off", startTime: null, endTime: null },
      ] }],
    }, {
      id: "import-1", scopeKey: "scope", fingerprint: "a".repeat(64), version: 1,
      periodStart: "2026-02-01", periodEnd: "2026-02-28", employees: [],
    }]);
    const snapshot = await loadMonthlyRosterSnapshot("2026-02", ["e1"], {
      planningRunRecord: { findMany: vi.fn().mockResolvedValue([]) },
      rosterHistoryImport: { findMany },
    });

    expect(snapshot.imports).toEqual([{ id: "import-2", version: 2, fingerprint: "b".repeat(64) }]);
    expect(snapshot.days.find((day) => day.date === "2026-02-02")).toMatchObject({ status: "shift", shiftKind: "morning", startTime: "07:45", endTime: "15:00" });
    expect(snapshot.days.find((day) => day.date === "2026-02-03")).toMatchObject({ status: "off" });
    expect(snapshot.days.find((day) => day.date === "2026-02-04")).toMatchObject({ status: "unknown" });
    expect(findMany).toHaveBeenCalledOnce();
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
