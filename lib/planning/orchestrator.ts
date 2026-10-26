/**
 * Orchestrátor plánovacího běhu.
 *
 * Spojuje vstup, AI poskytovatele, deterministickou validaci a výpočet změn
 * a pokrytí. Neukládá nic a nepotvrzuje návrh. Výsledek je buď
 * `PlanningRunResult` (návrh k posouzení) nebo `PlanningFailure` (přiznané
 * selhání).
 */

import { validatePlan } from "./domain";
import type {
  AssignmentChange,
  CoverageLine,
  ExistingAssignment,
  PlanDraft,
  PlanningFailure,
  PlanningFailureCode,
  PlanningInput,
  PlanningOutcome,
  PlanningRunResult,
  PlanningRunStatus,
  ProposedAssignment,
} from "./domain";
import type { PlanProposal as GenericPlanProposal } from "./types";
import { isPlanDraft } from "./ai-provider";
import type {
  PlanningModelProvider,
  AiProviderErrorCode,
  RunPlanningOptions,
} from "./ai-provider";
import { isIsoDate, weekdayIndex } from "./domain/time";

const DEFAULT_TIMEOUT_MS = 30_000;

function validatePlanningInputDeep(input: PlanningInput): { readonly valid: boolean; readonly message?: string } {
  // Validate weekStart has valid ISO date format and falls on Monday
  if (!isIsoDate(input.weekStart)) {
    return { valid: false, message: `Neplatný formát týdne "${input.weekStart}"; musí to být YYYY-MM-DD.` };
  }
  if (weekdayIndex(input.weekStart) !== 0) {
    return { valid: false, message: `Začátek týdne "${input.weekStart}" musí být pondělí.` };
  }

  // Validate timeZone is valid
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: input.timeZone });
  } catch {
    return { valid: false, message: `Neplatná časová zóna "${input.timeZone}".` };
  }

  // Validate employees have required fields and correct employmentType
  for (const employee of input.employees) {
    if (!employee || typeof employee.id !== "string" || employee.id.length === 0) {
      return { valid: false, message: `Zaměstnanec má neplatný nebo chybějící identifikátor.` };
    }
    if (employee.employmentType !== "full_time") {
      return { valid: false, message: `Zaměstnanec "${employee.id}" nemá podporovaný plný úvazek.` };
    }
  }

  // Validate shiftDefinitions have correct structure
  if (!Array.isArray(input.shiftDefinitions) || input.shiftDefinitions.length !== 2) {
    return { valid: false, message: `Přinesena ${input.shiftDefinitions.length} definice směny; potřeba jsou přesně dvě (morning, afternoon).` };
  }
  const shiftKinds = input.shiftDefinitions.map(d => d.kind);
  if (!shiftKinds.includes("morning") || !shiftKinds.includes("afternoon")) {
    return { valid: false, message: `Chybí definice směny (morning, afternoon).` };
  }

  // Validate staffingRequirements have expected structure and mandatory fields
  if (!Array.isArray(input.staffingRequirements) || input.staffingRequirements.length === 0) {
    return { valid: false, message: `Chybí požadavky na obsazení.` };
  }
  for (const req of input.staffingRequirements) {
    if (!isIsoDate(req.date) || !["morning", "afternoon"].includes(req.shiftKind)) {
      return { valid: false, message: `Požadavek na obsazení "${req.date}|${req.shiftKind}" má neplatné datum nebo směnu.` };
    }
    if (typeof req.requiredEmployees !== "number" || !Number.isInteger(req.requiredEmployees) || req.requiredEmployees < 0) {
      return { valid: false, message: `Požadavek na obsazení "${req.date}|${req.shiftKind}" má neplatný počet zaměstnanců.` };
    }
  }

  // Detect duplicate staffing requirements (same date + shiftKind)
  const reqKeys = new Set<string>();
  for (const req of input.staffingRequirements) {
    const key = `${req.date}|${req.shiftKind}`;
    if (reqKeys.has(key)) {
      return { valid: false, message: `Duplicitní požadavek na obsazení "${key}".` };
    }
    reqKeys.add(key);
  }

  // Validate absences have expected structure
  if (!Array.isArray(input.absences)) {
    return { valid: false, message: `Absence nemají správný tvar.` };
  }
  for (const absence of input.absences) {
    if (!absence || typeof absence.id !== "string" || typeof absence.employeeId !== "string" || 
        !isIsoDate(absence.from) || !isIsoDate(absence.to) ||
        !["vacation", "sick", "other"].includes(absence.type) ||
        !["approved", "pending", "rejected"].includes(absence.status)) {
      return { valid: false, message: `Absence "${absence.id}" má neplatnou strukturu.` };
    }
  }

  // Validate absence references to existing employees
  const employeeIds = new Set(input.employees.map(e => e.id));
  for (const absence of input.absences) {
    if (!employeeIds.has(absence.employeeId)) {
      return { valid: false, message: `Absence "${absence.id}" odkazuje na neexistujícího zaměstnance "${absence.employeeId}".` };
    }
  }

  // Validate requests have expected structure
  if (!Array.isArray(input.requests)) {
    return { valid: false, message: `Požadavky na zaměstnance nemají správný tvar.` };
  }
  for (const request of input.requests) {
    if (!request || typeof request.id !== "string" || typeof request.employeeId !== "string" ||
        !isIsoDate(request.date) || !["day_off", "shift_preference"].includes(request.kind)) {
      return { valid: false, message: `Požadavek "${request.id}" má neplatnou strukturu.` };
    }
    if (request.kind === "shift_preference" && !["morning", "afternoon"].includes(request.shiftKind)) {
      return { valid: false, message: `Preference směny "${request.id}" má neplatnou shiftKind.` };
    }
  }

  // Validate existingAssignments have expected structure
  if (!Array.isArray(input.existingAssignments)) {
    return { valid: false, message: `Existující přiřazení nemají správný tvar.` };
  }
  for (const assignment of input.existingAssignments) {
    if (!assignment || typeof assignment.employeeId !== "string" || !isIsoDate(assignment.date) ||
        !["morning", "afternoon"].includes(assignment.shiftKind)) {
      return { valid: false, message: `Existující přiřazení má neplatnou strukturu.` };
    }
  }

  // Validate rules have expected structure
  if (!input.rules || typeof input.rules.consecutiveWorkingDaysBeforeLongRest !== "number" ||
      typeof input.rules.longRestHours !== "number" || typeof input.rules.weekendWorkDaysOff !== "number") {
    return { valid: false, message: `Pravidla mají neplatnou strukturu.` };
  }

  // Validate history has expected structure if present
  if (input.history !== undefined) {
    if (!input.history || !Array.isArray(input.history.assignments) || typeof input.history.complete !== "boolean") {
      return { valid: false, message: `Historie má neplatnou strukturu.` };
    }
    for (const assignment of input.history.assignments) {
      if (!assignment || typeof assignment.employeeId !== "string" || !isIsoDate(assignment.date) ||
          !["morning", "afternoon"].includes(assignment.shiftKind)) {
        return { valid: false, message: `Historie obsahuje neplatné přiřazení.` };
      }
    }
  }

  return { valid: true };
}

function isPlanningInput(value: unknown): value is PlanningInput {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.weekStart !== "string") return false;
  if (typeof v.timeZone !== "string") return false;
  if (!Array.isArray(v.employees)) return false;
  if (!Array.isArray(v.shiftDefinitions)) return false;
  if (!Array.isArray(v.staffingRequirements)) return false;
  if (!Array.isArray(v.absences)) return false;
  if (!Array.isArray(v.requests)) return false;
  if (!Array.isArray(v.existingAssignments)) return false;
  if (typeof v.rules !== "object" || v.rules === null) return false;
  return true;
}

function assignmentKey(assignment: ProposedAssignment | ExistingAssignment): string {
  return `${assignment.employeeId}|${assignment.date}|${assignment.shiftKind}`;
}

function computeChanges(
  input: PlanningInput,
  draft: PlanDraft,
): readonly AssignmentChange[] {
  const existingKeys = new Set(input.existingAssignments.map(assignmentKey));
  const proposedKeys = new Set(draft.assignments.map(assignmentKey));

  const changes: AssignmentChange[] = [];
  const seen = new Set<string>();
  for (const assignment of draft.assignments) {
    const key = assignmentKey(assignment);
    if (seen.has(key)) continue; // deduplicate
    seen.add(key);
    changes.push({
      type: existingKeys.has(key) ? "unchanged" : "added",
      assignment,
    });
  }
  for (const assignment of input.existingAssignments) {
    if (!proposedKeys.has(assignmentKey(assignment))) {
      changes.push({ type: "removed", assignment });
    }
  }
  return changes;
}

function computeCoverage(
  input: PlanningInput,
  draft: PlanDraft,
): readonly CoverageLine[] {
  const bySlot = new Map<string, number>();
  const assignmentSeen = new Set<string>();
  for (const assignment of draft.assignments) {
    const key = assignmentKey(assignment);
    if (assignmentSeen.has(key)) continue; // deduplicate
    assignmentSeen.add(key);
    const slotKey = `${assignment.date}|${assignment.shiftKind}`;
    bySlot.set(slotKey, (bySlot.get(slotKey) ?? 0) + 1);
  }

  const seen = new Set<string>();
  const lines: CoverageLine[] = [];
  for (const requirement of input.staffingRequirements) {
    const key = `${requirement.date}|${requirement.shiftKind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const assigned = bySlot.get(key) ?? 0;
    lines.push({
      date: requirement.date,
      shiftKind: requirement.shiftKind,
      requiredEmployees: requirement.requiredEmployees,
      assignedEmployees: assigned,
      missingEmployees: Math.max(0, requirement.requiredEmployees - assigned),
    });
  }
  return lines;
}

function failure(
  code: PlanningFailureCode,
  message: string,
  details?: Readonly<Record<string, string | number | boolean>>,
): PlanningFailure {
  return details ? { code, message, details } : { code, message };
}

function newProposalId(now: () => number): string {
  const random =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${now()}-${Math.random().toString(36).slice(2)}`;
  return `plan-${random}`;
}

export async function runPlanning(
  input: PlanningInput,
  provider: PlanningModelProvider,
  options: RunPlanningOptions = {},
): Promise<PlanningOutcome> {
  if (!isPlanningInput(input)) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "Vstup plánování nemá požadovaný tvar; běh nelze spustit.",
      ),
    };
  }

  // Perform deep validation of PlanningInput before calling AI
  const inputValidation = validatePlanningInputDeep(input);
  if (!inputValidation.valid) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        `Neplatný vstup plánování: ${inputValidation.message}`, 
      ),
    };
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const now = options.now ?? (() => Date.now());

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let draft: PlanDraft;
  try {
    draft = await provider.generatePlan(input, { signal: controller.signal });
  } catch (error) {
    clearTimeout(timer);
    const details: Readonly<Record<string, string | number | boolean>> = {
      message: error instanceof Error ? error.message : String(error),
    };

    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        failure: failure("ai_failed", "Vypršel časový limit při volání AI.", {
          timeoutMs,
          timedOut: true,
        }),
      };
    }

    // AiProviderError má code; mapujeme ho.
    const code =
      typeof (error as { code?: unknown })?.code === "string"
        ? ((error as { code: string }).code as AiProviderErrorCode)
        : null;

    if (code === "not_configured") {
      return {
        ok: false,
        failure: failure("ai_not_configured", "AI poskytovatel není nakonfigurovaný.", details),
      };
    }
    if (code === "invalid_output" || code === "timeout") {
      const failureCode: PlanningFailureCode =
        code === "timeout" ? "ai_failed" : "ai_invalid_output";
      const message =
        code === "timeout"
          ? "Vypršel časový limit při volání AI."
          : "AI vrátila neplatný nebo neúplný návrh.";
      return {
        ok: false,
        failure:
          code === "timeout"
            ? failure(failureCode, message, { timeoutMs, timedOut: true })
            : failure(failureCode, message, details),
      };
    }

    return {
      ok: false,
      failure: failure("ai_failed", "Volání AI selhalo.", details),
    };
  } finally {
    clearTimeout(timer);
  }

  if (!isPlanDraft(draft)) {
    return {
      ok: false,
      failure: failure(
        "ai_invalid_output",
        "AI vrátila odpověď, která neodpovídá kontraktu PlanDraft.",
      ),
    };
  }

  // B. Sémantická kontrola v orchestrátoru - ověř návrh vůči konkrétnímu PlanningInput
  if (draft.weekStart !== input.weekStart) {
    return {
      ok: false,
      failure: failure(
        "ai_invalid_output",
        `AI vrátila návrh pro nesprávný týden (weekStart: "${draft.weekStart}", očekáváno: "${input.weekStart}").`,
      ),
    };
  }

  // Semantická validace přiřazení a alternativ probíhá v deterministické validaci (validatePlan)
  // Orchestrátor zde již nevrací ok: false pro jednotlivé chyby přiřazení;

  const proposal: GenericPlanProposal<PlanDraft> = {
    id: newProposalId(now),
    source: { kind: "ai", note: provider.name },
    plan: draft,
  };

  let validation;
  try {
    validation = validatePlan(input, proposal);
  } catch (error) {
    return {
      ok: false,
      failure: failure(
        "validation_failed",
        "Deterministická validace selhala neočekávaně.",
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { message: String(error) },
      ),
    };
  }

  const changes = computeChanges(input, draft);
  const coverage = computeCoverage(input, draft);

  const hasMissingCoverage = coverage.some((line) => line.missingEmployees > 0);
  const status: PlanningRunStatus =
    validation.status === "not_verified"
      ? "not_verified"
      : validation.status === "invalid" || hasMissingCoverage
        ? "needs_changes"
        : "ready_for_review";

  const completeness: PlanningRunResult["completeness"] =
    validation.status === "not_verified" || hasMissingCoverage ? "partial" : "complete";

  const result: PlanningRunResult = {
    weekStart: input.weekStart,
    proposal,
    changes,
    coverage,
    validation,
    completeness,
    status,
    confirmed: false,
  };

  return { ok: true, result };
}
