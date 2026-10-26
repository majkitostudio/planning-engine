/**
 * Provider-neutral rozhraní pro AI plánovač.
 *
 * Plánovací jádro nesmí záviset na konkrétním poskytovateli modelu. Tento
 * soubor definuje smlouvu, kterou implementuje každý adaptér (Gemini,
 * testovací náhrada, budoucí poskytovatel). Jádro pracuje pouze s tímto
 * rozhraním a nikdy nevolá síť přímo.
 */

import type { PlanningInput, PlanDraft, IsoDate } from "./domain";
import { isIsoDate } from "./domain/time";

/** Strukturovaná chyba poskytovatele modelu. */
export type AiProviderErrorCode =
  | "not_configured"
  | "failed"
  | "timeout"
  | "invalid_output";

export class AiProviderError extends Error {
  readonly code: AiProviderErrorCode;
  readonly details?: Readonly<Record<string, string | number | boolean>>;

  constructor(
    code: AiProviderErrorCode,
    message: string,
    details?: Readonly<Record<string, string | number | boolean>>,
  ) {
    super(message);
    this.name = "AiProviderError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Poskytovatel modelu.
 *
 * `generatePlan` vrací `PlanDraft` nebo vyhodí `AiProviderError` (případně
 * jinou chybu). Orchestrátor chybu mapuje na `PlanningFailure`.
 */
export interface PlanningModelProvider {
  /** Stabilní název poskytovatele pro logy a výsledek. */
  readonly name: string;
  generatePlan(
    input: PlanningInput,
    options?: { readonly signal?: AbortSignal },
  ): Promise<PlanDraft>;
}

/**
 * Možnosti pro běh plánování. Všechny pole jsou volitelná;
 * slouží hlavně pro testování a ladění.
 */
export interface RunPlanningOptions {
  /** Timeout pro volání AI (v ms). Výchozí: 30 000. */
  readonly timeoutMs?: number;
  /** Funkce vracející aktuální čas jako epoch milisekundy (pro testování). */
  readonly now?: () => number;
}

/**
 * Ověří, že hodnota má tvar `PlanDraft`. Slouží jako obrana proti neplatné
 * odpovědi modelu i v případě, že adaptér tvrdí, že je vše v pořádku.
 *
 * Tato funkce provádí čistou kontrolu struktury bez závislosti na konkrétním
 * PlanningInput, jak je vyžadováno pro dvoustupňovou validaci.
 */
export function isPlanDraft(value: unknown): value is PlanDraft {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;

  // Validate basic structure
  if (typeof record.weekStart !== "string" || !isIsoDate(record.weekStart)) return false;
  if (!Array.isArray(record.assignments)) return false;
  if (!Array.isArray(record.explanations)) return false;
  if (!Array.isArray(record.alternatives)) return false;
  if (!Array.isArray(record.assumptions)) return false;

  // Validate assignments - each must have valid structure
  for (const assignment of record.assignments) {
    if (typeof assignment !== "object" || assignment === null) return false;
    const a = assignment as Record<string, unknown>;
    if (typeof a.employeeId !== "string" || a.employeeId.length === 0) return false;
    if (typeof a.date !== "string" || !isIsoDate(a.date)) return false;
    if (typeof a.shiftKind !== "string") return false;
  }

  // Validate explanations - each must have valid structure
  for (const explanation of record.explanations) {
    if (typeof explanation !== "object" || explanation === null) return false;
    const e = explanation as Record<string, unknown>;
    if (typeof e.topic !== "string") return false;
    if (typeof e.text !== "string") return false;
    
    // Validate explanation topic is one of the allowed values
    const validTopics = [
      "assignment", "coverage", "rest", "weekend", "preference", "other"
    ];
    if (!validTopics.includes(e.topic)) return false;
  }

  // Validate alternatives - each must have valid structure
  for (const alternative of record.alternatives) {
    if (typeof alternative !== "object" || alternative === null) return false;
    const alt = alternative as Record<string, unknown>;
    if (typeof alt.id !== "string") return false;
    if (typeof alt.summary !== "string") return false;
    if (typeof alt.impact !== "string") return false;
    if (!Array.isArray(alt.assignments)) return false;
    
    // Validate each assignment in alternative
    for (const assignment of alt.assignments) {
      if (typeof assignment !== "object" || assignment === null) return false;
      const a = assignment as Record<string, unknown>;
      if (typeof a.employeeId !== "string" || a.employeeId.length === 0) return false;
      if (typeof a.date !== "string" || !isIsoDate(a.date)) return false;
      if (typeof a.shiftKind !== "string") return false;
    }
  }

  // Validate assumptions - each must be a string
  for (const assumption of record.assumptions) {
    if (typeof assumption !== "string") return false;
  }

  return true;
}
