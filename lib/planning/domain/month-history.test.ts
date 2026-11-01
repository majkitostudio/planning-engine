import { describe, expect, it } from "vitest";
import { buildMonthlyBoundary } from "./month-history";

const novemberEmployee = ["e1"];
const before = { start: "2026-10-01", end: "2026-10-31", employeeIds: novemberEmployee, assignments: [{ employeeId: "e1", date: "2026-10-31", shiftKind: "morning" as const }] };
const after = { start: "2026-12-01", end: "2026-12-31", employeeIds: novemberEmployee, assignments: [] };

describe("podklady navazujících rozpisů", () => {
  it("rozpozná úplné sousední rozpisy i potvrzené volné dny", () => {
    const result = buildMonthlyBoundary("2026-11", novemberEmployee, [before, after]);
    expect(result.before.complete).toBe(true);
    expect(result.before.assignments).toEqual(before.assignments);
    expect(result.after.complete).toBe(true);
    expect(result.after.assignments).toEqual([]);
  });
  it("nepovažuje chybějící nebo nejednoznačný rozpis za úplnou historii", () => {
    const result = buildMonthlyBoundary("2026-11", novemberEmployee, [before, before]);
    expect(result.before.complete).toBe(false);
    expect(result.after.complete).toBe(false);
    expect(result.before.assignments).toEqual([]);
  });
  it("nepovažuje rozpis bez vybraného zaměstnance za úplný", () => {
    const result = buildMonthlyBoundary("2026-11", ["e1", "e2"], [before, after]);
    expect(result.before.complete).toBe(false);
    expect(result.after.complete).toBe(false);
  });
  it("nepovažuje chybný záznam směny za důkaz volného dne", () => {
    const invalid = { ...before, assignments: [{ employeeId: "e1", date: "not-a-date", shiftKind: "morning" as const }] };
    expect(buildMonthlyBoundary("2026-11", novemberEmployee, [invalid, after]).before.complete).toBe(false);
  });
  it("zachová sedmý den před měsícem i sedmý den po měsíci pro kontrolu 35 hodin", () => {
    const previous = { ...before, assignments: [{ employeeId: "e1", date: "2026-10-25", shiftKind: "afternoon" as const }] };
    const following = { ...after, assignments: [{ employeeId: "e1", date: "2026-12-07", shiftKind: "morning" as const }] };
    const result = buildMonthlyBoundary("2026-11", novemberEmployee, [previous, following]);
    expect(result.before.assignments).toEqual(previous.assignments);
    expect(result.after.assignments).toEqual(following.assignments);
  });
});
