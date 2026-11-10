import { describe, expect, it } from "vitest";
import { buildMonthlyFormInput } from "./monthly-form";
import { InMemoryMonthlyStore } from "./monthly-store";
import { isUnavailableMonthlyDraftStatus, recoverMonthlyDraft } from "./monthly-recovery";
import { datesInMonth } from "./domain/month";

describe("obnovení měsíčního návrhu", () => {
  it("odliší neobnovitelný odkaz od dočasného selhání služby", () => {
    expect(isUnavailableMonthlyDraftStatus(404)).toBe(true);
    expect(isUnavailableMonthlyDraftStatus(503)).toBe(false);
  });

  it("ověří při obnovení aktuální verzi měsíčního rosteru", async () => {
    const form = buildMonthlyFormInput({ month: "2026-11", employees: [{ id: "e", name: "Test" }], absences: [], availability: [], staffing: Array(14).fill("0"), instructions: "" });
    if (!form.ok) throw new Error(form.message);
    const snapshot = { imports: [], days: datesInMonth("2026-11").map((date) => ({ employeeId: "e", date, status: date < "2026-11-15" ? "off" as const : "unknown" as const })) };
    const store = new InMemoryMonthlyStore();
    await store.create({ id: "partial", input: { ...form.value, planningRange: { startDate: "2026-11-15", endDate: "2026-11-30" }, rosterHistory: snapshot }, draft: { month: "2026-11", assignments: [], explanations: [], alternatives: [], assumptions: [], instructionsOutcome: "" }, mode: "ortools", providerName: "ortools" });
    const boundary = { before: { complete: true, assignments: [] }, after: { complete: true, assignments: [] } };
    const same = await recoverMonthlyDraft(store, "partial", "2026-11", boundary, snapshot);
    expect(same.ok && same.validation.unverified.some((item) => item.code === "ROSTER_HISTORY_CHANGED")).toBe(false);
    const changed = await recoverMonthlyDraft(store, "partial", "2026-11", boundary, { ...snapshot, imports: [{ id: "new", version: 1, fingerprint: "a".repeat(64) }] });
    expect(changed.ok && changed.validation.unverified.some((item) => item.code === "ROSTER_HISTORY_CHANGED")).toBe(true);
  });
  it("načte správnou verzi a znovu ověří celý měsíc s aktuálními podklady", async () => {
    const form = buildMonthlyFormInput({ month: "2026-11", employees: [{ id: "e", name: "Test" }], absences: [], availability: [], staffing: Array(14).fill("1"), instructions: "" });
    if (!form.ok) throw new Error(form.message);
    const store = new InMemoryMonthlyStore();
    const draft = { month: "2026-11", assignments: [{ employeeId: "e", date: "2026-11-02", shiftKind: "morning" as const }], explanations: [], alternatives: [], assumptions: [], instructionsOutcome: "" };
    await store.create({ id: "draft", input: form.value, draft, mode: "simulated", providerName: "simulated" });
    const boundary = { before: { complete: false, assignments: [] }, after: { complete: false, assignments: [] } };
    const result = await recoverMonthlyDraft(store, "draft", "2026-11", boundary);
    expect(result).toMatchObject({ ok: true, id: "draft", draft, validation: { canConfirm: false } });
    if (result.ok) {
      expect(result.validation.problems).toEqual(expect.arrayContaining([expect.objectContaining({ code: "COVERAGE_UNDERSTAFFED", date: "2026-11-30" })]));
      expect(result.validation.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "BOUNDARY_HISTORY_INCOMPLETE" })]));
    }
    expect(await recoverMonthlyDraft(store, "draft", "2026-12", boundary)).toMatchObject({ ok: false });
    expect(await recoverMonthlyDraft(store, "unknown", "2026-11", boundary)).toMatchObject({ ok: false });
  });
  it("neobnoví potvrzený návrh jako nepotvrzený", async () => {
    const form = buildMonthlyFormInput({ month: "2026-11", employees: [{ id: "e", name: "Test" }], absences: [], availability: [], staffing: Array(14).fill("0"), instructions: "" });
    if (!form.ok) throw new Error(form.message);
    const store = new InMemoryMonthlyStore();
    await store.create({ id: "draft", input: form.value, draft: { month: "2026-11", assignments: [], explanations: [], alternatives: [], assumptions: [], instructionsOutcome: "" }, mode: "simulated", providerName: "simulated" });
    const boundary = { before: { complete: true, assignments: [] }, after: { complete: true, assignments: [] } };
    await store.confirm("draft", { userId: "m", email: "test@example.test", displayName: "Test", role: "manager" }, boundary, new Date());
    expect(await recoverMonthlyDraft(store, "draft", "2026-11", boundary)).toMatchObject({ ok: false });
  });
});
