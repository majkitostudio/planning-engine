import { describe, expect, it } from "vitest";
import { datesInMonth } from "./domain/month";
import { InMemoryMonthlyStore } from "./monthly-store";
import type { MonthlyPlanningInput } from "./domain/month-input";
import type { PlanningActor } from "../auth/actor";

const input: MonthlyPlanningInput = { month: "2026-11", employees: [{ id: "e1", displayName: "Test", employmentType: "full_time" }], absences: [], availability: [], instructions: "", staffingRequirements: datesInMonth("2026-11").flatMap((date) => ["morning", "afternoon"].map((shiftKind) => ({ date, shiftKind: shiftKind as "morning" | "afternoon", requiredEmployees: 0 }))) };
const draft = { month: "2026-11", assignments: [], explanations: [], alternatives: [], assumptions: [], instructionsOutcome: "" };
const complete = { before: { complete: true, assignments: [] }, after: { complete: true, assignments: [] } };
const incomplete = { ...complete, before: { complete: false, assignments: [] } };
const manager: PlanningActor = { userId: "m", email: "m@example.test", displayName: "Test", role: "manager" };
const viewer: PlanningActor = { ...manager, userId: "v", role: "viewer" };

describe("uložení měsíčního návrhu", () => {
  it("manažer odstraní potvrzený rozpis a může potvrdit nový pro stejný měsíc", async () => {
    const store = new InMemoryMonthlyStore();
    await store.create({ id: "p1", input, draft, providerName: "simulated", mode: "simulated" });
    await store.confirm("p1", manager, complete, new Date("2026-11-01T00:00:00Z"));
    expect(await store.list("2026-11")).toEqual([{ id: "p1", month: "2026-11", confirmed: true, createdAt: expect.any(String) }]);
    expect(await store.remove("p1", viewer, new Date(), true)).toEqual({ ok: false, code: "forbidden" });
    expect(await store.remove("p1", manager, new Date(), false)).toEqual({ ok: false, code: "changed" });
    expect((await store.get("p1"))?.confirmed).not.toBeNull();
    expect(await store.remove("p1", manager, new Date("2026-11-02T00:00:00Z"), true)).toEqual({ ok: true });
    expect(await store.get("p1")).toBeNull();
    expect(await store.list("2026-11")).toEqual([]);
    expect(await store.getConfirmed("2026-11")).toEqual({ ok: true, run: null });
    await store.create({ id: "p2", input, draft, providerName: "simulated", mode: "simulated" });
    expect(await store.confirm("p2", manager, complete, new Date("2026-11-03T00:00:00Z"))).toMatchObject({ ok: true, alreadyConfirmed: false });
    expect(await store.getConfirmed("2026-11")).toMatchObject({ ok: true, run: { id: "p2" } });
  });
  it("uložení návrhu nepotvrdí rozpis a viewer jej nesmí potvrdit", async () => {
    const store = new InMemoryMonthlyStore();
    await store.create({ id: "p1", input, draft, providerName: "simulated", mode: "simulated" });
    expect((await store.get("p1"))?.confirmed).toBeNull();
    expect(await store.confirm("p1", viewer, complete, new Date("2026-11-01T00:00:00Z"))).toMatchObject({ ok: false, code: "forbidden" });
    expect((await store.get("p1"))?.confirmed).toBeNull();
  });
  it("znovu ověří podklady při potvrzení a brání potvrzení neověřeného návrhu", async () => {
    const store = new InMemoryMonthlyStore();
    await store.create({ id: "p1", input, draft, providerName: "simulated", mode: "simulated" });
    expect(await store.confirm("p1", manager, incomplete, new Date("2026-11-01T00:00:00Z"))).toMatchObject({ ok: false, code: "confirmation_blocked" });
    expect((await store.get("p1"))?.confirmed).toBeNull();
  });
  it("uloží potvrzení manažera a další potvrzení je idempotentní", async () => {
    const store = new InMemoryMonthlyStore();
    await store.create({ id: "p1", input, draft, providerName: "simulated", mode: "simulated" });
    const time = new Date("2026-11-01T00:00:00Z");
    expect(await store.confirm("p1", manager, complete, time)).toMatchObject({ ok: true, alreadyConfirmed: false });
    expect(await store.confirm("p1", manager, complete, time)).toMatchObject({ ok: true, alreadyConfirmed: true });
    expect((await store.get("p1"))?.confirmed).toMatchObject({ by: "m", at: time.toISOString() });
    expect(store.auditEvents()).toHaveLength(1);
    expect(await store.getConfirmed("2026-11")).toMatchObject({ ok: true, run: { id: "p1", confirmed: { by: "m" } } });
    expect(await store.getConfirmed("2026-12")).toEqual({ ok: true, run: null });
  });
  it("nepřepíše existující návrh stejným identifikátorem", async () => {
    const store = new InMemoryMonthlyStore();
    await store.create({ id: "p1", input, draft, providerName: "simulated", mode: "simulated" });
    await expect(store.create({ id: "p1", input, draft, providerName: "simulated", mode: "simulated" })).rejects.toThrow();
  });
  it("nepotvrdí jiný návrh pro již potvrzený měsíc", async () => {
    const store = new InMemoryMonthlyStore();
    await store.create({ id: "p1", input, draft, providerName: "simulated", mode: "simulated" });
    await store.create({ id: "p2", input, draft, providerName: "simulated", mode: "simulated" });
    await store.confirm("p1", manager, complete, new Date());
    expect(await store.confirm("p2", manager, complete, new Date())).toMatchObject({ ok: false, code: "month_conflict" });
  });
  it("nepotvrdí scénář simulovaného neověřeného návrhu ani s jinak úplnou historií", async () => {
    const store = new InMemoryMonthlyStore();
    await store.create({ id: "p1", input, draft: { ...draft, simulationScenario: "unverified" }, providerName: "simulated", mode: "simulated" });
    expect(await store.confirm("p1", manager, complete, new Date())).toMatchObject({ ok: false, code: "confirmation_blocked" });
  });
});
