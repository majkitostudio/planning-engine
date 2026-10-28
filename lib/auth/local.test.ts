import { describe, expect, it } from "vitest";

import {
  getActiveAuthRuntimeConfig,
  getLocalAuthRuntimeConfig,
  verifyLocalCredentials,
} from "./local";

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
