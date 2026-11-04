import { describe, expect, it } from "vitest";
import { buildMonthlyBoundary, resolveMonthlyRosterHistory } from "./month-history";

const novemberEmployee = ["e1"];
const before = { start: "2026-10-01", end: "2026-10-31", employeeIds: novemberEmployee, assignments: [{ employeeId: "e1", date: "2026-10-31", shiftKind: "morning" as const }] };
const after = { start: "2026-12-01", end: "2026-12-31", employeeIds: novemberEmployee, assignments: [] };

describe("podklady navazujících rozpisů", () => {
  it("rozpozná úplné sousední rozpisy i potvrzené volné dny", () => {
    const result = buildMonthlyBoundary("2026-11", novemberEmployee, [before, after]);
    expect(result.before.complete).toBe(true);
    expect(result.before.assignments).toMatchObject(before.assignments);
    expect(result.after.complete).toBe(true);
    expect(result.after.assignments).toEqual([]);
  });
  it("sloučí totožné překryvy a neúplný rozpis nepovažuje za úplnou historii", () => {
    const result = buildMonthlyBoundary("2026-11", novemberEmployee, [before, before]);
    expect(result.before.complete).toBe(true);
    expect(result.after.complete).toBe(false);
    expect(result.before.assignments).toMatchObject(before.assignments);
  });
  it("nepovažuje rozpis bez vybraného zaměstnance za úplný", () => {
    const result = buildMonthlyBoundary("2026-11", ["e1", "e2"], [before, after]);
    expect(result.before.complete).toBe(false);
    expect(result.after.complete).toBe(false);
  });

  it("novému zaměstnanci nevymýšlí volno v dřívějším rosteru", () => {
    const result = buildMonthlyBoundary("2026-11", ["e1", "e2"], [], [{
      start: "2026-10-25", end: "2026-10-31", employeeIds: ["e1"],
      entries: Array.from({ length: 7 }, (_, index) => ({ employeeId: "e1", date: `2026-10-${String(index + 25).padStart(2, "0")}`, status: "off" as const })),
    }]);

    expect(result.before.complete).toBe(false);
    expect(result.before.assignments).toEqual([]);
  });
  it("nepovažuje chybný záznam směny za důkaz volného dne", () => {
    const invalid = { ...before, assignments: [{ employeeId: "e1", date: "not-a-date", shiftKind: "morning" as const }] };
    expect(buildMonthlyBoundary("2026-11", novemberEmployee, [invalid, after]).before.complete).toBe(false);
  });
  it("zachová sedmý den před měsícem i sedmý den po měsíci pro kontrolu 35 hodin", () => {
    const previous = { ...before, assignments: [{ employeeId: "e1", date: "2026-10-25", shiftKind: "afternoon" as const }] };
    const following = { ...after, assignments: [{ employeeId: "e1", date: "2026-12-07", shiftKind: "morning" as const }] };
    const result = buildMonthlyBoundary("2026-11", novemberEmployee, [previous, following]);
    expect(result.before.assignments).toMatchObject(previous.assignments);
    expect(result.after.assignments).toMatchObject(following.assignments);
  });

  it("počítá výslovné volno jako známý den a zachová vlastní čas směny", () => {
    const roster = {
      start: "2026-10-25", end: "2026-10-31", employeeIds: novemberEmployee,
      entries: [
        ...["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"].map((date) => ({ employeeId: "e1", date, status: "shift" as const, startTime: "08:05", endTime: "16:45" })),
        { employeeId: "e1", date: "2026-10-31", status: "off" as const },
      ],
    };
    const result = buildMonthlyBoundary("2026-11", novemberEmployee, [], [roster]);

    expect(result.before.complete).toBe(true);
    expect(result.before.assignments[0]).toMatchObject({ date: "2026-10-25", startTime: "08:05", endTime: "16:45" });
  });

  it("ponechá chybějící rosterovou buňku neznámou a označí rozporné zdroje jako neúplné", () => {
    const roster = {
      start: "2026-10-25", end: "2026-10-31", employeeIds: novemberEmployee,
      entries: [
        ...["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"].map((date) => ({ employeeId: "e1", date, status: "shift" as const, startTime: "08:05", endTime: "16:45" })),
      ],
    };
    const missing = buildMonthlyBoundary("2026-11", novemberEmployee, [], [roster]);
    const conflict = buildMonthlyBoundary("2026-11", novemberEmployee, [before], [
      { ...roster, start: before.start, end: before.end, entries: [{ employeeId: "e1", date: "2026-10-31", status: "off" as const }] },
    ]);

    expect(missing.before.complete).toBe(false);
    expect(conflict.before.complete).toBe(false);
  });

  it("vytvoří snapshot bez jmen s explicitními dny, neznámem a rozporem", () => {
    const one = {
      id: "import-1", version: 1, fingerprint: "a".repeat(64), start: "2026-11-01", end: "2026-11-03", employeeIds: ["e1"],
      entries: [
        { employeeId: "e1", date: "2026-11-01", status: "off" as const },
        { employeeId: "e1", date: "2026-11-02", status: "shift" as const, startTime: "08:05", endTime: "16:45" },
      ],
    };
    const two = {
      id: "import-2", version: 1, fingerprint: "b".repeat(64), start: "2026-11-02", end: "2026-11-02", employeeIds: ["e1"],
      entries: [{ employeeId: "e1", date: "2026-11-02", status: "off" as const }],
    };
    const snapshot = resolveMonthlyRosterHistory("2026-11", ["e1"], [one, two]);

    expect(snapshot.imports).toHaveLength(2);
    expect(snapshot.days.find((day) => day.date === "2026-11-01")).toMatchObject({ status: "off" });
    expect(snapshot.days.find((day) => day.date === "2026-11-02")).toMatchObject({ status: "conflict" });
    expect(snapshot.days.find((day) => day.date === "2026-11-03")).toMatchObject({ status: "unknown" });
  });
});
