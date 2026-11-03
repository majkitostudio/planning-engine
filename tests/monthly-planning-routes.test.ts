import { beforeEach, describe, expect, it, vi } from "vitest";

const actor = { userId: "m", email: "m@example.test", displayName: "Test", role: "manager" };
const access = vi.fn();
const create = vi.fn();
const confirm = vi.fn();
const loadBoundary = vi.fn();
const getConfirmed = vi.fn();
const loadPreviousWeeklyEmployees = vi.fn();
const monthlyMode = vi.hoisted(() => ({ value: "simulated" as "simulated" | "ortools" }));
const generateOrtools = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/route-access", () => ({ requirePlanningActor: () => access() }));
vi.mock("@/lib/planning/monthly-runtime", () => ({ getMonthlyRuntime: () => ({ configured: true, mode: monthlyMode.value, create, confirm, loadBoundary, getConfirmed }), getMonthlyPersistenceRuntime: () => ({ configured: true, create, confirm, loadBoundary, getConfirmed, loadPreviousWeeklyEmployees }) }));
vi.mock("@/lib/planning/monthly-ortools-provider", () => ({ MonthlyOrtoolsProvider: class { name = "ortools"; generateMonthlyPlan = generateOrtools; } }));

import { POST as run } from "@/app/api/planning/monthly/run/route";
import { POST as confirmRoute } from "@/app/api/planning/monthly/confirm/route";
import { GET as readMonth } from "@/app/api/planning/monthly/route";

const input = { month: "2026-11", employees: [{ id: "e1", displayName: "Test", employmentType: "full_time" }], absences: [], availability: [], staffingRequirements: [], instructions: "Test" };
const request = (body: unknown) => new Request("http://localhost", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

beforeEach(() => { vi.clearAllMocks(); monthlyMode.value = "simulated"; access.mockResolvedValue({ ok: true, actor }); loadBoundary.mockResolvedValue({ before: { complete: false, assignments: [] }, after: { complete: false, assignments: [] } }); });

describe("měsíční plánovací API", () => {
  it("uloží pouze návrh a vrátí neověřené kontroly", async () => {
    const response = await run(request({ input, scenario: "partial" }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.mode).toBe("simulated");
    expect(body.validation.canConfirm).toBe(false);
    expect(create).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
  });
  it("spustí OR-Tools jako samostatný měsíční režim a uloží jeho vlastní identitu", async () => {
    monthlyMode.value = "ortools";
    generateOrtools.mockResolvedValue({ month: input.month, assignments: [], explanations: [], alternatives: [], assumptions: [], instructionsOutcome: "Pokyny nebyly vyhodnoceny." });
    const response = await run(request({ input }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.mode).toBe("ortools");
    expect(generateOrtools).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ mode: "ortools", providerName: "ortools" }));
  });
  it("viewer nemůže spustit ani potvrdit běh", async () => {
    access.mockResolvedValue({ ok: true, actor: { ...actor, role: "viewer" } });
    expect((await run(request({ input, scenario: "partial" }))).status).toBe(403);
    expect((await confirmRoute(request({ id: "p" }))).status).toBe(403);
    expect(create).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });
  it("odmítne chybný vstup a nevolá úložiště", async () => {
    const response = await run(request({ input: { ...input, month: "bad" }, scenario: "complete" }));
    expect(response.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
  it("předá potvrzení jen úložišti a vrátí blokaci", async () => {
    confirm.mockResolvedValue({ ok: false, code: "confirmation_blocked" });
    expect((await confirmRoute(request({ id: "p" }))).status).toBe(409);
    expect(confirm).toHaveBeenCalledOnce();
  });
  it("viewer smí číst potvrzený rozpis měsíce", async () => {
    access.mockResolvedValue({ ok: true, actor: { ...actor, role: "viewer" } });
    getConfirmed.mockResolvedValue({ ok: true, run: null });
    const response = await readMonth(new Request("http://localhost/api/planning/monthly?month=2026-11"));
    expect(response.status).toBe(200);
    expect(getConfirmed).toHaveBeenCalledWith("2026-11");
    expect(await response.json()).toEqual({ ok: true, view: null });
  });
  it("vrátí potvrzený rozpis se zachovanou identitou zaměstnanců", async () => {
    const draft = { month: input.month, assignments: [], explanations: [], alternatives: [], assumptions: [], instructionsOutcome: "" };
    getConfirmed.mockResolvedValue({ ok: true, run: { id: "p", input, draft, mode: "simulated", confirmed: { by: "m", at: "2026-11-01T00:00:00.000Z" } } });
    const response = await readMonth(new Request("http://localhost/api/planning/monthly?month=2026-11"));
    expect(await response.json()).toMatchObject({ ok: true, view: { confirmed: true, input: { employees: [{ id: "e1" }] } } });
  });
  it("čtení odmítne neplatné období", async () => {
    const response = await readMonth(new Request("http://localhost/api/planning/monthly?month=bad"));
    expect(response.status).toBe(400);
    expect(getConfirmed).not.toHaveBeenCalled();
  });
  it("předá identity z potvrzeného týdne a nejednoznačný výsledek odmítne", async () => {
    loadPreviousWeeklyEmployees.mockResolvedValueOnce({ ok: true, employees: [{ id: "e1", displayName: "Test" }] }).mockResolvedValueOnce({ ok: false });
    const url = "http://localhost/api/planning/monthly?month=2026-11&employees=previous-week";
    expect(await (await readMonth(new Request(url))).json()).toEqual({ ok: true, employees: [{ id: "e1", displayName: "Test" }] });
    expect((await readMonth(new Request(url))).status).toBe(409);
  });
});
