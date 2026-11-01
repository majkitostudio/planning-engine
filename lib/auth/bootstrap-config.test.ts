import { describe, expect, it } from "vitest";

import { getBootstrapManagerConfig } from "./bootstrap-config";

describe("bootstrap manager configuration", () => {
  it("lists required configuration keys without including secret values", () => {
    const result = getBootstrapManagerConfig({
      BOOTSTRAP_MANAGER_EMAIL: "manager@example.test",
      BOOTSTRAP_MANAGER_NAME: "Manager",
      BOOTSTRAP_MANAGER_PASSWORD: "synthetic-bootstrap-secret",
    });

    expect(result).toMatchObject({
      ok: false,
      message: expect.stringContaining("DATABASE_URL"),
    });
    expect(JSON.stringify(result)).not.toContain("synthetic-bootstrap-secret");
  });

  it("returns validated bootstrap inputs when every required value is present", () => {
    const result = getBootstrapManagerConfig({
      DATABASE_URL: "postgresql://synthetic:secret@localhost/db",
      BOOTSTRAP_MANAGER_EMAIL: "manager@example.test",
      BOOTSTRAP_MANAGER_NAME: "Manager",
      BOOTSTRAP_MANAGER_PASSWORD: "synthetic-bootstrap-secret",
    });

    expect(result).toEqual({
      ok: true,
      config: {
        connectionString: "postgresql://synthetic:secret@localhost/db",
        email: "manager@example.test",
        displayName: "Manager",
        temporaryPassword: "synthetic-bootstrap-secret",
      },
    });
  });
});
