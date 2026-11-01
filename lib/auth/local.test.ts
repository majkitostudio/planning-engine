import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@/prisma/generated/client";

import {
  getActiveAuthRuntimeConfig,
  getDatabaseAuthRuntimeConfig,
  getLocalAuthRuntimeConfig,
  refreshDatabaseCredentialsUser,
  verifyDatabaseCredentials,
  verifyLocalCredentials,
} from "./local";
import { hashPassword } from "./password";

const configuredEnvironment = {
  AUTH_SECRET: "test-auth-secret",
  PLANNING_AUTH_MODE: "local",
  PLANNING_LOGIN_EMAIL: "manager@aaauto.cz",
  PLANNING_LOGIN_PASSWORD: "test-password",
  PLANNING_LOGIN_ROLE: "manager",
};

describe("local MVP auth", () => {
  it("vyžaduje lokální účet a session secret", () => {
    const result = getLocalAuthRuntimeConfig({});

    expect(result).toMatchObject({
      ok: false,
      code: "auth_not_configured",
      missing: [
        "AUTH_SECRET",
        "PLANNING_LOGIN_EMAIL",
        "PLANNING_LOGIN_PASSWORD",
        "PLANNING_LOGIN_ROLE",
      ],
    });
  });

  it("přijme správný lokální účet a vrátí roli", () => {
    const runtime = getLocalAuthRuntimeConfig(configuredEnvironment);
    if (!runtime.ok) throw new Error(runtime.message);

    expect(verifyLocalCredentials({
      email: "MANAGER@AAAUTO.CZ",
      password: "test-password",
    }, runtime)).toEqual({
      id: "local:manager@aaauto.cz",
      email: "manager@aaauto.cz",
      name: "manager@aaauto.cz",
      role: "manager",
    });
  });

  it("odmítne nesprávné heslo nebo jiný e-mail", () => {
    const runtime = getLocalAuthRuntimeConfig(configuredEnvironment);
    if (!runtime.ok) throw new Error(runtime.message);

    expect(verifyLocalCredentials({
      email: runtime.email,
      password: "wrong-password",
    }, runtime)).toBeNull();
    expect(verifyLocalCredentials({
      email: "viewer@aaauto.cz",
      password: runtime.password,
    }, runtime)).toBeNull();
  });

  it("použije local jako výchozí režim a Entra nechá explicitní", () => {
    expect(getActiveAuthRuntimeConfig(configuredEnvironment)).toMatchObject({
      ok: true,
      mode: "local",
    });
    expect(getActiveAuthRuntimeConfig({
      ...configuredEnvironment,
      PLANNING_AUTH_MODE: "entra",
      AUTH_MICROSOFT_ENTRA_ID_ID: "client-id",
      AUTH_MICROSOFT_ENTRA_ID_SECRET: "client-secret",
      AUTH_MICROSOFT_ENTRA_ID_ISSUER:
        "https://login.microsoftonline.com/tenant-id/v2.0",
    })).toMatchObject({ ok: true, mode: "entra" });
  });

  it("v produkci odmítne lokální MVP přihlášení", () => {
    expect(getActiveAuthRuntimeConfig({
      ...configuredEnvironment,
      NODE_ENV: "production",
    })).toMatchObject({
      ok: false,
      code: "auth_invalid_config",
      message: expect.stringContaining("pouze pro vývoj a testy"),
    });
  });
});

describe("database-managed auth", () => {
  const environment = {
    AUTH_SECRET: "test-auth-secret",
    PLANNING_AUTH_MODE: "database",
    PLANNING_PERSISTENCE: "prisma",
    DATABASE_URL: "postgresql://test:secret@localhost/planning_engine",
  };

  it("requires a secret and PostgreSQL persistence configuration", () => {
    expect(getDatabaseAuthRuntimeConfig({})).toMatchObject({
      ok: false,
      code: "auth_not_configured",
      missing: ["AUTH_SECRET", "DATABASE_URL"],
    });
    expect(
      getDatabaseAuthRuntimeConfig({
        ...environment,
        PLANNING_PERSISTENCE: "memory",
      }),
    ).toMatchObject({ ok: false, code: "auth_invalid_config" });
    expect(getActiveAuthRuntimeConfig(environment)).toMatchObject({
      ok: true,
      mode: "database",
    });
  });

  it("authenticates an active account and returns its database identity", async () => {
    const account = await makeCredentialAccount();
    const runtime = getDatabaseAuthRuntimeConfig(environment);
    if (!runtime.ok) throw new Error(runtime.message);

    await expect(
      verifyDatabaseCredentials(
        { email: " MANAGER@EXAMPLE.TEST ", password: "synthetic manager password" },
        runtime,
        createAuthDatabase(account),
      ),
    ).resolves.toEqual({
      id: "database-user-id",
      email: "manager@example.test",
      name: "Database Manager",
      role: "manager",
      mustChangePassword: true,
    });
  });

  it("returns the same failed-auth result for wrong, unknown, inactive, or uncredentialed users", async () => {
    const account = await makeCredentialAccount();
    const runtime = getDatabaseAuthRuntimeConfig(environment);
    if (!runtime.ok) throw new Error(runtime.message);

    const cases = [
      { email: account.email, password: "wrong synthetic password", active: true, passwordHash: account.passwordHash },
      { email: "unknown@example.test", password: "synthetic manager password", active: true, passwordHash: account.passwordHash },
      { email: account.email, password: "synthetic manager password", active: false, passwordHash: account.passwordHash },
      { email: account.email, password: "synthetic manager password", active: true, passwordHash: null },
    ];

    for (const item of cases) {
      await expect(
        verifyDatabaseCredentials(
          { email: item.email, password: item.password },
          runtime,
          createAuthDatabase({ ...account, active: item.active, passwordHash: item.passwordHash }),
        ),
      ).resolves.toBeNull();
    }
  });

  it("refreshes an existing session with current role and invalidates a disabled account", async () => {
    const account = await makeCredentialAccount();
    const runtime = getDatabaseAuthRuntimeConfig(environment);
    if (!runtime.ok) throw new Error(runtime.message);

    await expect(
      refreshDatabaseCredentialsUser(
        account.id,
        runtime,
        createAuthDatabase({ ...account, role: "viewer" }),
      ),
    ).resolves.toMatchObject({ role: "viewer", id: account.id });
    await expect(
      refreshDatabaseCredentialsUser(
        account.id,
        runtime,
        createAuthDatabase({ ...account, active: false }),
      ),
    ).resolves.toBeNull();
  });
});

interface FakeAuthAccount {
  id: string;
  externalSubject: string | null;
  email: string;
  displayName: string;
  role: "manager" | "viewer";
  active: boolean;
  passwordHash: string | null;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

async function makeCredentialAccount(): Promise<FakeAuthAccount> {
  return {
    id: "database-user-id",
    externalSubject: null,
    email: "manager@example.test",
    displayName: "Database Manager",
    role: "manager" as const,
    active: true,
    passwordHash: await hashPassword("synthetic manager password"),
    mustChangePassword: true,
    createdAt: new Date("2026-10-30T00:00:00.000Z"),
    updatedAt: new Date("2026-10-30T00:00:00.000Z"),
  };
}

function createAuthDatabase(account: FakeAuthAccount) {
  return {
    appUser: {
      findFirst: async ({ where }: { where: { email: { equals: string } } }) =>
        account.email.toLowerCase() === where.email.equals.toLowerCase()
          ? account
          : null,
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === account.id ? account : null,
    },
  } as unknown as PrismaClient;
}
