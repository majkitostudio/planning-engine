/**
 * Serverový adaptér pro Google Gemini API.
 *
 * Implementuje provider-neutral rozhraní `PlanningModelProvider`. Používá
 * strukturovaný JSON výstup (`responseMimeType` + `responseSchema`), aby
 * model vracel data odpovídající kontraktu `PlanDraft`. API klíč se čte
 * výhradně z prostředí nebo konstruktoru a nikdy se neloguje.
 */

import { AiProviderError, isPlanDraft, type PlanningModelProvider } from "../planning/ai-provider";
import type { PlanningInput, PlanDraft } from "../planning/domain";
import { buildDomainSystemPrompt } from "./planning-domain-prompt";

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = 30_000;

export interface GeminiPlanningProviderOptions {
  readonly apiKey?: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
}

const PLAN_DRAFT_JSON_SCHEMA = {
  type: "object",
  properties: {
    weekStart: { type: "string" },
    assignments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          employeeId: { type: "string" },
          date: { type: "string" },
          shiftKind: { type: "string", enum: ["morning", "afternoon"] },
        },
        required: ["employeeId", "date", "shiftKind"],
      },
    },
    explanations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            enum: ["assignment", "coverage", "rest", "weekend", "preference", "other"],
          },
          text: { type: "string" },
          employeeIds: { type: "array", items: { type: "string" } },
          dates: { type: "array", items: { type: "string" } },
          shiftKinds: { type: "array", items: { type: "string", enum: ["morning", "afternoon"] } },
        },
        required: ["topic", "text"],
      },
    },
    alternatives: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          summary: { type: "string" },
          impact: { type: "string" },
          assignments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                employeeId: { type: "string" },
                date: { type: "string" },
                shiftKind: { type: "string", enum: ["morning", "afternoon"] },
              },
              required: ["employeeId", "date", "shiftKind"],
            },
          },
          tradeOffs: { type: "array", items: { type: "string" } },
        },
        required: ["id", "summary", "impact", "assignments"],
      },
    },
    assumptions: { type: "array", items: { type: "string" } },
  },
  required: ["weekStart", "assignments", "explanations", "alternatives", "assumptions"],
} as const;

function buildPrompt(input: PlanningInput): string {
  return buildDomainSystemPrompt(input);
}

export class GeminiPlanningProvider implements PlanningModelProvider {
  readonly name = "gemini";

  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: GeminiPlanningProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
    this.model = options.model ?? process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
    this.baseUrl = (options.baseUrl ?? process.env.GEMINI_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async generatePlan(
    input: PlanningInput,
    options?: { readonly signal?: AbortSignal },
  ): Promise<PlanDraft> {
    if (!this.apiKey) {
      throw new AiProviderError(
        "not_configured",
        "GEMINI_API_KEY není nastaven; AI poskytovatel není nakonfigurovaný.",
      );
    }

    const url = `${this.baseUrl}/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;
    const body = {
      contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: PLAN_DRAFT_JSON_SCHEMA,
        temperature: 0.3,
      },
    };

    const controller = new AbortController();
    const externalSignal = options?.signal;
    const abortFromExternal = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener("abort", abortFromExternal, { once: true });
    }
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      if (externalSignal) externalSignal.removeEventListener("abort", abortFromExternal);
      if (error instanceof Error && error.name === "AbortError") {
        throw new AiProviderError("timeout", "Vypršel časový limit při volání Gemini API.", {
          timeoutMs: this.timeoutMs,
        });
      }
      throw new AiProviderError("failed", "Síťová chyba při volání Gemini API.", {
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      clearTimeout(timer);
      if (externalSignal) externalSignal.removeEventListener("abort", abortFromExternal);
    }

    if (!response.ok) {
      let bodyText = "";
      try {
        bodyText = await response.text();
      } catch {
        bodyText = "";
      }
      throw new AiProviderError("failed", `Gemini API vrátilo HTTP ${response.status}.`, {
        status: response.status,
        body: bodyText.slice(0, 500),
      });
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new AiProviderError("failed", "Odpověď Gemini API není platný JSON.");
    }

    const text = (json as { candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }> })
      ?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof text !== "string" || text.trim() === "") {
      throw new AiProviderError("failed", "Gemini API nevrátila textovou odpověď.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new AiProviderError("invalid_output", "Odpověď modelu není platný JSON.");
    }

    if (!isPlanDraft(parsed)) {
      throw new AiProviderError("invalid_output", "Odpověď modelu neodpovídá kontraktu PlanDraft.");
    }

    return parsed;
  }
}
