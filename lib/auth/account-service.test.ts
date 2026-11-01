import { beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/prisma/generated/client";

import {
  bootstrapFirstManager,
  changeAccountPassword,
  createAccount,
  listAccounts,
  resetAccountPassword,
  updateAccount,
} from "./account-service";
import { hashPassword, verifyPassword } from "./password";

type TestRole = "manager" | "viewer";

interface TestUser {
  id: string;
  externalSubject: string | null;
  email: string;
  displayName: string;
  role: TestRole;
  active: boolean;
  passwordHash: string | null;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const actor = {
  userId: "manager-1",
  email: "manager@example.test",
  displayName: "Manager",
  role: "manager" as const,
};

describe("database account service", () => {
  let users: TestUser[];
  let auditEvents: Array<Record<string, unknown>>;
  let db: PrismaClient;

  beforeEach(() => {
    users = [makeUser({ id: actor.userId, email: actor.email, role: "manager" })];
    auditEvents = [];
    db = createTestDatabase(users, auditEvents);
  });

  it("creates a normalized viewer account with a forced first password change", async () => {
    const summary = await createAccount(
      {
        email: "  VIEWER@EXAMPLE.TEST ",
        displayName: "Viewer",
        role: "viewer",
        temporaryPassword: "one-time temporary password",
      },
      actor,
      db,
    );

    expect(summary).toMatchObject({
      email: "viewer@example.test",
      displayName: "Viewer",
      role: "viewer",
      active: true,
      mustChangePassword: true,
    });
    expect(summary).not.toHaveProperty("passwordHash");
    expect(users).toHaveLength(2);
    expect(users[1].passwordHash).not.toContain("one-time temporary password");
    await expect(
      verifyPassword("one-time temporary password", users[1].passwordHash ?? ""),
    ).resolves.toBe(true);
    expect(JSON.stringify(auditEvents)).not.toContain("one-time temporary password");
  });

  it("rejects an email already used with different case", async () => {
    users.push(makeUser({ id: "existing", email: "Viewer@Example.Test" }));

    await expect(
      createAccount(
        {
          email: "viewer@example.test",
          displayName: "Second Viewer",
          role: "viewer",
          temporaryPassword: "another temporary password",
        },
        actor,
        db,
      ),
    ).rejects.toMatchObject({ code: "email_in_use" });
    expect(users).toHaveLength(2);
  });

  it("adopts a matching uncredentialed identity without changing its ID", async () => {
    users.splice(0);
    users.push(
      makeUser({
        id: "historical-user-id",
        externalSubject: "local:manager@example.test",
        email: "Manager@Example.Test",
      }),
    );

    const summary = await bootstrapFirstManager(
      {
        email: "manager@example.test",
        displayName: "Manager",
        temporaryPassword: "first manager temporary password",
      },
      db,
    );

    expect(summary).toMatchObject({
      id: "historical-user-id",
      email: "manager@example.test",
      role: "manager",
      active: true,
      mustChangePassword: true,
    });
    expect(users).toHaveLength(1);
    await expect(
      verifyPassword("first manager temporary password", users[0].passwordHash ?? ""),
    ).resolves.toBe(true);
  });

  it("does not bootstrap when a credentialed account already exists", async () => {
    users.splice(0);
    users.push(
      makeUser({
        id: "existing-manager",
        email: "manager@example.test",
        passwordHash: await hashPassword("existing manager password"),
      }),
    );

    await expect(
      bootstrapFirstManager(
        {
          email: "manager@example.test",
          displayName: "Manager",
          temporaryPassword: "replacement temporary password",
        },
        db,
      ),
    ).rejects.toMatchObject({ code: "bootstrap_already_completed" });
    await expect(
      verifyPassword("existing manager password", users[0].passwordHash ?? ""),
    ).resolves.toBe(true);
  });

  it("lists summaries without exposing stored password hashes", async () => {
    users.splice(0);
    users.push(
      makeUser({
        id: "manager-1",
        email: "manager@example.test",
        role: "manager",
        passwordHash: "secret-hash-value",
      }),
    );

    const summaries = await listAccounts(db);

    const summary = summaries.find((entry) => entry.id === "manager-1");
    expect(summary).toMatchObject({
      id: "manager-1",
      email: "manager@example.test",
      role: "manager",
    });
    expect(JSON.stringify(summaries)).not.toContain("secret-hash-value");
  });

  it("protects the last active manager from demotion", async () => {
    users.splice(0);
    users.push(
      makeUser({
        id: actor.userId,
        email: actor.email,
        role: "manager",
        passwordHash: "manager-hash",
      }),
    );
    users.push(makeUser({
      id: "legacy-manager",
      email: "legacy@example.test",
      role: "manager",
      passwordHash: null,
    }));

    await expect(
      updateAccount(actor.userId, { role: "viewer" }, actor, db),
    ).rejects.toMatchObject({ code: "last_active_manager" });
    expect(users[0].role).toBe("manager");
  });

  it("does not allow a temporary password to satisfy forced change unchanged", async () => {
    const temporaryPassword = "Synthetic Temporary Password";
    users[0] = makeUser({
      id: actor.userId,
      email: actor.email,
      role: "manager",
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
    });

    await expect(
      changeAccountPassword(actor.userId, temporaryPassword, temporaryPassword, db),
    ).rejects.toMatchObject({ code: "password_unchanged" });
    expect(users[0].mustChangePassword).toBe(true);
    expect(auditEvents).toHaveLength(0);
  });

  it("resets an account to a hashed temporary password and audits without the secret", async () => {
    const temporaryPassword = "Synthetic Reset Temporary Password";
    users.push(makeUser({ id: "viewer-reset", email: "viewer@example.test" }));

    const summary = await resetAccountPassword("viewer-reset", temporaryPassword, actor, db);

    expect(summary.mustChangePassword).toBe(true);
    expect(summary).not.toHaveProperty("passwordHash");
    expect(users[1]?.mustChangePassword).toBe(true);
    await expect(verifyPassword(temporaryPassword, users[1]?.passwordHash ?? ""))
      .resolves.toBe(true);
    expect(JSON.stringify(auditEvents)).not.toContain(temporaryPassword);
    expect(auditEvents).toMatchObject([
      { action: "account.password_reset", entityId: "viewer-reset" },
    ]);
  });

  it("does not overwrite a manager password reset racing with a self-service change", async () => {
    const currentPassword = "Synthetic Current Password";
    const account = makeUser({
      id: actor.userId,
      email: actor.email,
      role: "manager",
      passwordHash: await hashPassword(currentPassword),
      mustChangePassword: true,
    });
    const managerResetHash = await hashPassword("Synthetic Manager Reset Password");
    const events: Array<Record<string, unknown>> = [];
    const raceDatabase = {
      $transaction: async (callback: (tx: unknown) => Promise<void>) => callback({
        appUser: {
          findUnique: async () => ({ ...account }),
          update: async ({ data }: { data: Partial<TestUser> }) => {
            Object.assign(account, data);
            return account;
          },
          updateMany: async ({ where, data }: {
            where: { id: string; passwordHash: string; active: boolean };
            data: Partial<TestUser>;
          }) => {
            Object.assign(account, {
              passwordHash: managerResetHash,
              mustChangePassword: true,
            });
            if (account.id !== where.id || account.passwordHash !== where.passwordHash || account.active !== where.active) {
              return { count: 0 };
            }
            Object.assign(account, data);
            return { count: 1 };
          },
        },
        auditEvent: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            events.push(data);
            return data;
          },
        },
      }),
    } as unknown as PrismaClient;

    await expect(
      changeAccountPassword(actor.userId, currentPassword, "Synthetic New Password", raceDatabase),
    ).rejects.toMatchObject({ code: "account_changed" });
    expect(account.passwordHash).toBe(managerResetHash);
    expect(account.mustChangePassword).toBe(true);
    expect(events).toHaveLength(0);
  });
});

function makeUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: "user-1",
    externalSubject: null,
    email: "user@example.test",
    displayName: "User",
    role: "viewer",
    active: true,
    passwordHash: null,
    mustChangePassword: true,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z"),
    ...overrides,
  };
}

function createTestDatabase(
  records: TestUser[],
  events: Array<Record<string, unknown>>,
): PrismaClient {
  const database = {
    appUser: {
      findMany: async ({ where }: { where?: { email?: { equals: string } } } = {}) =>
        records.filter(
          (record) =>
            where?.email?.equals === undefined ||
            record.email.toLowerCase() === where.email.equals.toLowerCase(),
        ),
      findFirst: async ({ where }: { where: { email?: { equals: string } } }) =>
        records.find(
          (record) =>
            record.email.toLowerCase() === where.email?.equals.toLowerCase(),
        ) ?? null,
      findUnique: async ({ where }: { where: { id?: string; email?: string } }) =>
        records.find(
          (record) =>
            record.id === where.id || record.email === where.email,
        ) ?? null,
      create: async ({ data }: { data: Partial<TestUser> }) => {
        const next = makeUser({
          ...data,
          id: data.id ?? `user-${records.length + 1}`,
          createdAt: new Date("2026-10-30T00:00:00.000Z"),
          updatedAt: new Date("2026-10-30T00:00:00.000Z"),
        });
        records.push(next);
        return next;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<TestUser>;
      }) => {
        const record = records.find((user) => user.id === where.id);
        if (!record) throw new Error("record not found");
        Object.assign(record, data);
        return record;
      },
      count: async ({
        where,
      }: {
        where?: {
          active?: boolean;
          role?: TestRole;
          passwordHash?: { not: null };
        };
      } = {}) =>
        records.filter(
          (record) =>
            (where?.active === undefined || record.active === where.active) &&
            (where?.role === undefined || record.role === where.role) &&
            (where?.passwordHash?.not !== null || where.passwordHash?.not === null && record.passwordHash !== null),
        ).length,
    },
    auditEvent: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        events.push(data);
        return data;
      },
    },
    $transaction: async <T>(callback: (transaction: unknown) => Promise<T>) =>
      callback(database),
  };

  return database as unknown as PrismaClient;
}
