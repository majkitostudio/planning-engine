/**
 * Měsíční AI plánovač nad Cloudflare Workers AI (REST API).
 *
 * Adaptér je záměrně tenký: sestaví strukturovaný vstup, zavolá model
 * s JSON schématem a výsledek vrátí jako `MonthlyPlanDraft`. Ověření návrhu
 * zůstává na deterministické validaci, ne na modelu.
 *
 * Měsíc se generuje po kalendářních týdnech. Jeden požadavek na celý měsíc
 * by u bezplatné kvóty a výstupních limitů často selhal; týdenní části se
 * spojí a teprve celek projde měsíční validací.
 */

import { AiProviderError } from "../planning/ai-provider";
import type { MonthlyPlanningInput } from "../planning/domain/month-input";
import type { MonthlyBoundaryData } from "../planning/domain/month-validation";
import { datesInMonth } from "../planning/domain/month";
import { isIsoDate, weekdayIndex } from "../planning/domain/time";
import type { IsoDate } from "../planning/domain/types";
import {
  isMonthlyPlanDraft,
  type MonthlyPlanDraft,
  type MonthlyPlanningProvider,
} from "../planning/monthly-planning";

const DEFAULT_BASE_URL = "https://api.cloudflare.com/client/v4";
const DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const DEFAULT_TIMEOUT_MS = 120_000;
/** Limit jednoho volání Vercel Hobby je 300 s; rezerva na uložení draftu a odpověď. */
const DEFAULT_TOTAL_TIMEOUT_MS = 270_000;
/**
 * Model má kontextové okno 24 000 tokenů (dokumentace Cloudflare, 2026).
 * Při ~3 znacích na token a rezervě 4 096 tokenů na výstup odpovídá 40 000
 * znaků promptu zhruba 13 000 tokenům, takže se do okna vejde i výstup.
 */
const MAX_PROMPT_CHARS = 40_000;
const MAX_TOKENS_PER_WEEK = 4_096;

type Fetcher = typeof fetch;

export interface CloudflarePlanningProviderOptions {
  readonly accountId?: string;
  readonly apiToken?: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  /** Rozpočet na celý měsíc (všechny týdenní požadavky), ne na jeden požadavek. */
  readonly totalTimeoutMs?: number;
  /** Testovací injekce; v aplikaci se používá globální `fetch`. */
  readonly fetcher?: Fetcher;
}

interface WeekRange {
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
  readonly dates: readonly IsoDate[];
}

const WEEKLY_SCHEMA = {
  type: "object",
  properties: {
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
    assumptions: { type: "array", items: { type: "string" } },
    instructionsOutcome: { type: "string" },
  },
  required: ["assignments", "explanations", "assumptions", "instructionsOutcome"],
} as const;

const SYSTEM_PROMPT = [
  "Jsi plánovač směn call centra. Vracíš pouze strukturovaný JSON podle schématu.",
  "Nevymýšlej zaměstnance ani data, která nejsou ve vstupu.",
  "Neschvaluj rozpis a netvrď, že je ověřený.",
  "Maximalizuj pokrytí požadovaného obsazení: směnu nech nepokrytou jen tehdy, když ji nelze obsadit bez porušení pravidel.",
].join(" ");

/** Rozdělí měsíc na kalendářní týdny začínající pondělím, oříznuté na měsíc. */
export function splitMonthIntoWeeks(month: string): WeekRange[] {
  const dates = datesInMonth(month);
  if (dates.length === 0) return [];
  const weeks: WeekRange[] = [];
  let current: IsoDate[] = [];
  for (const date of dates) {
    if (current.length > 0 && weekdayIndex(date) === 0) {
      weeks.push({ startDate: current[0], endDate: current[current.length - 1], dates: current });
      current = [];
    }
    current.push(date);
  }
  if (current.length > 0) {
    weeks.push({ startDate: current[0], endDate: current[current.length - 1], dates: current });
  }
  return weeks;
}

function inRange(date: string, week: WeekRange): boolean {
  return date >= week.startDate && date <= week.endDate;
}

function buildWeekPayload(
  input: MonthlyPlanningInput,
  boundary: MonthlyBoundaryData,
  week: WeekRange,
  previousAssignments: readonly MonthlyPlanDraft["assignments"][number][],
) {
  const employeeIndexes = new Map(input.employees.map((employee, index) => [employee.id, index]));
  const availabilityByCell = new Map(
    input.availability
      .filter((item) => inRange(item.date, week))
      .map((item) => [`${item.employeeId}|${item.date}|${item.shiftKind}`, item.available] as const),
  );
  const shiftCode = (shiftKind: "morning" | "afternoon") => shiftKind === "morning" ? "M" : "A";
  const compactAssignments = (assignments: readonly MonthlyPlanDraft["assignments"][number][]) =>
    assignments.flatMap((item) => {
      const employeeIndex = employeeIndexes.get(item.employeeId);
      return employeeIndex === undefined ? [] : [[employeeIndex, item.date, shiftCode(item.shiftKind)]];
    });
  const compactBoundaryAssignments = (assignments: MonthlyBoundaryData["before"]["assignments"]) =>
    assignments.flatMap((item) => {
      const employeeIndex = employeeIndexes.get(item.employeeId);
      return employeeIndex === undefined ? [] : [[
        employeeIndex,
        item.date,
        item.shiftKind ? shiftCode(item.shiftKind) : "?",
        item.startTime ?? null,
        item.endTime ?? null,
      ]];
    });
  return {
    month: input.month,
    weekStart: week.startDate,
    weekEnd: week.endDate,
    dates: week.dates,
    employees: input.employees.map((employee) => ({
      id: employee.id,
      displayName: employee.displayName,
      employmentType: employee.employmentType,
    })),
    // Explicit categories prevent true, false, and an omitted record from
    // becoming indistinguishable while keeping the per-week payload compact.
    availabilityLegend: "availability entries are [employeeIndex, dateIndex, shiftKind]; dateIndex points into dates; shiftKind is morning or afternoon; available means known true, unavailable means known false, missing means no source record (unknown, not true)",
    availability: (() => {
      const states = {
        available: [] as [number, number, "morning" | "afternoon"][],
        unavailable: [] as [number, number, "morning" | "afternoon"][],
        missing: [] as [number, number, "morning" | "afternoon"][],
      };
      input.employees.forEach((employee, employeeIndex) => {
        week.dates.forEach((date, dateIndex) => {
          (["morning", "afternoon"] as const).forEach((shiftKind) => {
            const available = availabilityByCell.get(`${employee.id}|${date}|${shiftKind}`);
            const state = available === undefined ? "missing" : available ? "available" : "unavailable";
            states[state].push([employeeIndex, dateIndex, shiftKind]);
          });
        });
      });
      return states;
    })(),
    absenceLegend: "absences are objects {employeeIndex, from, to, type, status}; type and status use their full input values. approved is a confirmed absence and blocks assignments; pending is not approved; rejected is not an absence approval. Do not treat pending or rejected as approved.",
    absences: input.absences
      .filter((absence) => absence.to >= week.startDate && absence.from <= week.endDate)
      .map((absence) => ({
        employeeIndex: employeeIndexes.get(absence.employeeId),
        from: absence.from,
        to: absence.to,
        type: absence.type,
        status: absence.status,
      })),
    staffingRequirements: input.staffingRequirements
      .filter((item) => inRange(item.date, week))
      .map((item) => [item.date, shiftCode(item.shiftKind), item.requiredEmployees]),
    requiredAssignmentsTotal: input.staffingRequirements
      .filter((item) => inRange(item.date, week))
      .reduce((sum, item) => sum + item.requiredEmployees, 0),
    workFunds: (input.workFunds ?? []).map((fund) => [employeeIndexes.get(fund.employeeId), fund.hours, fund.excusedHours]),
    instructions: input.instructions,
    shiftRotationPreference: input.shiftRotationPreference === true,
    boundaryLegend: "boundary assignments rows are [employeeIndex, date, shiftCode, startTime, endTime]; M=morning, A=afternoon, ?=shift kind unknown, null=missing time",
    boundary: {
      before: {
        complete: boundary.before.complete,
        assignments: compactBoundaryAssignments(boundary.before.assignments),
      },
      after: {
        complete: boundary.after.complete,
        assignments: compactBoundaryAssignments(boundary.after.assignments),
      },
    },
    // Preserve the complete preceding history; compact employee IDs to indexes.
    previousAssignments: compactAssignments(previousAssignments.filter((item) => item.date < week.startDate)),
  };
}

function buildPrompt(payload: unknown): string {
  const requiredTotal =
    typeof payload === "object" && payload !== null && typeof (payload as Record<string, unknown>).requiredAssignmentsTotal === "number"
      ? (payload as Record<string, unknown>).requiredAssignmentsTotal
      : null;
  return [
    "# Role",
    "Jsi plánovač směn call centra. Vytváříš návrh, nic neschvaluješ.",
    "",
    "# Ověřená pravidla",
    "- Pouze zaměstnanci na plný úvazek; seznam nesmíš měnit.",
    "- Ranní směna 07:45–16:30, odpolední ve všední den 13:15–21:00, víkendová odpolední 12:45–21:00.",
    "- Po šesti po sobě jdoucích pracovních dnech alespoň 35 hodin nepřetržitého odpočinku.",
    "- Zaměstnanec pracující o víkendu má v témže týdnu (pondělí–neděle) dva dny volna.",
    "- Schválená absence blokuje přiřazení.",
    "- Jeden zaměstnanec nesmí mít v jednom dni ranní i odpolední směnu; směny se časově překrývají.",
    "- Potřebné obsazení je konfigurovatelný vstup, ne historická konstanta.",
    "- Nevymýšlej další pravidla, limity ani zaměstnance.",
    "",
    "# Úkol",
    "Vyplň pouze dny uvedené v `dates`; ostatní dny neměň.",
    "Cílem je pokrýt co nejvíce požadovaného obsazení: pro každý řádek `staffingRequirements` přiřaď požadovaný počet zaměstnanců, pokud to pravidla dovolí. Směnu nech nepokrytou jen s doloženým důvodem.",
    "Nepřiřazuj jednomu zaměstnanci ranní i odpolední směnu ve stejný den.",
    requiredTotal !== null
      ? `V tomto týdnu je požadováno celkem ${requiredTotal} přiřazení (součet requiredEmployees); snaž se dosáhnout tohoto počtu.`
      : "",
    "Dodrž zadané `staffingRequirements`. Když pokrytí nejde, přiznej to v `explanations` a `assumptions`.",
    "Dodrž absence, dostupnost, odpočinek a víkendové volno.",
    "Fond práce je nezávazný cíl; odchylku přiznej v `explanations`.",
    "Pokud je `shiftRotationPreference` true, upřednostni střídání ranních a odpoledních směn; je to přání, nikoli tvrdé pravidlo.",
    "Textové instrukce jsou přání, nikoli další tvrdé pravidlo; popiš, jak jsi je zohlednil, v `instructionsOutcome`.",
    "Použij skutečná jména i ID ze vstupu. Nezkracuj seznam zaměstnanců.",
    "Vrať pouze validní JSON podle schématu z `response_format`.",
    "",
    "Kódování: index zaměstnance je pozice v `employees`, počínaje nulou; ve výstupu použij jeho skutečné ID, nikoli index. `availability` obsahuje oddělené seznamy `available`, `unavailable` a `missing`, jejichž položky [index zaměstnance, index data, směna] odkazují na `employees`, `dates` a plný název směny (`morning`/`afternoon`). Zachovej přesné rozlišení: available=známé true, unavailable=známé false, missing=žádný údaj/unknown; missing nikdy neznamená dostupný. Absence jsou objekty s indexem zaměstnance, `from`, `to`, plným `type` a plným `status` (`approved`, `pending`, `rejected`). Schválené (`approved`) absence jsou potvrzené a blokují přiřazení; pending není schválená absence a rejected není schválená absence. Nezaměňuj statusy. Požadavky jsou [datum, směna (M=ranní, A=odpolední), počet]. Fondy jsou [index zaměstnance, fond v hodinách, omluvené hodiny]. Historie přiřazení jsou [index zaměstnance, datum, směna]. Boundary assignments jsou [index zaměstnance, datum, směna, začátek, konec] (?=neznámý typ směny, null=chybějící čas); `complete` říká, zda jsou podklady hranice úplné.",
    "",
    "# Vstup",
    JSON.stringify(payload),
  ].join("\n");
}

type ChunkResult = {
  readonly assignments: MonthlyPlanDraft["assignments"];
  readonly explanations: MonthlyPlanDraft["explanations"];
  readonly assumptions: readonly string[];
  readonly instructionsOutcome: string;
};

function parseChunk(value: unknown): ChunkResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AiProviderError("invalid_output", "Cloudflare AI nevrátila objekt.");
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.assignments) || !Array.isArray(record.explanations) || !Array.isArray(record.assumptions)) {
    throw new AiProviderError("invalid_output", "Cloudflare AI nevrátila povinná pole.");
  }
  const assignments = record.assignments.flatMap<MonthlyPlanDraft["assignments"][number]>((item) => {
    if (typeof item !== "object" || item === null) return [];
    const assignment = item as Record<string, unknown>;
    if (typeof assignment.employeeId !== "string" || assignment.employeeId.length === 0) return [];
    if (typeof assignment.date !== "string" || !isIsoDate(assignment.date)) return [];
    if (assignment.shiftKind !== "morning" && assignment.shiftKind !== "afternoon") return [];
    return [{ employeeId: assignment.employeeId, date: assignment.date, shiftKind: assignment.shiftKind }];
  });
  const explanations = record.explanations.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const explanation = item as Record<string, unknown>;
    if (typeof explanation.topic !== "string" || typeof explanation.text !== "string") return [];
    return [{
      topic: explanation.topic,
      text: explanation.text,
      ...(Array.isArray(explanation.employeeIds) ? { employeeIds: explanation.employeeIds.filter((id): id is string => typeof id === "string") } : {}),
      ...(Array.isArray(explanation.dates) ? { dates: explanation.dates.filter((date): date is string => typeof date === "string") } : {}),
      ...(Array.isArray(explanation.shiftKinds) ? { shiftKinds: explanation.shiftKinds.filter((kind): kind is "morning" | "afternoon" => kind === "morning" || kind === "afternoon") } : {}),
    }] as MonthlyPlanDraft["explanations"];
  });
  return {
    assignments,
    explanations,
    assumptions: record.assumptions.filter((item): item is string => typeof item === "string"),
    instructionsOutcome: typeof record.instructionsOutcome === "string" ? record.instructionsOutcome : "",
  };
}

export class CloudflarePlanningProvider implements MonthlyPlanningProvider {
  readonly name = "cloudflare";

  private readonly accountId: string | undefined;
  private readonly apiToken: string | undefined;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly totalTimeoutMs: number;
  private readonly fetcher: Fetcher;

  constructor(options: CloudflarePlanningProviderOptions = {}) {
    this.accountId = options.accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID;
    this.apiToken = options.apiToken ?? process.env.CLOUDFLARE_API_TOKEN;
    this.model = options.model ?? process.env.CLOUDFLARE_AI_MODEL ?? DEFAULT_MODEL;
    this.baseUrl = (options.baseUrl ?? process.env.CLOUDFLARE_AI_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    const envTimeout = process.env.CLOUDFLARE_AI_TIMEOUT_MS
      ? Number(process.env.CLOUDFLARE_AI_TIMEOUT_MS)
      : NaN;
    this.timeoutMs =
      options.timeoutMs ??
      (Number.isFinite(envTimeout) && envTimeout > 0 ? envTimeout : DEFAULT_TIMEOUT_MS);
    const envTotalTimeout = process.env.CLOUDFLARE_AI_TOTAL_TIMEOUT_MS
      ? Number(process.env.CLOUDFLARE_AI_TOTAL_TIMEOUT_MS)
      : NaN;
    this.totalTimeoutMs =
      options.totalTimeoutMs ??
      (Number.isFinite(envTotalTimeout) && envTotalTimeout > 0 ? envTotalTimeout : DEFAULT_TOTAL_TIMEOUT_MS);
    this.fetcher = options.fetcher ?? fetch;
  }

  async generateMonthlyPlan(
    input: MonthlyPlanningInput,
    boundary: MonthlyBoundaryData,
    options?: { readonly signal?: AbortSignal },
  ): Promise<MonthlyPlanDraft> {
    if (input.planningRange || input.rosterHistory) {
      throw new AiProviderError("failed", "Cloudflare AI nepodporuje doplňování části měsíce ani historii rosteru.");
    }
    if (!this.accountId || !this.apiToken) {
      throw new AiProviderError(
        "not_configured",
        "CLOUDFLARE_ACCOUNT_ID nebo CLOUDFLARE_API_TOKEN není nastaven; AI plánovač není nakonfigurovaný.",
      );
    }

    const weeks = splitMonthIntoWeeks(input.month);
    if (weeks.length === 0) throw new AiProviderError("failed", "Zvolený měsíc nemá žádné dny.");

    const allAssignments: MonthlyPlanDraft["assignments"][number][] = [];
    const allExplanations: MonthlyPlanDraft["explanations"][number][] = [];
    const allAssumptions = new Set<string>();
    const deadline = Date.now() + this.totalTimeoutMs;
    let outcome = "";

    for (const week of weeks) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        throw new AiProviderError(
          "timeout",
          "Cloudflare AI nedokončila celý měsíc v časovém limitu. Návrh nebyl uložen; zkuste to znovu nebo měsíc vytvořte po částech.",
        );
      }
      const payload = buildWeekPayload(input, boundary, week, allAssignments);
      const prompt = buildPrompt(payload);
      if (prompt.length > MAX_PROMPT_CHARS) {
        throw new AiProviderError(
          "failed",
          "Měsíční vstup je příliš velký pro limit modelu AI. Zmenšete počet zaměstnanců nebo rozsah.",
        );
      }
      const chunk = await this.requestChunk(prompt, options?.signal, Math.min(this.timeoutMs, remaining));
      const dates = new Set(week.dates);
      const employees = new Set(input.employees.map((employee) => employee.id));
      for (const assignment of chunk.assignments) {
        if (!dates.has(assignment.date) || !employees.has(assignment.employeeId)) continue;
        const key = `${assignment.employeeId}|${assignment.date}|${assignment.shiftKind}`;
        if (allAssignments.some((item) => `${item.employeeId}|${item.date}|${item.shiftKind}` === key)) continue;
        allAssignments.push(assignment);
      }
      allExplanations.push(...chunk.explanations);
      for (const assumption of chunk.assumptions) allAssumptions.add(assumption);
      if (chunk.instructionsOutcome.trim()) outcome = chunk.instructionsOutcome.trim();
    }

    const draft: MonthlyPlanDraft = {
      month: input.month,
      assignments: allAssignments,
      explanations: allExplanations,
      alternatives: [],
      assumptions: [...allAssumptions],
      instructionsOutcome: outcome || "AI neposkytla vysvětlení k pokynům.",
    };
    if (!isMonthlyPlanDraft(draft, input.month)) {
      throw new AiProviderError("invalid_output", "Cloudflare AI vrátila neplatný měsíční návrh.");
    }
    return draft;
  }

  private async requestChunk(prompt: string, externalSignal?: AbortSignal, timeoutMs = this.timeoutMs): Promise<ChunkResult> {
    const url = `${this.baseUrl}/accounts/${encodeURIComponent(this.accountId ?? "")}/ai/run/${this.model}`;
    const controller = new AbortController();
    const abortFromExternal = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener("abort", abortFromExternal, { once: true });
    }
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await this.fetcher(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiToken ?? ""}`,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_schema", json_schema: WEEKLY_SCHEMA },
          max_tokens: MAX_TOKENS_PER_WEEK,
          temperature: 0.2,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof Error && error.name === "AbortError") {
        throw new AiProviderError("timeout", "Cloudflare AI nedokončila požadavek v časovém limitu.");
      }
      throw new AiProviderError("failed", "Cloudflare AI se nepodařilo zavolat.");
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", abortFromExternal);
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new AiProviderError(
          "failed",
          "Denní limit využití AI pro plánování směn vypršel. Zkuste to později, nebo přepněte PLANNING_MONTHLY_PROVIDER na „simulated“ (ukázkový režim). Automatické přepnutí neprovádíme.",
        );
      }
      throw new AiProviderError("failed", `Cloudflare AI vrátila HTTP ${response.status}.`);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AiProviderError("invalid_output", "Cloudflare AI nevrátila platný JSON.");
    }
    if (typeof payload !== "object" || payload === null) {
      throw new AiProviderError("invalid_output", "Cloudflare AI nevrátila objekt.");
    }
    const envelope = payload as Record<string, unknown>;
    if (envelope.success === false) {
      const errors = Array.isArray(envelope.errors) ? envelope.errors : [];
      const first = errors.find((item) => typeof item === "object" && item !== null) as Record<string, unknown> | undefined;
      const message = typeof first?.message === "string" ? first.message : "Cloudflare AI požadavek odmítla.";
      throw new AiProviderError("failed", message);
    }
    const result = envelope.result;
    if (typeof result !== "object" || result === null) {
      throw new AiProviderError("invalid_output", "Cloudflare AI nevrátila výsledek.");
    }
    const raw = (result as Record<string, unknown>).response;
    let parsed: unknown = raw;
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new AiProviderError("invalid_output", "Cloudflare AI nevrátila platný JSON návrh.");
      }
    }
    return parseChunk(parsed);
  }
}
