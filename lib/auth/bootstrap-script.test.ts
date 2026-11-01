import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("bootstrap manager command", () => {
  it("exits before connecting when required configuration is missing", () => {
    const temporaryPassword = "synthetic bootstrap password";
    const cli = join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
    const script = join(process.cwd(), "scripts", "bootstrap-manager.ts");
    const result = spawnSync(process.execPath, [cli, script], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL: "",
        BOOTSTRAP_MANAGER_EMAIL: "manager@example.test",
        BOOTSTRAP_MANAGER_NAME: "Synthetic Manager",
        BOOTSTRAP_MANAGER_PASSWORD: temporaryPassword,
      },
    });
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

    expect(result.status).not.toBe(0);
    expect(output).toContain("DATABASE_URL");
    expect(output).not.toContain(temporaryPassword);
  });
});
