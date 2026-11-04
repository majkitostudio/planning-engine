import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { prisma } from "../db";
import {
  authenticateAccount,
  changeAccountPassword,
  refreshAccountSession,
  resetAccountPassword,
  updateAccount,
} from "./account-service";
import { isDatabaseSessionVersionCurrent } from "./local";
import { hashPassword } from "./password";

const enabled = process.env.PLANNING_AUTH_SESSION_INTEGRATION === "1";

describe.skipIf(!enabled)("zneplatnění databázových relací v izolované PostgreSQL", () => {
  it("odmítne staré verze po resetu, změně hesla a role; deaktivovaný účet odmítne", async () => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (
      url.hostname !== "localhost" ||
      url.port !== "55439" ||
      url.pathname !== "/planning_monthly_test"
    ) {
      throw new Error(
        "Integrační test vyžaduje výhradně vyhrazenou izolovanou databázi na localhost:55439/planning_monthly_test.",
      );
    }

    const suffix = randomUUID();
    const managerEmail = `session-manager-${suffix}@example.test`;
    const targetEmail = `session-target-${suffix}@example.test`;
    const temporaryPassword = "Synthetic Reset Temporary Password";
    let managerId: string | undefined;
    let targetId: string | undefined;

    try {
      const manager = await prisma.appUser.create({
        data: {
          email: managerEmail,
          displayName: "Synthetic Session Manager",
          role: "manager",
          passwordHash: await hashPassword("Synthetic Manager Password"),
          mustChangePassword: false,
        },
      });
      managerId = manager.id;
      const target = await prisma.appUser.create({
        data: {
          email: targetEmail,
          displayName: "Synthetic Session Target",
          role: "viewer",
          passwordHash: await hashPassword("Synthetic Previous Password"),
          mustChangePassword: false,
        },
      });
      targetId = target.id;
      const actor = {
        userId: manager.id,
        email: manager.email,
        displayName: manager.displayName,
        role: "manager" as const,
      };

      await resetAccountPassword(target.id, temporaryPassword, actor, prisma);
      const afterReset = await refreshAccountSession(target.id, prisma);
      expect(afterReset?.sessionVersion).toBe(target.sessionVersion + 1);
      expect(isDatabaseSessionVersionCurrent(target.sessionVersion, afterReset?.sessionVersion)).toBe(false);
      expect(isDatabaseSessionVersionCurrent(undefined, afterReset?.sessionVersion)).toBe(false);

      const freshLogin = await authenticateAccount(targetEmail, temporaryPassword, prisma);
      expect(freshLogin?.sessionVersion).toBe(afterReset?.sessionVersion);
      await changeAccountPassword(target.id, temporaryPassword, "Synthetic New Password", prisma);
      const afterPasswordChange = await refreshAccountSession(target.id, prisma);
      expect(afterPasswordChange?.mustChangePassword).toBe(false);
      expect(afterPasswordChange?.sessionVersion).toBe((afterReset?.sessionVersion ?? 0) + 1);
      expect(isDatabaseSessionVersionCurrent(freshLogin?.sessionVersion, afterPasswordChange?.sessionVersion)).toBe(false);

      await updateAccount(target.id, { role: "manager" }, actor, prisma);
      const afterRoleChange = await refreshAccountSession(target.id, prisma);
      expect(afterRoleChange?.role).toBe("manager");
      expect(isDatabaseSessionVersionCurrent(afterPasswordChange?.sessionVersion, afterRoleChange?.sessionVersion)).toBe(false);

      await updateAccount(target.id, { active: false }, actor, prisma);
      const deactivated = await prisma.appUser.findUnique({ where: { id: target.id } });
      expect(deactivated?.sessionVersion).toBe((afterRoleChange?.sessionVersion ?? 0) + 1);
      await expect(refreshAccountSession(target.id, prisma)).resolves.toBeNull();
    } finally {
      const ids = [managerId, targetId].filter((id): id is string => Boolean(id));
      if (ids.length) {
        await prisma.auditEvent.deleteMany({ where: { entityId: { in: ids } } });
        await prisma.appUser.deleteMany({ where: { id: { in: ids } } });
      }
    }
  });
});
