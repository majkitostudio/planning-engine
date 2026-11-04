import { afterEach, describe, expect, it, vi } from "vitest";

import { GeminiIntentTranslator } from "./gemini-intent-translator";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function mockGeminiResult(value: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("GeminiIntentTranslator", () => {
  it.each([
    [{ version: 1, status: "recognized", intent: "shift_rotation_preference", enabled: true }, true],
    [{ version: 1, status: "recognized", intent: "shift_rotation_preference", enabled: false }, false],
    [{ version: 1, status: "ambiguous" }, "ambiguous"],
    [{ version: 1, status: "unsupported" }, "unsupported"],
  ])("returns only the validated translation %j", async (response, expected) => {
    mockGeminiResult(response);
    const result = await new GeminiIntentTranslator({ apiKey: "synthetic-test-key" })
      .translate("Prosím střídat směny.", "manager");
    if (typeof expected === "boolean") {
      expect(result).toMatchObject({ status: "recognized", enabled: expected });
    } else {
      expect(result).toMatchObject({ status: expected });
    }
  });

  it("posílá pouze text a typ zadavatele vedle pevného systémového pokynu", async () => {
    const fetchMock = mockGeminiResult({ version: 1, status: "recognized", intent: "shift_rotation_preference", enabled: true });
    await new GeminiIntentTranslator({ apiKey: "synthetic-test-key" })
      .translate("Prosím střídat směny.", "manager");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.systemInstruction.parts[0].text).toContain("Nepřidávej žádné nové záměry");
    expect(JSON.parse(body.contents[0].parts[0].text)).toEqual({ actor: "manager", text: "Prosím střídat směny." });
    expect(body.generationConfig.responseSchema.anyOf).toHaveLength(3);
    expect(JSON.stringify(body)).not.toContain("employee");
    expect(JSON.stringify(body)).not.toContain("roster");
  });

  it("odmítne neplatnou strukturu modelu", async () => {
    mockGeminiResult({ version: 1, status: "recognized", intent: "weekend_fairness", enabled: true });
    await expect(new GeminiIntentTranslator({ apiKey: "synthetic-test-key" })
      .translate("Prosím spravedlivě rozdělit víkendy.", "manager"))
      .rejects.toMatchObject({ code: "invalid_output" });
  });

  it("vrátí chybu poskytovatele při HTTP chybě", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    await expect(new GeminiIntentTranslator({ apiKey: "synthetic-test-key" })
      .translate("Prosím střídat směny.", "manager"))
      .rejects.toMatchObject({ code: "failed" });
  });

  it("označí přerušení požadavku jako timeout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: unknown, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    })));
    await expect(new GeminiIntentTranslator({ apiKey: "synthetic-test-key", timeoutMs: 5 })
      .translate("Prosím střídat směny.", "manager"))
      .rejects.toMatchObject({ code: "timeout", name: "AiProviderError" });
  });

  it("prázdný text označí jako nejasný bez volání sítě", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await new GeminiIntentTranslator({ apiKey: "synthetic-test-key" }).translate("  ", "manager");
    expect(result).toEqual({ version: 1, status: "ambiguous" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bez API klíče nevolá síť", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(new GeminiIntentTranslator({ apiKey: undefined })
      .translate("Prosím střídat směny.", "manager"))
      .rejects.toMatchObject({ code: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
