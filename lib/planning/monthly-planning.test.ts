import { describe, expect, it, vi } from "vitest";
import { executeMonthlyPlanning, isMonthlyPlanDraft, validateMonthlyDraft } from "./monthly-planning";
import { AiProviderError } from "./ai-provider";
import { datesInMonth } from "./domain/month";
import type { MonthlyPlanningInput } from "./domain/month-input";

const input: MonthlyPlanningInput = { month: "2026-11", employees: [{ id: "e1", displayName: "Test", employmentType: "full_time" }], absences: [], availability: [], staffingRequirements: [], instructions: "pokyn" };
const boundary = { before: { complete: false, assignments: [] }, after: { complete: false, assignments: [] } };
const draft = { month: "2026-11", assignments: [], explanations: [], alternatives: [], assumptions: [], instructionsOutcome: "Zohledněno." };

describe("měsíční plánovací běh", () => {
  it("odmítne nové prázdné ID alternativy a povolí jej jen pro starší uložená data", () => {
    const legacy = { ...draft, alternatives: [{ id: "", summary: "Alternativa", impact: "Dopad", assignments: [] }] };
    expect(isMonthlyPlanDraft(legacy, input.month)).toBe(false);
    expect(isMonthlyPlanDraft(legacy, input.month, { allowLegacyEmptyAlternativeId: true })).toBe(true);
  });
  it("porovná aktuální podklady podle obsahu, nezávisle na pořadí dnů", () => {
    const snapshot = { imports: [{ id: "i1", version: 1, fingerprint: "a".repeat(64) }], days: datesInMonth("2026-11").map((date) => ({ employeeId: "e1", date, status: date < "2026-11-15" ? "off" as const : "unknown" as const })) };
    const partial = { ...input, planningRange: { startDate: "2026-11-15", endDate: "2026-11-30" }, rosterHistory: snapshot };
    const reordered = { ...snapshot, days: [...snapshot.days].reverse() };
    const changed = { ...snapshot, days: snapshot.days.map((day) => day.date === "2026-11-01" ? { ...day, status: "unknown" as const } : day) };
    expect(validateMonthlyDraft(partial, draft, boundary, "ortools", reordered).unverified.some((item) => item.code === "ROSTER_HISTORY_CHANGED")).toBe(false);
    expect(validateMonthlyDraft(partial, draft, boundary, "ortools", changed).unverified.some((item) => item.code === "ROSTER_HISTORY_CHANGED")).toBe(true);
    expect(validateMonthlyDraft(partial, draft, boundary, "ortools").unverified.some((item) => item.code === "ROSTER_HISTORY_CHANGED")).toBe(true);
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
  it("rozliší chybějící konfiguraci AI a časový limit od obecného selhání", async () => {
    const notConfigured = { name: "cloudflare", generateMonthlyPlan: vi.fn().mockRejectedValue(new AiProviderError("not_configured", "chybí klíč")) };
    expect(await executeMonthlyPlanning(input, boundary, notConfigured)).toMatchObject({
      ok: false, code: "ai_failed", message: expect.stringContaining("není nakonfigurovaný"),
    });
    const timedOut = { name: "cloudflare", generateMonthlyPlan: vi.fn().mockRejectedValue(new AiProviderError("timeout", "limit")) };
    expect(await executeMonthlyPlanning(input, boundary, timedOut)).toMatchObject({
      ok: false, code: "ai_failed", message: expect.stringContaining("časovém limitu"),
    });
  });
});
