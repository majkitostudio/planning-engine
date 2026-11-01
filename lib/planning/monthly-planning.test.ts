import { describe, expect, it, vi } from "vitest";
import { executeMonthlyPlanning } from "./monthly-planning";
import type { MonthlyPlanningInput } from "./domain/month-input";

const input: MonthlyPlanningInput = { month: "2026-11", employees: [{ id: "e1", displayName: "Test", employmentType: "full_time" }], absences: [], availability: [], staffingRequirements: [], instructions: "pokyn" };
const boundary = { before: { complete: false, assignments: [] }, after: { complete: false, assignments: [] } };
const draft = { month: "2026-11", assignments: [], explanations: [], alternatives: [], assumptions: [], instructionsOutcome: "Zohledněno." };

describe("měsíční plánovací běh", () => {
  it("volá AI jednou a nezávisle zkontroluje celý návrh", async () => {
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
});
