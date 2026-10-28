import { describe, expect, it } from "vitest";

import { getAuthRuntimeConfig, mapAuthProfile } from "./config";

const configuredEnvironment = {
  AUTH_SECRET: "test-auth-secret",
  AUTH_MICROSOFT_ENTRA_ID_ID: "client-id",
  AUTH_MICROSOFT_ENTRA_ID_SECRET: "client-secret",
  AUTH_MICROSOFT_ENTRA_ID_ISSUER:
    "https://login.microsoftonline.com/tenant-id/v2.0",
  PLANNING_ALLOWED_EMAIL_DOMAIN: "aaauto.cz",
  PLANNING_MANAGER_EMAILS: "manager@aaauto.cz",
};

describe("auth runtime configuration", () => {
  it("vrátí bezpečnou chybu při chybějící konfiguraci", () => {
    const result = getAuthRuntimeConfig({});

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("auth_not_configured");
    expect(result.missing).toEqual([
      "AUTH_SECRET",
      "AUTH_MICROSOFT_ENTRA_ID_ID",
      "AUTH_MICROSOFT_ENTRA_ID_SECRET",
      "AUTH_MICROSOFT_ENTRA_ID_ISSUER",
    ]);
  });

  it("přijme tenant-specific issuer pro single-tenant Entra ID", () => {
    const result = getAuthRuntimeConfig(configuredEnvironment);

    expect(result).toEqual({
      ok: true,
      secret: "test-auth-secret",
      clientId: "client-id",
      clientSecret: "client-secret",
      issuer: "https://login.microsoftonline.com/tenant-id/v2.0",
      allowedEmailDomain: "aaauto.cz",
      managerEmails: ["manager@aaauto.cz"],
    });
  });

  it("přiřadí manager roli pouze povolenému e-mailu", () => {
    const runtime = getAuthRuntimeConfig(configuredEnvironment);
    if (!runtime.ok) throw new Error(runtime.message);

    expect(
      mapAuthProfile(
        {
          sub: "entra-sub-1",
          email: "manager@AAAUTO.CZ",
          name: "Manažer",
        },
        runtime,
      ),
    ).toMatchObject({
      id: "entra-sub-1",
      email: "manager@aaauto.cz",
      name: "Manažer",
      role: "manager",
    });

    expect(
      mapAuthProfile(
        { sub: "entra-sub-2", email: "viewer@aaauto.cz", name: "Viewer" },
        runtime,
      ),
    ).toMatchObject({
      id: "entra-sub-2",
      email: "viewer@aaauto.cz",
      name: "Viewer",
      role: "viewer",
    });

    expect(
      mapAuthProfile(
        { sub: "external", email: "external@example.com", name: "External" },
        runtime,
      ),
    ).toBeNull();
  });
});
