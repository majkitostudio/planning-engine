import { describe, expect, it } from "vitest";
import { buildMonthlyFormInput } from "./monthly-form";
import { InMemoryMonthlyStore } from "./monthly-store";
import { reviseMonthlyDraft } from "./monthly-edit";
import { datesInMonth } from "./domain/month";

describe("ruční úprava měsíčního návrhu", () => {
  it("při opakované kontrole porovná aktuální podklady rosteru", async () => {
    const form = buildMonthlyFormInput({ month: "2026-11", employees: [{ id: "e", name: "Test" }], absences: [], availability: [], staffing: Array(14).fill("0"), instructions: "" });
    if (!form.ok) throw new Error(form.message);
    const snapshot = { imports: [], days: datesInMonth("2026-11").map((date) => ({ employeeId: "e", date, status: date < "2026-11-15" ? "off" as const : "unknown" as const })) };
    const store = new InMemoryMonthlyStore();
    await store.create({ id: "old", input: { ...form.value, planningRange: { startDate: "2026-11-15", endDate: "2026-11-30" }, rosterHistory: snapshot }, draft: { month: "2026-11", assignments: [], explanations: [], alternatives: [], assumptions: [], instructionsOutcome: "" }, mode: "ortools", providerName: "ortools" });
    const boundary = { before: { complete: true, assignments: [] }, after: { complete: true, assignments: [] } };
    const result = await reviseMonthlyDraft(store, "old", "new", [], boundary, { ...snapshot, imports: [{ id: "new", version: 1, fingerprint: "a".repeat(64) }] });
    expect(result.ok && result.validation.unverified.some((item) => item.code === "ROSTER_HISTORY_CHANGED")).toBe(true);
  });
  it("zachová původní návrh, zkontroluje celý měsíc a neumožní potvrzení neúplného výsledku", async () => {
    const form = buildMonthlyFormInput({ month: "2026-11", employees: Array.from({ length: 29 }, (_, i) => ({ id: `e${i}`, name: `Test ${i}` })), absences: [], availability: [], staffing: ["15", "7", "15", "7", "15", "7", "15", "7", "15", "7", "7", "3", "7", "3"], instructions: "" });
    if (!form.ok) throw new Error(form.message);
    const store = new InMemoryMonthlyStore();
    const draft = { month: "2026-11", assignments: [{ employeeId: "e0", date: "2026-11-02", shiftKind: "morning" as const }], explanations: [], alternatives: [], assumptions: [], instructionsOutcome: "" };
    await store.create({ id: "old", input: form.value, draft, mode: "simulated", providerName: "simulated" });
    const boundary = { before: { complete: false, assignments: [] }, after: { complete: false, assignments: [] } };
    const result = await reviseMonthlyDraft(store, "old", "new", [{ employeeId: "e1", date: "2026-11-02", shiftKind: "afternoon" }], boundary);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.validation.problems).toEqual(expect.arrayContaining([expect.objectContaining({ code: "COVERAGE_UNDERSTAFFED", date: "2026-11-30" })]));
    expect(result.validation.unverified).toEqual(expect.arrayContaining([expect.objectContaining({ code: "BOUNDARY_HISTORY_INCOMPLETE" })]));
    expect(result.validation.canConfirm).toBe(false);
    expect((await store.get("old"))?.draft.assignments).toEqual(draft.assignments);
    expect((await store.get("new"))?.confirmed).toBeNull();
    expect(await store.getConfirmed("2026-11")).toEqual({ ok: true, run: null });
  });
  it("odmítne neplatná data a úpravu potvrzeného návrhu", async () => {
    const form = buildMonthlyFormInput({ month: "2026-11", employees: [{ id: "e", name: "Test" }], absences: [], availability: [], staffing: Array(14).fill("0"), instructions: "" });
    if (!form.ok) throw new Error(form.message);
    const store = new InMemoryMonthlyStore();
    const draft = { month: "2026-11", assignments: [], explanations: [], alternatives: [], assumptions: [], instructionsOutcome: "" };
    await store.create({ id: "old", input: form.value, draft, mode: "simulated", providerName: "simulated" });
    const boundary = { before: { complete: true, assignments: [] }, after: { complete: true, assignments: [] } };
    expect(await reviseMonthlyDraft(store, "old", "bad", "bad", boundary)).toMatchObject({ ok: false });
    await store.confirm("old", { userId: "m", email: "m@example.test", displayName: "Test", role: "manager" }, boundary, new Date());
    expect(await reviseMonthlyDraft(store, "old", "new", [], boundary)).toMatchObject({ ok: false });
  });
});
