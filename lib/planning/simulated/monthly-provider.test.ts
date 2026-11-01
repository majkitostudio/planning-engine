import { describe, expect, it } from "vitest";
import { SimulatedMonthlyProvider } from "./monthly-provider";
import type { MonthlyPlanningInput } from "../domain/month-input";
import { validateMonthlyDraft } from "../monthly-planning";

const input: MonthlyPlanningInput = { month: "2026-11", employees: [{ id: "e1", displayName: "Test", employmentType: "full_time" }], absences: [], availability: [{ employeeId: "e1", date: "2026-11-02", shiftKind: "morning", available: true }], staffingRequirements: [{ date: "2026-11-02", shiftKind: "morning", requiredEmployees: 1 }], instructions: "Test" };
const boundary = { before: { complete: false, assignments: [] }, after: { complete: false, assignments: [] } };

describe("simulovaný měsíční poskytovatel", () => {
  it("vrátí pouze syntetický návrh z daných vstupů", async () => {
    const draft = await new SimulatedMonthlyProvider("complete").generateMonthlyPlan(input, boundary);
    expect(draft.month).toBe(input.month);
    expect(draft.assignments).toEqual([{ employeeId: "e1", date: "2026-11-02", shiftKind: "morning" }]);
    expect(draft.assumptions.join(" ")).toContain("SIMULATED");
  });
  it("poskytne částečný scénář bez předstírání doplněného pokrytí", async () => {
    const draft = await new SimulatedMonthlyProvider("partial").generateMonthlyPlan(input, boundary);
    expect(draft.assignments).toEqual([]);
  });
  it("neověřený scénář zůstane zablokovaný i při jinak úplných podkladech", async () => {
    const full = { ...input, staffingRequirements: (await import("../domain/month")).datesInMonth(input.month).flatMap((date) => (["morning", "afternoon"] as const).map((shiftKind) => ({ date, shiftKind, requiredEmployees: 0 }))) };
    const draft = await new SimulatedMonthlyProvider("unverified").generateMonthlyPlan(full, boundary);
    const result = validateMonthlyDraft(full, draft, { before: { complete: true, assignments: [] }, after: { complete: true, assignments: [] } }, "simulated");
    expect(result.status).toBe("not_verified");
    expect(result.canConfirm).toBe(false);
    expect(result.unverified.some((item) => item.code === "SIMULATED_UNVERIFIED")).toBe(true);
  });
  it("částečný scénář zůstane zablokovaný i pokud vstup vyžaduje nulové obsazení", async () => {
    const full = { ...input, staffingRequirements: (await import("../domain/month")).datesInMonth(input.month).flatMap((date) => (["morning", "afternoon"] as const).map((shiftKind) => ({ date, shiftKind, requiredEmployees: 0 }))) };
    const draft = await new SimulatedMonthlyProvider("partial").generateMonthlyPlan(full, boundary);
    const result = validateMonthlyDraft(full, draft, { before: { complete: true, assignments: [] }, after: { complete: true, assignments: [] } }, "simulated");
    expect(result.canConfirm).toBe(false);
    expect(result.problems.some((item) => item.code === "SIMULATED_PARTIAL")).toBe(true);
  });
});
