# Database-Managed Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PostgreSQL-backed manager/viewer accounts with one-time manager bootstrap, manager account administration, and mandatory change of temporary passwords.

**Architecture:** Reuse `AppUser`, Auth.js Credentials, the existing manager/viewer role checks, Prisma, and `AuditEvent`. Add account-specific auth services and routes; refresh the current account from PostgreSQL when resolving each session so a disabled account or changed role takes effect immediately. Preserve existing `AppUser` IDs and relations when bootstrap adopts a matching email.

**Tech Stack:** Next.js 16 App Router, Auth.js 5 Credentials, TypeScript, Prisma 7, PostgreSQL, Node.js `crypto.scrypt`, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-30-database-managed-accounts-design.md`

## Global Constraints

- Manager can create accounts with email, name, and role `manager` or `viewer`, change role, deactivate, and set a temporary password.
- New or reset accounts must change their temporary password at next login.
- First manager is created by a one-time bootstrap command from secret configuration; bootstrap does not run at application startup.
- If `AppUser` contains the same normalized email, bootstrap adopts that row and preserves its ID and historical relations; it fails if the row already has a password or the match is ambiguous.
- Passwords are stored only as a one-way hash. Accounts are deactivated rather than deleted.
- A deactivated account cannot continue an existing session. The last active manager cannot be deactivated or demoted.
- There is no email service; the manager conveys a temporary password separately.
- No self-registration, email password recovery, CRM integration, or claim that this makes the full application production-ready.

## Review Focus

- Email case or whitespace differences cannot create duplicate accounts; test normalized matching and duplicate rejection in Tasks 1 and 2.
- Existing `AppUser` records and audit/planning relations survive the migration and bootstrap; test adoption and no-match bootstrap in Task 1.
- A disabled account or changed role loses access without waiting for its current JWT to expire; test session refresh and protected route access in Task 2.
- A temporary-password account cannot use planning APIs before changing its password; test direct API access and successful change in Task 3.
- Concurrent role/deactivation requests cannot leave zero active managers; test the last-manager invariant in Task 4.

---

## File Structure

- `prisma/schema.prisma`, `prisma/migrations/<timestamp>_database_managed_accounts/migration.sql`: password hash and forced-change state; optional external subject; lower-case email normalization and uniqueness preflight.
- `lib/auth/password.ts`: async scrypt hash/verify helpers and encoded hash format.
- `lib/auth/account-service.ts`: bootstrap, list, create, update, deactivate, reset, and self-service password-change operations; accepts a Prisma client for deterministic tests.
- `lib/auth/account-service.test.ts`, `lib/auth/password.test.ts`: hashing and account lifecycle tests.
- `scripts/bootstrap-manager.ts`, `package.json`: one-shot bootstrap command with validated env inputs, run by `tsx`; never invoked by app startup.
- `lib/auth/local.ts`, `auth.ts`, `lib/auth/route-access.ts`, `lib/auth/actor.ts`, `app/prihlaseni/page.tsx`: database auth mode, credentials verification, current account/role refresh, and forced-change gating while preserving local test/development mode.
- `lib/auth/*test.ts`, `tests/planning-authenticated-flow.test.ts`: auth mode, actor mapping, session invalidation, local mode compatibility.
- `app/api/accounts/route.ts`, `app/api/accounts/[id]/route.ts`, `app/api/accounts/[id]/reset-password/route.ts`: manager-only account listing/create/update/deactivate/reset APIs.
- `app/api/auth/change-password/route.ts`: authenticated account password change.
- `tests/account-routes.test.ts`: manager/viewer/anonymous API access and validation.
- `app/(app)/uzivatele/page.tsx`, `components/accounts/account-management.tsx`: manager account list and forms; show generated temporary credentials once only.
- `app/(app)/zmena-hesla/page.tsx`, `components/accounts/change-password-form.tsx`: forced and voluntary password change.
- `components/app-shell.tsx`: manager-only account navigation item.
- `docs/README.md`: one authoritative current-status update after implementation is verified.

## Implementation Tasks

### Task 1: Persist account credentials and implement account service

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_database_managed_accounts/migration.sql`
- Create: `lib/auth/password.ts`
- Create: `lib/auth/password.test.ts`
- Create: `lib/auth/account-service.ts`
- Create: `lib/auth/account-service.test.ts`
- Create: `scripts/bootstrap-manager.ts`
- Modify: `package.json`

**Interfaces:**
- `hashPassword(password: string): Promise<string>` returns a versioned, salted scrypt encoding.
- `verifyPassword(password: string, encodedHash: string): Promise<boolean>` rejects malformed/unknown encodings and compares derived bytes with `timingSafeEqual`.
- `AccountSummary` is `{ id: string; email: string; displayName: string; role: "manager" | "viewer"; active: boolean; mustChangePassword: boolean; createdAt: Date }` and never includes a password hash.
- `bootstrapFirstManager(input: { email: string; displayName: string; temporaryPassword: string }, db: PrismaClient): Promise<AccountSummary>` adopts an uncredentialed case-insensitive email match or creates an account; it fails if any credentialed account already exists, if the match is ambiguous, or if the matched row already has a hash.
- `listAccounts(db: PrismaClient): Promise<AccountSummary[]>`, `createAccount(input, actor, db): Promise<AccountSummary>`, `updateAccount(id, input, actor, db): Promise<AccountSummary>`, `resetAccountPassword(id, temporaryPassword, actor, db): Promise<AccountSummary>`, and `changeAccountPassword(id, currentPassword, newPassword, db): Promise<void>` implement the corresponding operations.
- Account service functions accept a Prisma-compatible client argument; account summaries never include password hashes.

- [x] **Step 1: Add failing password tests** for distinct salts, valid/invalid passwords, malformed hash input, and empty/too-short inputs.
- [x] **Step 2: Run** `cmd.exe /c npm test -- --run lib/auth/password.test.ts`; confirm the new module tests fail because the helpers do not exist.
- [x] **Step 3: Implement** asynchronous `crypto.scrypt` encoding with random salt, explicit work parameters, and a version marker; do not add a password-hashing dependency.
- [x] **Step 4: Run the password tests** and confirm all cases pass.
- [x] **Step 5: Add failing account-service tests** for create/list, duplicate normalized email, bootstrap adoption, preservation of adopted ID, already-hashed account rejection, and last-manager protection.
- [x] **Step 6: Add schema and migration** with nullable unique `externalSubject`, nullable `passwordHash`, and `mustChangePassword` defaulting to true. Normalize stored email case only after migration preflight confirms no lower-case collisions; abort without merging if collisions exist.
- [x] **Step 7: Implement the account service** using Prisma transactions; retain `AppUser` rows and relations, audit account actions without writing plaintext passwords, and prevent deletion.
- [x] **Step 8: Add `tsx` as a production dependency and test the one-shot bootstrap command** reading `BOOTSTRAP_MANAGER_EMAIL`, `BOOTSTRAP_MANAGER_NAME`, and `BOOTSTRAP_MANAGER_PASSWORD`; require `DATABASE_URL`, validate all values, exit non-zero on repeat/ambiguous/credentialed bootstrap, and never call it during app startup. Add `db:bootstrap-manager` as `tsx scripts/bootstrap-manager.ts`.
- [x] **Step 9: Run** `cmd.exe /c npm run db:generate`, `cmd.exe /c npm run db:validate`, targeted account tests, and `git diff --check`.
- [x] **Step 10: Commit** schema, migration, hash/service, bootstrap, and tests as one verified persistence/auth-domain milestone.

### Task 2: Authenticate database accounts and refresh account state

**Files:**
- Modify: `lib/auth/local.ts`, `auth.ts`, `lib/auth/route-access.ts`, `lib/auth/actor.ts`, `lib/planning/persistence.ts`
- Modify: `lib/auth/local.test.ts`, `lib/auth/actor.test.ts`, `lib/planning/persistence.test.ts`, `tests/planning-authenticated-flow.test.ts`

**Interfaces:**
- Add `database` to `AuthMode`; configuration requires `AUTH_SECRET`, `PLANNING_PERSISTENCE=prisma`, and `DATABASE_URL`.
- Credentials authorization queries by normalized email, verifies the stored hash, and rejects missing, inactive, or uncredentialed users with the same public login error.
- On session resolution, database mode re-reads the active account and replaces role/name/email from the row; missing or inactive accounts invalidate the session.

- [x] **Step 1: Add failing tests** for database mode configuration, valid/invalid credentials, inactive account rejection, changed role reflected in existing session, disabled account invalidation, and persistence by database account ID.
- [x] **Step 2: Run** targeted auth, authenticated-flow, and persistence tests; confirm missing database mode and ID-based actor resolution failures before implementation.
- [x] **Step 3: Implement database credentials authorization** using Task 1 services while preserving the existing local-only provider for development and tests.
- [x] **Step 4: Refresh current account state from PostgreSQL** during Auth.js session resolution; resolve the existing `AppUser` by ID before external subject upsert.
- [x] **Step 5: Run targeted auth and authenticated-flow tests** and confirm old local test behavior still passes.
- [x] **Step 6: Run** `cmd.exe /c npm run typecheck` and `cmd.exe /c npm run lint`.
- [ ] **Step 7: Commit** database-mode authentication and session refresh.

### Task 3: Enforce first-login password change

**Files:**
- Create: `app/api/auth/change-password/route.ts`
- Create: `app/(app)/zmena-hesla/page.tsx`
- Create: `components/accounts/change-password-form.tsx`
- Modify: `auth.ts`, `lib/auth/protection.ts`, `lib/auth/protection.test.ts`, `components/login-form.tsx`
- Create: `tests/password-change-route.test.ts`

**Interfaces:**
- `POST /api/auth/change-password` accepts `{ currentPassword, newPassword }`, changes only the authenticated account, and clears `mustChangePassword` after successful verification.
- Session carries `mustChangePassword`; protected application pages and APIs reject account use while it is true, except sign-out and the password-change route/page.

- [x] **Step 1: Add failing route and protection tests** for wrong current password, invalid new password (under 12 characters or over 128), successful first change, forced redirect gating, blocked direct API calls, and access restoration after password update.
- [x] **Step 2: Run targeted tests** and confirm the new route and forced gate are absent.
- [x] **Step 3: Implement** change-password service use, session claim, redirect/protection exceptions, login credentials UI, and a form that keeps passwords only in component memory.
- [x] **Step 4: Run targeted route/protection tests** and confirm planning APIs reject forced-change sessions.
- [ ] **Step 5: Run typecheck and lint; commit** the forced password-change flow.

### Task 4: Add manager-only account APIs and security audit events

**Files:**
- Create: `app/api/accounts/route.ts`
- Create: `app/api/accounts/[id]/route.ts`
- Create: `app/api/accounts/[id]/reset-password/route.ts`
- Modify: `lib/auth/account-service.ts`, `lib/auth/account-service.test.ts`
- Create: `tests/account-routes.test.ts`

**Interfaces:**
- `GET /api/accounts` returns active and deactivated account summaries without secrets.
- `POST /api/accounts` accepts `{ email, name, role, temporaryPassword }` and returns only an account summary; the UI retains the manager-entered temporary password in component memory to show it once.
- `PATCH /api/accounts/[id]` accepts `{ name?, role?, active? }`; role/active changes are audited and protect the last active manager.
- `POST /api/accounts/[id]/reset-password` accepts `{ temporaryPassword }`, stores only its hash, sets `mustChangePassword=true`, and returns no password value.

- [ ] **Step 1: Add failing route tests** for anonymous/viewer denial, manager success, malformed bodies, duplicate email, no secret/hash in list responses, password reset forcing change, and audit event creation without password content.
- [ ] **Step 2: Run** `cmd.exe /c npm test -- --run tests/account-routes.test.ts`; confirm all new tests fail before route creation.
- [ ] **Step 3: Implement manager-only routes** using `requirePlanningActor`, `canConfirmPlanning`, validated JSON, and generic error messages that do not expose account existence or password hashes to unauthorized callers.
- [ ] **Step 4: Protect the last manager invariant transactionally** for concurrent demotion/deactivation using a PostgreSQL serializable transaction; test the invariant in the service and exercise concurrent changes against the isolated PostgreSQL database in Task 6.
- [ ] **Step 5: Run targeted route/service tests** and confirm they pass.
- [ ] **Step 6: Run typecheck and lint; commit** manager account API and audit behavior.

### Task 5: Add manager account-management screen

**Files:**
- Create: `app/(app)/uzivatele/page.tsx`
- Create: `components/accounts/account-management.tsx`
- Modify: `components/app-shell.tsx`

**Interfaces:**
- Page loads account summaries server-side only for managers.
- Client panel lists name, email, role, active state, and actions to create, change role/name, deactivate/reactivate, and reset temporary password.
- The page shows the temporary password only once on successful creation; after dismissal/reload it cannot be recovered.

- [ ] **Step 1: Implement the page/panel** using existing app-shell and form patterns; do not put credentials in URLs, logs, or persisted browser storage. Keep a newly entered temporary password in component memory only until the manager dismisses it.
- [ ] **Step 2: Run targeted account route tests** and inspect the rendered manager/viewer navigation states.
- [ ] **Step 3: Run typecheck and lint; commit** the account-management UI.

### Task 6: Full verification and authoritative status update

**Files:**
- Modify: `docs/README.md`

- [ ] **Step 1: Run** `cmd.exe /c npm test`, `cmd.exe /c npm run typecheck`, `cmd.exe /c npm run lint`, `cmd.exe /c npm run build`, `cmd.exe /c npm run db:validate`, and `git diff --check`.
- [ ] **Step 2: Verify migration and browser flow** using an isolated synthetic local PostgreSQL database only: bootstrap first manager, login, create manager and viewer, force password change, verify viewer denial, deactivate an account, verify its existing session is rejected, and attempt concurrent removal of the last two managers so at least one operation is refused. Do not use production data/services or call any external AI API.
- [ ] **Step 3: Update only `docs/README.md`** with the verified implementation status and its unverified production limitations.
- [ ] **Step 4: Review `git diff`, generated files, and `git status`; commit** the final verification/documentation milestone.
- [ ] **Step 5: Push the verified complete milestone** by ordinary fast-forward to the configured `origin` branch after confirming the remote target and that the remote branch is a fast-forward.
