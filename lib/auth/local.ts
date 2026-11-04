import { createHmac, timingSafeEqual } from "node:crypto";

import {
  getAuthRuntimeConfig,
  type AuthRole,
  type AuthRuntimeConfig,
  type AuthRuntimeConfigFailure,
} from "./config";
import {
  authenticateAccount,
  refreshAccountSession,
} from "./account-service";
import type { PrismaClient } from "@/prisma/generated/client";

export interface LocalAuthRuntimeConfig {
  readonly ok: true;
  readonly mode: "local";
  readonly secret: string;
  readonly email: string;
  readonly password: string;
  readonly role: AuthRole;
}

export interface DatabaseAuthRuntimeConfig {
  readonly ok: true;
  readonly mode: "database";
  readonly secret: string;
  readonly databaseUrl: string;
}

export type AuthMode = "local" | "database" | "entra";

export type LocalAuthRuntimeConfigResult =
  | LocalAuthRuntimeConfig
  | AuthRuntimeConfigFailure;

export type ActiveAuthRuntimeConfig =
  | (AuthRuntimeConfig & { readonly mode: "entra" })
  | DatabaseAuthRuntimeConfig
  | LocalAuthRuntimeConfig;

export type ActiveAuthRuntimeConfigResult =
  | ActiveAuthRuntimeConfig
  | AuthRuntimeConfigFailure;

export interface LocalCredentials {
  readonly email?: unknown;
  readonly password?: unknown;
}

export interface LocalAuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: AuthRole;
  readonly mustChangePassword?: boolean;
  readonly sessionVersion?: number;
}

export type DatabaseAuthRuntimeConfigResult =
  | DatabaseAuthRuntimeConfig
  | AuthRuntimeConfigFailure;

type AuthEnvironment = Readonly<Record<string, string | undefined>>;

export function getLocalAuthRuntimeConfig(
  env: AuthEnvironment = process.env,
): LocalAuthRuntimeConfigResult {
  const required = [
    "AUTH_SECRET",
    "PLANNING_LOGIN_EMAIL",
    "PLANNING_LOGIN_PASSWORD",
    "PLANNING_LOGIN_ROLE",
  ] as const;
  const missing = required.filter((name) => !env[name]?.trim());

  if (missing.length > 0) {
    return {
      ok: false,
      code: "auth_not_configured",
      missing,
      message:
        "Lokální MVP přihlášení není nakonfigurované. Doplňte AUTH_SECRET, PLANNING_LOGIN_EMAIL, PLANNING_LOGIN_PASSWORD a PLANNING_LOGIN_ROLE.",
    };
  }

  const role = env.PLANNING_LOGIN_ROLE!.trim().toLowerCase();
  if (role !== "manager" && role !== "viewer") {
    return {
      ok: false,
      code: "auth_invalid_config",
      missing: [],
      message:
        'PLANNING_LOGIN_ROLE musí být „manager“ nebo „viewer“.',
    };
  }

  const email = env.PLANNING_LOGIN_EMAIL!.trim().toLowerCase();
  if (!email.includes("@")) {
    return {
      ok: false,
      code: "auth_invalid_config",
      missing: [],
      message: "PLANNING_LOGIN_EMAIL musí být platná e-mailová adresa.",
    };
  }

  return {
    ok: true,
    mode: "local",
    secret: env.AUTH_SECRET!.trim(),
    email,
    password: env.PLANNING_LOGIN_PASSWORD!,
    role,
  };
}

export function getActiveAuthRuntimeConfig(
  env: AuthEnvironment = process.env,
): ActiveAuthRuntimeConfigResult {
  const mode = env.PLANNING_AUTH_MODE?.trim().toLowerCase() || "local";

  if (mode === "local") {
    if (env.NODE_ENV === "production") {
      return {
        ok: false,
        code: "auth_invalid_config",
        missing: [],
        message:
          "PLANNING_AUTH_MODE=local je pouze pro vývoj a testy. Pro produkční běh nastavte entra.",
      };
    }

    return getLocalAuthRuntimeConfig(env);
  }

  if (mode === "entra") {
    const runtime = getAuthRuntimeConfig(env);
    return runtime.ok ? { ...runtime, mode: "entra" } : runtime;
  }

  if (mode === "database") return getDatabaseAuthRuntimeConfig(env);

  return {
    ok: false,
    code: "auth_invalid_config",
    missing: [],
    message:
      'PLANNING_AUTH_MODE musí být „local“, „database“ nebo „entra“.',
  };
}

export function getDatabaseAuthRuntimeConfig(
  env: AuthEnvironment = process.env,
): DatabaseAuthRuntimeConfigResult {
  const missing = ["AUTH_SECRET", "DATABASE_URL"].filter(
    (name) => !env[name]?.trim(),
  );
  if (missing.length > 0) {
    return {
      ok: false,
      code: "auth_not_configured",
      missing,
      message: "Databázové přihlášení vyžaduje AUTH_SECRET a DATABASE_URL.",
    };
  }
  if (env.PLANNING_PERSISTENCE?.trim().toLowerCase() !== "prisma") {
    return {
      ok: false,
      code: "auth_invalid_config",
      missing: [],
      message: "Databázové přihlášení vyžaduje PLANNING_PERSISTENCE=prisma.",
    };
  }

  return {
    ok: true,
    mode: "database",
    secret: env.AUTH_SECRET!.trim(),
    databaseUrl: env.DATABASE_URL!.trim(),
  };
}

export function verifyLocalCredentials(
  credentials: LocalCredentials,
  runtime: LocalAuthRuntimeConfig,
): LocalAuthenticatedUser | null {
  const email =
    typeof credentials.email === "string"
      ? credentials.email.trim().toLowerCase()
      : "";
  const password =
    typeof credentials.password === "string" ? credentials.password : "";

  if (email !== runtime.email || !hasMatchingSecret(password, runtime)) {
    return null;
  }

  return {
    id: `local:${runtime.email}`,
    email: runtime.email,
    name: runtime.email,
    role: runtime.role,
  };
}

export async function verifyDatabaseCredentials(
  credentials: LocalCredentials,
  runtime: DatabaseAuthRuntimeConfig,
  db: PrismaClient,
): Promise<LocalAuthenticatedUser | null> {
  void runtime;
  const email = typeof credentials.email === "string" ? credentials.email : "";
  const password = typeof credentials.password === "string" ? credentials.password : "";
  const account = await authenticateAccount(email, password, db);
  if (!account) return null;

  return {
    id: account.id,
    email: account.email,
    name: account.displayName,
    role: account.role,
    mustChangePassword: account.mustChangePassword,
    sessionVersion: account.sessionVersion,
  };
}

export async function refreshDatabaseCredentialsUser(
  id: string,
  runtime: DatabaseAuthRuntimeConfig,
  db: PrismaClient,
): Promise<LocalAuthenticatedUser | null> {
  void runtime;
  const account = await refreshAccountSession(id, db);
  if (!account) return null;

  return {
    id: account.id,
    email: account.email,
    name: account.displayName,
    role: account.role,
    mustChangePassword: account.mustChangePassword,
    sessionVersion: account.sessionVersion,
  };
}

export function isDatabaseSessionVersionCurrent(
  tokenVersion: unknown,
  currentVersion: unknown,
): boolean {
  return Number.isInteger(tokenVersion) && Number.isInteger(currentVersion) && tokenVersion === currentVersion;
}

function hasMatchingSecret(
  password: string,
  runtime: LocalAuthRuntimeConfig,
): boolean {
  const actual = createHmac("sha256", runtime.secret).update(password).digest();
  const expected = createHmac("sha256", runtime.secret)
    .update(runtime.password)
    .digest();

  return timingSafeEqual(actual, expected);
}
