import { Prisma, type PrismaClient } from "@/prisma/generated/client";

import type { PlanningActor } from "./actor";
import { hashPassword, validatePasswordLength, verifyPassword } from "./password";
import { DATABASE_LOGIN_LOCK_MINUTES, DATABASE_LOGIN_MAX_FAILURES } from "./login-policy";

export type AccountRole = "manager" | "viewer";

export interface AccountSummary {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: AccountRole;
  readonly active: boolean;
  readonly mustChangePassword: boolean;
  readonly createdAt: Date;
}

export interface AuthenticatedAccount extends AccountSummary {
  readonly sessionVersion: number;
}

export type AccountServiceErrorCode =
  | "invalid_email"
  | "invalid_name"
  | "invalid_role"
  | "invalid_input"
  | "invalid_password"
  | "invalid_credentials"
  | "password_unchanged"
  | "account_changed"
  | "email_in_use"
  | "account_not_found"
  | "last_active_manager"
  | "bootstrap_already_completed"
  | "bootstrap_ambiguous_email";

export class AccountServiceError extends Error {
  constructor(
    readonly code: AccountServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AccountServiceError";
  }
}

export interface NewAccountInput {
  readonly email: string;
  readonly displayName: string;
  readonly role: AccountRole;
  readonly temporaryPassword: string;
}

export interface UpdateAccountInput {
  readonly displayName?: string;
  readonly role?: AccountRole;
  readonly active?: boolean;
}

export interface BootstrapManagerInput {
  readonly email: string;
  readonly displayName: string;
  readonly temporaryPassword: string;
}

export async function bootstrapFirstManager(
  input: BootstrapManagerInput,
  db: PrismaClient,
): Promise<AccountSummary> {
  const normalized = validateIdentity(input.email, input.displayName);
  validatePassword(input.temporaryPassword);
  const passwordHash = await hashPassword(input.temporaryPassword);

  return db.$transaction(
    async (tx) => {
      const credentialedUsers = await tx.appUser.count({
        where: { passwordHash: { not: null } },
      });
      if (credentialedUsers > 0) {
        throw new AccountServiceError(
          "bootstrap_already_completed",
          "Bootstrap managera už byl dokončen.",
        );
      }

      const matches = await tx.appUser.findMany({
        where: { email: { equals: normalized.email, mode: "insensitive" } },
      });
      if (matches.length > 1) {
        throw new AccountServiceError(
          "bootstrap_ambiguous_email",
          "E-mail odpovídá více existujícím identitám.",
        );
      }

      const existing = matches[0];
      if (existing?.passwordHash) {
        throw new AccountServiceError(
          "bootstrap_already_completed",
          "Přihlašovací účet už existuje.",
        );
      }

      const account = existing
        ? await tx.appUser.update({
            where: { id: existing.id },
            data: {
              email: normalized.email,
              displayName: normalized.displayName,
              role: "manager",
              active: true,
              passwordHash,
              mustChangePassword: true,
            },
          })
        : await tx.appUser.create({
            data: {
              externalSubject: null,
              email: normalized.email,
              displayName: normalized.displayName,
              role: "manager",
              active: true,
              passwordHash,
              mustChangePassword: true,
            },
          });

      await tx.auditEvent.create({
        data: {
          action: "account.bootstrap_manager",
          entityType: "AppUser",
          entityId: account.id,
          details: { email: account.email },
        },
      });

      return toAccountSummary(account);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function listAccounts(
  db: PrismaClient,
): Promise<AccountSummary[]> {
  const accounts = await db.appUser.findMany({
    orderBy: [{ displayName: "asc" }, { email: "asc" }],
  });
  return accounts.map(toAccountSummary);
}

export async function createAccount(
  input: NewAccountInput,
  actor: PlanningActor,
  db: PrismaClient,
): Promise<AccountSummary> {
  const normalized = validateIdentity(input.email, input.displayName);
  validateRole(input.role);
  validatePassword(input.temporaryPassword);
  const passwordHash = await hashPassword(input.temporaryPassword);

  return db.$transaction(async (tx) => {
    await assertActiveManager(tx, actor);
    const existing = await tx.appUser.findFirst({
      where: { email: { equals: normalized.email, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      throw new AccountServiceError("email_in_use", "Tento e-mail už účet používá.");
    }

    const account = await tx.appUser.create({
      data: {
        externalSubject: null,
        email: normalized.email,
        displayName: normalized.displayName,
        role: input.role,
        active: true,
        passwordHash,
        mustChangePassword: true,
      },
    });

    await writeAccountAudit(tx, "account.created", account, actor, {
      role: account.role,
    });
    return toAccountSummary(account);
  });
}

export async function updateAccount(
  id: string,
  input: UpdateAccountInput,
  actor: PlanningActor,
  db: PrismaClient,
): Promise<AccountSummary> {
  const data: {
    displayName?: string;
    role?: AccountRole;
    active?: boolean;
    sessionVersion?: { increment: number };
  } = {};

  if (input.displayName !== undefined) {
    const normalizedName = normalizeName(input.displayName);
    if (!normalizedName) {
      throw new AccountServiceError("invalid_name", "Jméno je povinné.");
    }
    data.displayName = normalizedName;
  }
  if (input.role !== undefined) {
    validateRole(input.role);
    data.role = input.role;
  }
  if (input.active !== undefined) data.active = input.active;
  if (Object.keys(data).length === 0) {
    throw new AccountServiceError("invalid_input", "Není zadána žádná změna účtu.");
  }

  return db.$transaction(
    async (tx) => {
      await assertActiveManager(tx, actor);
      const current = await tx.appUser.findUnique({ where: { id } });
      if (!current) {
        throw new AccountServiceError("account_not_found", "Účet nebyl nalezen.");
      }

      const removesLastCredentialedManager =
        current.role === "manager" &&
        current.active &&
        current.passwordHash !== null &&
        ((data.role !== undefined && data.role !== "manager") || data.active === false);
      if (removesLastCredentialedManager) {
        const activeManagers = await tx.appUser.count({
          where: {
            role: "manager",
            active: true,
            passwordHash: { not: null },
          },
        });
        if (activeManagers <= 1) {
          throw new AccountServiceError(
            "last_active_manager",
            "Posledního aktivního managera nelze deaktivovat ani změnit na viewera.",
          );
        }
      }

      if (
        (data.role !== undefined && data.role !== current.role) ||
        (data.active !== undefined && data.active !== current.active)
      ) {
        data.sessionVersion = { increment: 1 };
      }

      const account = await tx.appUser.update({ where: { id }, data });
      await writeAccountAudit(tx, "account.updated", account, actor, {
        ...(data.role ? { role: data.role } : {}),
        ...(data.active !== undefined ? { active: String(data.active) } : {}),
        ...(data.displayName ? { displayName: data.displayName } : {}),
      });
      return toAccountSummary(account);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function resetAccountPassword(
  id: string,
  temporaryPassword: string,
  actor: PlanningActor,
  db: PrismaClient,
): Promise<AccountSummary> {
  validatePassword(temporaryPassword);
  const passwordHash = await hashPassword(temporaryPassword);

  return db.$transaction(async (tx) => {
    await assertActiveManager(tx, actor);
    const current = await tx.appUser.findUnique({ where: { id } });
    if (!current) {
      throw new AccountServiceError("account_not_found", "Účet nebyl nalezen.");
    }

    const account = await tx.appUser.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true, sessionVersion: { increment: 1 }, loginFailureCount: 0, loginLockedUntil: null },
    });
    await writeAccountAudit(tx, "account.password_reset", account, actor);
    return toAccountSummary(account);
  });
}

export async function changeAccountPassword(
  id: string,
  currentPassword: string,
  newPassword: string,
  db: PrismaClient,
): Promise<void> {
  validatePassword(newPassword);
  const newPasswordHash = await hashPassword(newPassword);

  await db.$transaction(async (tx) => {
    const current = await tx.appUser.findUnique({ where: { id } });
    if (
      !current?.active ||
      !current.passwordHash ||
      !(await verifyPassword(currentPassword, current.passwordHash))
    ) {
      throw new AccountServiceError(
        "invalid_credentials",
        "Aktuální přihlašovací údaje nejsou platné.",
      );
    }
    if (await verifyPassword(newPassword, current.passwordHash)) {
      throw new AccountServiceError(
        "password_unchanged",
        "Nové heslo se musí lišit od současného hesla.",
      );
    }

    const result = await tx.appUser.updateMany({
      where: { id, passwordHash: current.passwordHash, active: true },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
        sessionVersion: { increment: 1 },
        loginFailureCount: 0,
        loginLockedUntil: null,
      },
    });
    if (result.count !== 1) {
      throw new AccountServiceError(
        "account_changed",
        "Účet se během změny změnil. Přihlaste se znovu.",
      );
    }
    await tx.auditEvent.create({
      data: {
        action: "account.password_changed",
        entityType: "AppUser",
        entityId: current.id,
        actorId: current.id,
        details: { email: current.email },
      },
    });
  });
}

export async function authenticateAccount(
  email: string,
  password: string,
  db: PrismaClient,
): Promise<AuthenticatedAccount | null> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const candidate = await db.appUser.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    select: { id: true },
  });
  if (!candidate) return null;

  return db.$transaction(async (tx) => {
    // Pořadí pokusů určuje databázový zámek, aby se limit nedal obejít souběhem.
    const [locked] = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "AppUser" WHERE id = ${candidate.id} FOR UPDATE
    `;
    if (!locked) return null;
    const [clock] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
    if (!clock) throw new Error("Databázový čas není dostupný.");
    const account = await tx.appUser.findUnique({ where: { id: locked.id } });
    if (!account?.active || !account.passwordHash) return null;
    if (account.loginLockedUntil && account.loginLockedUntil > clock.now) return null;

    const failures = account.loginLockedUntil ? 0 : account.loginFailureCount;
    if (!(await verifyPassword(password, account.passwordHash))) {
      const nextFailures = failures + 1;
      await tx.appUser.update({
        where: { id: account.id },
        data: {
          loginFailureCount: nextFailures,
          loginLockedUntil: nextFailures >= DATABASE_LOGIN_MAX_FAILURES ? new Date(clock.now.getTime() + DATABASE_LOGIN_LOCK_MINUTES * 60_000) : null,
        },
      });
      return null;
    }
    if (account.loginFailureCount !== 0 || account.loginLockedUntil) {
      await tx.appUser.update({ where: { id: account.id }, data: { loginFailureCount: 0, loginLockedUntil: null } });
    }
    return { ...toAccountSummary(account), sessionVersion: account.sessionVersion };
  }, { timeout: 30_000 });
}

export async function refreshAccountSession(
  id: string,
  db: PrismaClient,
): Promise<AuthenticatedAccount | null> {
  const account = await db.appUser.findUnique({ where: { id } });
  if (!account?.active || !account.passwordHash) return null;
  return { ...toAccountSummary(account), sessionVersion: account.sessionVersion };
}

function validateIdentity(email: string, displayName: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new AccountServiceError("invalid_email", "Zadejte platnou e-mailovou adresu.");
  }
  const normalizedName = normalizeName(displayName);
  if (!normalizedName) {
    throw new AccountServiceError("invalid_name", "Jméno je povinné.");
  }
  return { email: normalizedEmail, displayName: normalizedName };
}

function normalizeEmail(email: string): string {
  const value = email.trim().toLowerCase();
  if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "";
  return value;
}

function normalizeName(displayName: string): string {
  const value = displayName.trim();
  return value.length > 0 && value.length <= 120 ? value : "";
}

function validateRole(role: string): asserts role is AccountRole {
  if (role !== "manager" && role !== "viewer") {
    throw new AccountServiceError("invalid_role", "Role musí být manager nebo viewer.");
  }
}

function validatePassword(password: string): void {
  try {
    validatePasswordLength(password);
  } catch {
    throw new AccountServiceError(
      "invalid_password",
      "Heslo musí mít 12 až 128 znaků.",
    );
  }
}

async function assertActiveManager(
  tx: Prisma.TransactionClient,
  actor: PlanningActor,
): Promise<void> {
  const account = await tx.appUser.findUnique({
    where: { id: actor.userId },
    select: { active: true, role: true },
  });
  if (!account?.active || account.role !== "manager") {
    throw new AccountServiceError("invalid_credentials", "Účet nemá oprávnění spravovat uživatele.");
  }
}

async function writeAccountAudit(
  tx: Prisma.TransactionClient,
  action: string,
  account: { readonly id: string; readonly email: string },
  actor: PlanningActor,
  details?: Record<string, string>,
): Promise<void> {
  await tx.auditEvent.create({
    data: {
      action,
      entityType: "AppUser",
      entityId: account.id,
      actorId: actor.userId,
      details: { email: account.email, ...details },
    },
  });
}

function toAccountSummary(account: {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: AccountRole;
  readonly active: boolean;
  readonly mustChangePassword: boolean;
  readonly createdAt: Date;
}): AccountSummary {
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    role: account.role,
    active: account.active,
    mustChangePassword: account.mustChangePassword,
    createdAt: account.createdAt,
  };
}
