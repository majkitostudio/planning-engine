# AI Intent Translator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a standalone provider-neutral contract for translating a manager's synthetic planning text into the one approved S6 preference, with a Gemini adapter that cannot produce schedules or new rules.

**Architecture:** Keep translation separate from `GeminiPlanningProvider` and from `MonthlyPlanningProvider`. A small contract in `lib/planning/` accepts text and the manager actor type and returns a versioned closed result: recognized S6 enabled/disabled, ambiguous, or unsupported. `lib/ai/` implements that contract with Gemini structured JSON output and validates it locally. This first step has no route or UI integration, no real network calls, and no runtime enablement; API behavior is exercised only with synthetic text and mocked `fetch`.

**Tech Stack:** Existing TypeScript, Vitest, `AiProviderError`, and Google Gemini `generateContent` endpoint. No dependency or database change.

**Spec:** `docs/superpowers/specs/2026-11-04-ai-intent-translator-design.md`; continuation of Etapa E in `docs/superpowers/plans/2026-11-03-navaznost-a-ai-plan.md`.

## Global Constraints

- Only the approved manager preference S6 is supported; no employee request types, extra preferences, or new rules.
- Translation output is closed, versioned, and locally validated; free-form model output never reaches OR-Tools.
- No roster, names, IDs, absences, availability, or real employee data enters the translator or tests.
- Tests use synthetic text and mocked `fetch`; do not call Gemini over the network.
- Do not add API routes, UI, persistence, dependencies, migrations, or runtime feature activation in this step.
- Existing manual S6 selection and monthly OR-Tools behavior remain unchanged.

## Review Focus

- An unknown schema version or extra/invalid intent fields must be rejected by local validation.
- Ambiguous and unsupported requests must never become an S6 toggle.
- A malformed Gemini payload must fail as `invalid_output`; provider errors must remain distinguishable.
- Request payloads must contain only synthetic request text and actor type, with no monthly planning context.
- Missing API configuration must fail without making a network call.

## File Map

- Create `lib/planning/intent-translator.ts` for actor type, closed result union, provider-neutral interface, and runtime validator.
- Create `lib/planning/intent-translator.test.ts` for contract and validator tests.
- Create `lib/ai/gemini-intent-translator.ts` for the Gemini adapter, closed response schema, configuration, request, and response validation.
- Create `lib/ai/gemini-intent-translator.test.ts` for synthetic tests with mocked `fetch`.

## Tasks

### Task 1: Define and validate the provider-neutral translation contract

**Files:**
- Create: `lib/planning/intent-translator.ts`
- Test: `lib/planning/intent-translator.test.ts`

**Interfaces:**
- `PlanningIntentActor = "manager"`.
- `PlanningIntentTranslation` is a version-1 discriminated union: `{ version: 1; status: "recognized"; intent: "shift_rotation_preference"; enabled: boolean }`, `{ version: 1; status: "ambiguous" }`, or `{ version: 1; status: "unsupported" }`.
- `PlanningIntentTranslator.translate(text: string, actor: PlanningIntentActor): Promise<PlanningIntentTranslation>`.
- `isPlanningIntentTranslation(value: unknown): value is PlanningIntentTranslation` checks exact allowed keys and types; it rejects extra fields, unsupported versions, and malformed variants.

- [x] **Step 1: Write tests** for all three valid result variants and for extra keys, missing fields, invalid `enabled`, invalid status, and unknown version.
- [x] **Step 2: Run** `npm test -- --run lib/planning/intent-translator.test.ts`; confirmed it failed because the contract did not exist.
- [x] **Step 3: Implement** the closed union, provider interface, and strict runtime validator in `lib/planning/intent-translator.ts`.
- [x] **Step 4: Run** `npm test -- --run lib/planning/intent-translator.test.ts`; all 13 contract tests passed.

### Task 2: Implement the isolated Gemini intent adapter

**Files:**
- Create: `lib/ai/gemini-intent-translator.ts`
- Test: `lib/ai/gemini-intent-translator.test.ts`
- Uses: Task 1's `PlanningIntentTranslator`, `PlanningIntentTranslation`, and `isPlanningIntentTranslation`.

**Interfaces:**
- `GeminiIntentTranslatorOptions` supports optional `apiKey`, `model`, `baseUrl`, and `timeoutMs`, following `GeminiPlanningProvider` conventions.
- `GeminiIntentTranslator implements PlanningIntentTranslator`.
- The JSON response schema contains only `version`, `status`, `intent`, and `enabled`, with provider schema branches constrained to the three Task 1 variants.

- [x] **Step 1: Write mocked-fetch tests** for enabled S6, disabled S6, ambiguous, unsupported, actor/text-only request payload, invalid output, HTTP error, timeout, and missing API key.
- [x] **Step 2: Run** `npm test -- --run lib/ai/gemini-intent-translator.test.ts`; confirmed it failed because the adapter did not exist.
- [x] **Step 3: Implement** the server-side adapter with a strict JSON response schema, local contract validation, `AiProviderError` classification, and no logging or schedule-generation behavior.
- [x] **Step 4: Run** both focused test files; 23 tests passed. All `fetch` calls were mocked; no Gemini request was sent.
- [x] **Step 5: Run** `npm run lint` and `npm run typecheck`; both passed after removing one unused test import.
- [x] **Step 6: Review** the final diff and verify no route, UI, persistence, configuration, dependency, migration, or generated files were added.

## Verification Record

- `npm test`: 69 files passed, 3 skipped; 474 tests passed, 6 skipped.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Gemini calls: none; adapter tests stubbed `fetch` and used synthetic text.
- Database validation and migration were not applicable; no schema or persistence changed.
- Final review: author self-review against this plan and the approved design; no Critical or Important findings. No reviewer agent was created, per the user's instruction not to create agents.

## Handoff Boundary

This milestone establishes an isolated translator contract and Gemini adapter only. It does not make translation available in the application. A later stage must resolve data handling and retention, then add manager review and approval before any translated value reaches monthly OR-Tools. Runtime calls with non-synthetic text remain unapproved.
