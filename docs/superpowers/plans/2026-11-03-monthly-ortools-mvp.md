# Monthly OR-Tools MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a manager generate one draft for a whole calendar month, understand infeasibility or missing evidence, make weekly-view edits, and recheck the full month without applying changes until explicit confirmation.

**Architecture:** A local Python/OR-Tools provider creates assignments from explicit monthly inputs. The existing TypeScript validation independently checks every generated or edited draft; the monthly UI and persistence keep solver, validation, review, and confirmation states distinct. The weekly table remains a view into the month.

**Tech Stack:** Next.js App Router, TypeScript, Prisma/PostgreSQL, Python 3.14, pinned OR-Tools, Vitest, Python `unittest`.

**Spec:** [`docs/superpowers/specs/2026-10-30-mesicni-mvp-design.md`](../specs/2026-10-30-mesicni-mvp-design.md), updated by the later monthly-planning decisions in [`docs/DOMAIN_DECISIONS.md`](../../DOMAIN_DECISIONS.md) and the current project rules in [`AGENTS.md`](../../../AGENTS.md).

## Current Worktree Status

Tasks 1–4 are implemented and reverified in the current worktree. The synthetic UI/DB flow passed with 29 records; the 382 TypeScript tests, 10 Python tests, lint, typecheck, build, and Prisma validation passed. Task 5's documentation and acceptance checks are complete; final diff review and commit remain. No task authorizes confirming a schedule or using real employee data.

## Global Constraints

- The planning unit is one whole calendar month; the weekly table is a view into that plan.
- Use only approved, implemented hard rules. Unknown history or ambiguous interpretations remain `NOT VERIFIED`.
- Do not invent absences, availability, staffing rules, or employee data.
- Weekday staffing of 15 morning / 7 afternoon and weekend staffing of 7 / 3 are synthetic test inputs only; weekend counts are not an approved operating rule.
- Do not send real employee names, IDs, or unreviewed free text to an external AI provider.
- A solver result is a draft, not validation, approval, or a confirmed schedule.
- Do not silently switch providers after solver errors, timeouts, or unavailable dependencies.
- Preserve all unrelated and previously existing work in the worktree.

## Review Focus

- A proven infeasible model must be distinguished from timeout, missing history, malformed input, and unavailable solver; test each outcome.
- Availability defaults and explicit exceptions must remain distinct; test default availability, explicit unavailability, approved absence, and malformed values.
- Month-boundary history and the interpretation of two weekend rest days may be unknown; test that these findings stay unverified and block confirmation when required.
- Solver success must not bypass independent validation; test an incomplete or otherwise invalid candidate and ensure it cannot be confirmed.
- Persistence, reload, and manual edits must retain provider identity and unconfirmed state; exercise the complete lifecycle with synthetic data.

---

### Task 1: Lock down the monthly solver contract

**Files:**
- Review/modify: `AGENTS.md`, `docs/DOMAIN_DECISIONS.md`, `docs/DOMAIN_SPECIFICATION.md`, `docs/PLANNING_CONTRACT.md`
- Review: `lib/planning/monthly-form.ts`, `lib/planning/monthly-planning.ts`
- Test: `lib/planning/monthly-form.test.ts`, `lib/planning/monthly-planning.test.ts`

**Interfaces:**
- Consumes: approved monthly inputs and existing deterministic monthly validator.
- Produces: a documented local-solver contract that keeps unknown evidence separate from solver feasibility and does not redefine workforce rules.

- [x] Compare each current rule against the approved decision record; correct only contradictions relevant to the monthly solver.
- [x] Verify tests cover default availability, explicit unavailable shifts, approved absences, exact 35-hour rest boundary, cross-month evidence, and unknown input.
- [x] Run `npm run test -- lib/planning/monthly-form.test.ts lib/planning/monthly-planning.test.ts` and confirm all targeted tests pass as part of the full suite.

### Task 2: Implement and validate the local constraint solver

**Files:**
- Create/modify: `scripts/monthly_solver.py`, `scripts/requirements-monthly-solver.txt`
- Test: `scripts/monthly_solver_test.py`
- Modify: `.env.example`, `.gitignore`

**Interfaces:**
- Consumes: JSON monthly input with employee tokens, dates, required staffing, availability, absences, and any known boundary assignments.
- Produces: JSON status (`feasible`, `infeasible`, `unknown`, `invalid_input`, `unavailable`, or `error`) and tokenized assignments; never logs employee input.

- [x] Test the JSON contract and malformed inputs, including non-boolean availability and incomplete boundary data.
- [x] Model fixed shift times, one shift per employee per day, approved absences, explicit unavailability, the 35-hour rest rule, and only the established weekend-rest interpretation.
- [x] Cap solver time and resources; return `feasible` when a valid candidate is found, `infeasible` only when the modeled constraints prove no solution exists, and `unknown` when neither conclusion is established within the limit. Optimality is not required for a valid draft.
- [x] Run `python -m unittest discover -s scripts -p monthly_solver_test.py` in the pinned Python environment and confirm all tests pass.
- [x] Include a synthetic November 2026 case with 29 workers and test staffing 15/7 on weekdays and 7/3 on weekends; assert solver output is structurally valid, without treating those counts as operational policy.

### Task 3: Connect the solver to the monthly application

**Files:**
- Create/modify: `lib/planning/monthly-ortools-provider.ts`, `lib/planning/monthly-ortools-provider.test.ts`
- Modify: `lib/planning/monthly-runtime.ts`, `lib/planning/runtime-types.ts`, `lib/planning/monthly-planning.ts`, `lib/planning/monthly-store.ts`, `lib/planning/monthly-prisma-store.ts`
- Modify: `app/api/planning/monthly/run/route.ts`, `app/(app)/planovani/page.tsx`
- Test: `lib/planning/monthly-runtime.test.ts`, `lib/planning/monthly-prisma-store.test.ts`, `tests/monthly-planning-routes.test.ts`

**Interfaces:**
- Consumes: the solver JSON contract from Task 2.
- Produces: an explicit monthly provider mode, typed outcomes, and a persisted unconfirmed draft that can be independently validated by the existing application rules.

- [x] Test provider selection and ensure the monthly provider override does not alter the separately configured weekly provider.
- [x] Test tokenization of employee IDs and confirm names and free-text instructions are absent from the subprocess input and logs.
- [x] Test each solver outcome and ensure unavailable, invalid, timeout, and infeasible results do not silently fall back to Gemini or simulation.
- [x] Test that only a feasible structurally valid candidate reaches monthly validation and persistence, and that old Gemini/simulation records remain readable.
- [x] Run the targeted TypeScript tests above and confirm all pass as part of the full suite.

### Task 4: Present, edit, recheck, and recover the monthly draft

**Files:**
- Modify: `components/plan/monthly-planning-panel.tsx`, `components/plan/plan-workspace.tsx`
- Create/modify: `lib/planning/monthly-edit.ts`, `lib/planning/monthly-edit.test.ts`, `lib/planning/monthly-recovery.ts`, `lib/planning/monthly-recovery.test.ts`
- Create/modify: `app/api/planning/monthly/draft/route.ts`, `app/api/planning/monthly/recheck/route.ts`
- Test: `tests/monthly-planning-routes.test.ts`

**Interfaces:**
- Consumes: a persisted monthly draft and the existing deterministic full-month validator.
- Produces: a selectable week view, local shift edits, a new checked draft version, and same-browser recovery of the latest checked unconfirmed version.

- [x] Test adding/removing shifts in the selected week while retaining assignments outside that week.
- [x] Test recheck validates the entire month and preserves boundary findings, solver mode, and the unconfirmed status.
- [x] Test recovery rejects the wrong month and confirmed versions; recovery must not overwrite a form the manager has already started editing.
- [x] Keep validation errors separate from missing or unverified evidence and disable confirmation for any incomplete or unverified draft.
- [x] Run the targeted edit, recovery, and route tests and confirm all pass as part of the full suite.

### Task 5: Complete isolated acceptance, documentation, and review

**Files:**
- Update one authoritative status document: `docs/ROADMAP.md`
- Review: `README.md`, `docs/DOMAIN_DECISIONS.md`, `docs/DOMAIN_SPECIFICATION.md`, `docs/PLANNING_CONTRACT.md`, `AGENTS.md`
- Review all changed application, solver, and test files from Tasks 1–4.

**Interfaces:**
- Consumes: integrated local monthly solver and current worktree state.
- Produces: verified synthetic end-to-end evidence, accurate readiness wording, and a reviewed diff. A commit is a separate final action after checks and scope review.

- [x] Use only a fresh isolated local database and synthetic employee rows; verify target, month, and synthetic scope before writes.
- [x] In the UI, create a monthly proposal, inspect validation and unverified findings, edit one week's shift, recheck the whole month, reload the draft, and confirm that confirmation remains unavailable unless all required evidence permits it.
- [x] Exercise a clearly infeasible staffing case and distinguish a proven infeasibility from timeout or missing data.
- [x] Verify the test run did not send employee data to an external AI provider and did not confirm a schedule.
- [x] Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, Prisma schema validation, and the Python solver tests; report skipped checks accurately.
- [x] Update `docs/ROADMAP.md` to say exactly what is implemented and verified, and leave AI quality and production readiness marked unverified.
- [ ] Inspect `git status`, `git diff --check`, and the complete diff; preserve unrelated files and do not commit generated Python cache files or local environments.
- [ ] Commit only after review confirms a coherent, verified scope and the target branch has been established safely.

## Completion Boundary

The MVP is ready for manager review only when the monthly draft is independently validated, any missing evidence is visible, and confirmation is guarded by the existing rules. A synthetic local acceptance run does not establish AI quality, labor-law compliance, or production readiness.
