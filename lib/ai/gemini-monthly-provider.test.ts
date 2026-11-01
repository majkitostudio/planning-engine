import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiPlanningProvider } from "./gemini-planning-provider";
import type { MonthlyPlanningInput } from "../planning/domain/month-input";

const input: MonthlyPlanningInput = { month: "2026-11", employees: [{ id: "e1", displayName: "Test", employmentType: "full_time" }], absences: [], availability: [], staffingRequirements: [], instructions: "Prosím zohlednit školení." };
const boundary = { before: { complete: false, assignments: [] }, after: { complete: false, assignments: [] } };
const draft = { month: "2026-11", assignments: [{ employeeId: "e1", date: "2026-11-02", shiftKind: "morning" }], explanations: [], alternatives: [], assumptions: [], instructionsOutcome: "Školení jsem zohlednil." };

afterEach(() => vi.unstubAllGlobals());

describe("Gemini měsíční návrh", () => {
  it("předá jeden měsíc, vstupy, historii i volný pokyn a vrátí jeden návrh", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(draft) }] } }] }) });
    vi.stubGlobal("fetch", fetchMock);
    const provider = new GeminiPlanningProvider({ apiKey: "test" });
    expect(await provider.generateMonthlyPlan(input, boundary)).toEqual(draft);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.contents[0].parts[0].text).toContain(input.instructions);
    expect(body.contents[0].parts[0].text).toContain("2026-11");
    expect(body.generationConfig.responseSchema.required).toContain("month");
  });

  it("odmítne odpověď pro jiný měsíc", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ ...draft, month: "2026-12" }) }] } }] }) }));
    const provider = new GeminiPlanningProvider({ apiKey: "test" });
    await expect(provider.generateMonthlyPlan(input, boundary)).rejects.toMatchObject({ code: "invalid_output" });
  });
});
