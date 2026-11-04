import { describe, expect, it, vi } from "vitest";
import { executeMonthlyPlanning, MonthlyProviderError, validateMonthlyDraft } from "./monthly-planning";
import { datesInMonth } from "./domain/month";
import type { MonthlyPlanningInput } from "./domain/month-input";

const input: MonthlyPlanningInput = { month: "2026-11", employees: [{ id: "e1", displayName: "Test", employmentType: "full_time" }], absences: [], availability: [], staffingRequirements: [], instructions: "pokyn" };
const boundary = { before: { complete: false, assignments: [] }, after: { complete: false, assignments: [] } };
const draft = { month: "2026-11", assignments: [], explanations: [], alternatives: [], assumptions: [], instructionsOutcome: "Zohledněno." };

describe("měsíční plánovací běh", () => {
  it("porovná aktuální podklady podle obsahu, nezávisle na pořadí dnů", () => {
    const snapshot = { imports: [{ id: "i1", version: 1, fingerprint: "a".repeat(64) }], days: datesInMonth("2026-11").map((date) => ({ employeeId: "e1", date, status: date < "2026-11-15" ? "off" as const : "unknown" as const })) };
    const partial = { ...input, planningRange: { startDate: "2026-11-15", endDate: "2026-11-30" }, rosterHistory: snapshot };
    const reordered = { ...snapshot, days: [...snapshot.days].reverse() };
    const changed = { ...snapshot, days: snapshot.days.map((day) => day.date === "2026-11-01" ? { ...day, status: "unknown" as const } : day) };
    expect(validateMonthlyDraft(partial, draft, boundary, "ortools", reordered).unverified.some((item) => item.code === "ROSTER_HISTORY_CHANGED")).toBe(false);
    expect(validateMonthlyDraft(partial, draft, boundary, "ortools", changed).unverified.some((item) => item.code === "ROSTER_HISTORY_CHANGED")).toBe(true);
    expect(validateMonthlyDraft(partial, draft, boundary, "ortools").unverified.some((item) => item.code === "ROSTER_HISTORY_CHANGED")).toBe(true);
  });
  it("nepustí nedokončené doplánování části měsíce k poskytovateli", async () => {
    const generateMonthlyPlan = vi.fn().mockResolvedValue(draft);
    const result = await executeMonthlyPlanning({ ...input, planningRange: { startDate: "2026-11-15", endDate: "2026-11-30" } }, boundary, { name: "ortools", generateMonthlyPlan });
    expect(result).toMatchObject({ ok: false, code: "invalid_input" });
    expect(generateMonthlyPlan).not.toHaveBeenCalled();
  });
  it("spustí lokální doplnění pouze s úplnými a nekonfliktními podklady", async () => {
    const snapshot = { imports: [], days: datesInMonth("2026-11").map((date) => ({ employeeId: "e1", date, status: date < "2026-11-15" ? "off" as const : "unknown" as const })) };
    const partial = { ...input, planningRange: { startDate: "2026-11-15", endDate: "2026-11-30" }, rosterHistory: snapshot };
    const generateMonthlyPlan = vi.fn().mockResolvedValue(draft);
    const result = await executeMonthlyPlanning(partial, boundary, { name: "ortools", generateMonthlyPlan });
    expect(result.ok).toBe(true);
    expect(generateMonthlyPlan).toHaveBeenCalledOnce();
    if (result.ok) expect(result.validation.unverified.some((finding) => finding.code === "ROSTER_HISTORY_CHANGED")).toBe(false);
    expect((await executeMonthlyPlanning(partial, boundary, { name: "gemini", generateMonthlyPlan })).ok).toBe(false);
    const changed = { ...snapshot, days: snapshot.days.map((day) => day.date === "2026-11-01" ? { ...day, status: "unknown" as const } : day) };
    const missing = await executeMonthlyPlanning({ ...partial, rosterHistory: changed }, boundary, { name: "ortools", generateMonthlyPlan });
    expect(missing).toMatchObject({ ok: false, message: expect.stringContaining("2026-11-01") });
    if (!missing.ok) expect(missing.message).toContain("Test");
    const overlap = { ...snapshot, days: snapshot.days.map((day) => day.date === "2026-11-15" ? { ...day, status: "off" as const } : day) };
    expect(await executeMonthlyPlanning({ ...partial, rosterHistory: overlap }, boundary, { name: "ortools", generateMonthlyPlan })).toMatchObject({ ok: false, message: expect.stringContaining("2026-11-15") });
  });
  it("volá poskytovatele jednou a nezávisle zkontroluje celý návrh", async () => {
    const generateMonthlyPlan = vi.fn().mockResolvedValue(draft);
    const result = await executeMonthlyPlanning(input, boundary, { name: "test", generateMonthlyPlan });
    expect(generateMonthlyPlan).toHaveBeenCalledTimes(1);
    expect(generateMonthlyPlan).toHaveBeenCalledWith(input, boundary);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.validation.canConfirm).toBe(false);
      expect(result.validation.unverified.some((item) => item.code === "BOUNDARY_HISTORY_INCOMPLETE")).toBe(true);
    }
  });
  it("nepřijme návrh pro jiný měsíc ani chybný tvar", async () => {
    const provider = { name: "test", generateMonthlyPlan: vi.fn().mockResolvedValue({ ...draft, month: "2026-12" }) };
    expect(await executeMonthlyPlanning(input, boundary, provider)).toMatchObject({ ok: false, code: "ai_invalid_output" });
  });
  it("nepřijme neznámý druh směny, který nelze zobrazit ani ověřit", async () => {
    const provider = { name: "test", generateMonthlyPlan: vi.fn().mockResolvedValue({ ...draft, assignments: [{ employeeId: "e1", date: "2026-11-01", shiftKind: "night" }] }) };
    expect(await executeMonthlyPlanning(input, boundary, provider)).toMatchObject({ ok: false, code: "ai_invalid_output" });
  });
  it("přizná chybu poskytovatele bez náhradního simulovaného návrhu", async () => {
    const provider = { name: "test", generateMonthlyPlan: vi.fn().mockRejectedValue(new Error("offline")) };
    expect(await executeMonthlyPlanning(input, boundary, provider)).toMatchObject({ ok: false, code: "ai_failed" });
  });
  it("zachová prokázanou neproveditelnost jako výsledek plánovače", async () => {
    const provider = { name: "ortools", generateMonthlyPlan: vi.fn().mockRejectedValue(new MonthlyProviderError("solver_infeasible")) };
    expect(await executeMonthlyPlanning(input, boundary, provider)).toMatchObject({
      ok: false, code: "solver_infeasible", message: expect.stringContaining("známých vstupech"),
    });
  });
  it("nepovažuje timeout za neproveditelné zadání", async () => {
    const provider = { name: "ortools", generateMonthlyPlan: vi.fn().mockRejectedValue(new MonthlyProviderError("solver_timeout")) };
    expect(await executeMonthlyPlanning(input, boundary, provider)).toMatchObject({
      ok: false, code: "solver_timeout", message: expect.stringContaining("není rozhodnuta"),
    });
  });
});
