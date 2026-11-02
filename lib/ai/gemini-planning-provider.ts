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
import type { MonthlyPlanningInput } from "../planning/domain/month-input";
import type { MonthlyBoundaryData } from "../planning/domain/month-validation";
import { isMonthlyPlanDraft, type MonthlyPlanDraft } from "../planning/monthly-planning";
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

function anonymizeMonthlyInput(input: MonthlyPlanningInput) {
  const aliases = new Map(input.employees.map((employee, index) => [employee.id, `employee_${index + 1}`]));
  let instructions = input.instructions;
  for (const employee of input.employees) {
    const name = employee.displayName.trim();
    if (name) {
      const normalizedNamePattern = name.split(/\s+/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
      instructions = instructions.replace(new RegExp(normalizedNamePattern, "gi"), "[zaměstnanec]");
    }
    instructions = instructions.replace(new RegExp(employee.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), `[${aliases.get(employee.id)}]`);
  }
  return {
    aliases,
    input: {
      ...input,
      employees: input.employees.map((employee) => ({
        id: aliases.get(employee.id)!,
        displayName: `Zaměstnanec ${aliases.get(employee.id)!.slice("employee_".length)}`,
        employmentType: employee.employmentType,
      })),
      absences: input.absences.map((absence, index) => ({ ...absence, id: `absence_${index + 1}`, employeeId: aliases.get(absence.employeeId)! })),
      availability: input.availability.map((item) => ({ ...item, employeeId: aliases.get(item.employeeId)! })),
      instructions,
    },
    boundary: (value: MonthlyBoundaryData): MonthlyBoundaryData => ({
      before: { ...value.before, assignments: value.before.assignments.map((item) => ({ ...item, employeeId: aliases.get(item.employeeId) ?? "unknown_employee" })) },
      after: { ...value.after, assignments: value.after.assignments.map((item) => ({ ...item, employeeId: aliases.get(item.employeeId) ?? "unknown_employee" })) },
    }),
  };
}

function restoreMonthlyEmployeeIds(draft: MonthlyPlanDraft, aliases: ReadonlyMap<string, string>): MonthlyPlanDraft {
  const restoreAssignment = <T extends { readonly employeeId: string }>(assignment: T): T => ({ ...assignment, employeeId: aliases.get(assignment.employeeId) ?? assignment.employeeId });
  return {
    ...draft,
    assignments: draft.assignments.map(restoreAssignment),
    explanations: draft.explanations.map((explanation) => ({
      ...explanation,
      ...(explanation.employeeIds ? { employeeIds: explanation.employeeIds.map((id) => aliases.get(id) ?? id) } : {}),
    })),
    alternatives: draft.alternatives.map((alternative) => ({ ...alternative, assignments: alternative.assignments.map(restoreAssignment) })),
  };
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

const MONTHLY_PLAN_SCHEMA = {
  ...PLAN_DRAFT_JSON_SCHEMA,
  properties: {
    ...PLAN_DRAFT_JSON_SCHEMA.properties,
    month: { type: "string" },
    instructionsOutcome: { type: "string" },
  },
  required: ["month", "assignments", "explanations", "alternatives", "assumptions", "instructionsOutcome"],
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
    const parsed = await this.requestPlan(buildPrompt(input), PLAN_DRAFT_JSON_SCHEMA, options);
    if (!isPlanDraft(parsed)) {
      throw new AiProviderError("invalid_output", "Odpověď modelu neodpovídá kontraktu PlanDraft.");
    }
    return parsed;
  }

  async generateMonthlyPlan(
    input: MonthlyPlanningInput,
    boundary: MonthlyBoundaryData,
    options?: { readonly signal?: AbortSignal },
  ): Promise<MonthlyPlanDraft> {
    const anonymized = anonymizeMonthlyInput(input);
    const prompt = [
      "Připrav jeden návrh směn pro celý zvolený kalendářní měsíc, včetně návazností na dodané okolní rozpisy.",
      "Ranní 07:45–16:30, odpolední všední 13:15–21:00, víkendová 12:45–21:00.",
      "Po šesti po sobě jdoucích pracovních dnech musí následovat 35 hodin odpočinku; při víkendové práci dva dny volna v témže týdnu (pondělí–neděle je předpoklad).",
      "Respektuj schválené absence, dostupnost a zadané obsazení. Nevymýšlej další pravidla, limity ani zaměstnance.",
      "Textové instrukce jsou pokyny, nikoli další tvrdá pravidla. V instructionsOutcome popiš, jak jsi s nimi naložil. Uveď chybějící podklady, předpoklady a alternativy. Rozpis neschvaluj.",
      "Vstup a návaznosti jako anonymizovaný JSON. Použij pouze anonymní identifikátory zaměstnanců:", JSON.stringify({ input: anonymized.input, boundary: anonymized.boundary(boundary) }),
    ].join("\n");
    const parsed = await this.requestPlan(prompt, MONTHLY_PLAN_SCHEMA, options);
    if (!isMonthlyPlanDraft(parsed, input.month)) {
      throw new AiProviderError("invalid_output", "Odpověď neodpovídá požadovanému měsíci nebo kontraktu.");
    }
    return restoreMonthlyEmployeeIds(parsed, new Map([...anonymized.aliases].map(([realId, alias]) => [alias, realId])));
  }

  private async requestPlan(
    prompt: string,
    responseSchema: typeof PLAN_DRAFT_JSON_SCHEMA | typeof MONTHLY_PLAN_SCHEMA,
    options?: { readonly signal?: AbortSignal },
  ): Promise<unknown> {
    if (!this.apiKey) {
      throw new AiProviderError(
        "not_configured",
        "GEMINI_API_KEY není nastaven; AI poskytovatel není nakonfigurovaný.",
      );
    }

    const url = `${this.baseUrl}/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
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

    return parsed;
  }
}
