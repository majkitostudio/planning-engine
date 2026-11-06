import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { GeminiPlanningProvider } from "./gemini-planning-provider";
import type { PlanningInput } from "../planning/domain";

const WEEK_START = "2026-06-01";

function makeInput(): PlanningInput {
  return {
    weekStart: WEEK_START,
    timeZone: "Europe/Prague",
    employees: [{ id: "e1", displayName: "Synteticky e1", employmentType: "full_time" }],
    shiftDefinitions: [],
    staffingRequirements: [],
    absences: [],
    requests: [],
    existingAssignments: [],
    rules: {
      consecutiveWorkingDaysBeforeLongRest: 6,
      longRestHours: 35,
      weekendWorkDaysOff: 2,
    },
  };
}

function makeDraftJson() {
  return JSON.stringify({
    weekStart: WEEK_START,
    assignments: [{ employeeId: "e1", date: WEEK_START, shiftKind: "morning" }],
    explanations: [],
    alternatives: [],
    assumptions: ["test"],
  });
}

describe("GeminiPlanningProvider", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    delete process.env.GEMINI_MODEL;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("vyhodí not_configured bez API klíče", async () => {
    delete process.env.GEMINI_API_KEY;
    const provider = new GeminiPlanningProvider({ apiKey: undefined });
    // ensure no key
    (provider as unknown as { apiKey?: string }).apiKey = undefined;
    await expect(provider.generatePlan(makeInput())).rejects.toMatchObject({
      code: "not_configured",
    });
  });

  it("sestaví request s API klíčem a strukturovaným výstupem", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: makeDraftJson() }] } }],
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = new GeminiPlanningProvider({ apiKey: "secret-key" });
    await provider.generatePlan(makeInput());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("gemini-2.5-flash:generateContent");
    expect((init as RequestInit).headers).toMatchObject({ "x-goog-api-key": "secret-key" });
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseSchema).toBeDefined();
  });

  it("vrátí PlanDraft při platné odpovědi", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: makeDraftJson() }] } }],
      }),
    }) as unknown as typeof fetch;

    const provider = new GeminiPlanningProvider({ apiKey: "k" });
    const draft = await provider.generatePlan(makeInput());
    expect(draft.weekStart).toBe(WEEK_START);
    expect(draft.assignments).toHaveLength(1);
  });

  it("vyhodí invalid_output při neplatném JSON", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "not json" }] } }],
      }),
    }) as unknown as typeof fetch;

    const provider = new GeminiPlanningProvider({ apiKey: "k" });
    await expect(provider.generatePlan(makeInput())).rejects.toMatchObject({
      code: "invalid_output",
    });
  });

  it("vyhodí failed při HTTP chybě", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "rate limited",
    }) as unknown as typeof fetch;

    const provider = new GeminiPlanningProvider({ apiKey: "k" });
    await expect(provider.generatePlan(makeInput())).rejects.toMatchObject({
      code: "failed",
    });
  });

  it("vyhodí timeout při AbortError", async () => {
    globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        (init as RequestInit).signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    }) as unknown as typeof fetch;

    const provider = new GeminiPlanningProvider({ apiKey: "k", timeoutMs: 10 });
    await expect(provider.generatePlan(makeInput())).rejects.toMatchObject({
      code: "timeout",
    });
  });

  it("použije GEMINI_TIMEOUT_MS z prostředí", async () => {
    process.env.GEMINI_TIMEOUT_MS = "5";
    globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        (init as RequestInit).signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    }) as unknown as typeof fetch;

    const provider = new GeminiPlanningProvider({ apiKey: "k" });
    await expect(provider.generatePlan(makeInput())).rejects.toMatchObject({
      code: "timeout",
    });
  });

  it("použije vlastní model z konstruktoru", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: makeDraftJson() }] } }],
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = new GeminiPlanningProvider({ apiKey: "k", model: "gemini-2.5-flash-lite" });
    await provider.generatePlan(makeInput());
    expect(String(fetchMock.mock.calls[0][0])).toContain("gemini-2.5-flash-lite:generateContent");
  });

  it("posílá měsíční vstup bez skutečných jmen a interních ID a ID návrhu obnoví až lokálně", async () => {
    const realId = "local-employee-record-9281";
    const realName = "Testovaci Zamestnanec";
    let requestBody = "";
    globalThis.fetch = vi.fn().mockImplementation(async (_url, init) => {
      requestBody = (init as RequestInit).body as string;
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({
        month: "2026-11", instructionsOutcome: "Pokyn zohledněn.",
        assignments: [{ employeeId: "employee_1", date: "2026-11-01", shiftKind: "morning" }],
        explanations: [{ topic: "assignment", text: "Přiřazení", employeeIds: ["employee_1"] }],
        alternatives: [{ id: "alt-1", summary: "Alternativa", impact: "Bez dopadu", assignments: [{ employeeId: "employee_1", date: "2026-11-02", shiftKind: "afternoon" }] }],
        assumptions: [],
      }) }] } }] }) };
    }) as unknown as typeof fetch;

    const provider = new GeminiPlanningProvider({ apiKey: "k" });
    const draft = await provider.generateMonthlyPlan({
      month: "2026-11",
      employees: [{ id: realId, displayName: realName, employmentType: "full_time" }],
      absences: [{ id: "absence-real-id", employeeId: realId, from: "2026-11-03", to: "2026-11-04", type: "vacation", status: "approved" }],
      availability: [{ employeeId: realId, date: "2026-11-01", shiftKind: "morning", available: true }],
      staffingRequirements: [{ date: "2026-11-01", shiftKind: "morning", requiredEmployees: 1 }],
      instructions: `Zohledni ${realName} (${realId}).`,
    }, { before: { complete: true, assignments: [{ employeeId: realId, date: "2026-10-31", shiftKind: "morning" }] }, after: { complete: false, assignments: [] } });

    expect(requestBody).not.toContain(realName);
    expect(requestBody).not.toContain(realId);
    expect(requestBody).not.toContain("absence-real-id");
    expect(requestBody).toContain("employee_1");
    expect(draft.assignments[0].employeeId).toBe(realId);
    expect(draft.explanations[0].employeeIds).toEqual([realId]);
    expect(draft.alternatives[0].assignments[0].employeeId).toBe(realId);
  });
});
