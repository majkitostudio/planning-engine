import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAccount,
  listAccounts,
  resetAccountPassword,
  updateAccount,
} from "@/lib/auth/account-service";
import { requirePlanningActor } from "@/lib/auth/route-access";
import { GET, POST } from "../app/api/accounts/route";
import { PATCH } from "../app/api/accounts/[id]/route";
import { POST as resetPassword } from "../app/api/accounts/[id]/reset-password/route";

vi.mock("@/lib/auth/route-access", () => ({ requirePlanningActor: vi.fn() }));
vi.mock("@/lib/auth/account-service", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/auth/account-service")>(),
  createAccount: vi.fn(),
  listAccounts: vi.fn(),
  resetAccountPassword: vi.fn(),
  updateAccount: vi.fn(),
}));

const actor = {
  userId: "manager-db-id",
  email: "manager@example.test",
  displayName: "Manager",
  role: "manager" as const,
};
const summary = {
  id: "viewer-db-id",
  email: "viewer@example.test",
  displayName: "Viewer",
  role: "viewer" as const,
  active: true,
  mustChangePassword: true,
  createdAt: new Date("2026-10-30T00:00:00.000Z"),
};
const requireActorMock = vi.mocked(requirePlanningActor);
const listAccountsMock = vi.mocked(listAccounts);
const createAccountMock = vi.mocked(createAccount);
const updateAccountMock = vi.mocked(updateAccount);
const resetAccountPasswordMock = vi.mocked(resetAccountPassword);

function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("manager account routes", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "synthetic-auth-secret");
    vi.stubEnv("PLANNING_AUTH_MODE", "database");
    vi.stubEnv("PLANNING_PERSISTENCE", "prisma");
    vi.stubEnv("DATABASE_URL", "postgresql://synthetic:synthetic@localhost/planning");
    requireActorMock.mockResolvedValue({ ok: true, actor });
    listAccountsMock.mockReset();
    createAccountMock.mockReset();
    updateAccountMock.mockReset();
    resetAccountPasswordMock.mockReset();
  });

  it("denies anonymous and viewer access before reading accounts", async () => {
    requireActorMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      code: "unauthorized",
      message: "Přihlaste se.",
    });
    expect((await GET()).status).toBe(401);

    requireActorMock.mockResolvedValueOnce({
      ok: true,
      actor: { ...actor, role: "viewer" },
    });
    expect((await GET()).status).toBe(403);
    expect(listAccountsMock).not.toHaveBeenCalled();
  });

  it("returns account summaries without password hashes", async () => {
    listAccountsMock.mockResolvedValue([summary]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.accounts[0]).toMatchObject({ id: summary.id, email: summary.email });
    expect(JSON.stringify(body)).not.toContain("passwordHash");
  });

  it("validates create bodies and maps duplicate email safely", async () => {
    expect((await POST(jsonRequest("http://localhost/api/accounts", "POST", {}))).status)
      .toBe(400);
    createAccountMock.mockRejectedValue(
      new (await import("@/lib/auth/account-service")).AccountServiceError(
        "email_in_use",
        "Tento e-mail už účet používá.",
      ),
    );
    const response = await POST(jsonRequest("http://localhost/api/accounts", "POST", {
      email: "viewer@example.test",
      name: "Viewer",
      role: "viewer",
      temporaryPassword: "synthetic temporary password",
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "email_in_use" });
  });

  it("creates an account but never returns the temporary password", async () => {
    createAccountMock.mockResolvedValue(summary);
    const response = await POST(jsonRequest("http://localhost/api/accounts", "POST", {
      email: summary.email,
      name: summary.displayName,
      role: summary.role,
      temporaryPassword: "synthetic temporary password",
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.account).toMatchObject({ id: summary.id, mustChangePassword: true });
    expect(JSON.stringify(body)).not.toContain("synthetic temporary password");
    expect(createAccountMock).toHaveBeenCalledWith(
      {
        email: summary.email,
        displayName: summary.displayName,
        role: summary.role,
        temporaryPassword: "synthetic temporary password",
      },
      actor,
      expect.anything(),
    );
  });

  it("updates and resets only after manager authorization", async () => {
    updateAccountMock.mockResolvedValue(summary);
    resetAccountPasswordMock.mockResolvedValue(summary);
    const patchResponse = await PATCH(
      jsonRequest("http://localhost/api/accounts/viewer-db-id", "PATCH", { active: false }),
      { params: Promise.resolve({ id: summary.id }) },
    );
    const resetResponse = await resetPassword(
      jsonRequest("http://localhost/api/accounts/viewer-db-id/reset-password", "POST", {
        temporaryPassword: "replacement synthetic password",
      }),
      { params: Promise.resolve({ id: summary.id }) },
    );

    expect(patchResponse.status).toBe(200);
    expect(resetResponse.status).toBe(200);
    expect(JSON.stringify(await resetResponse.json())).not.toContain("replacement synthetic password");
    expect(updateAccountMock).toHaveBeenCalledWith(summary.id, { active: false }, actor, expect.anything());
    expect(resetAccountPasswordMock).toHaveBeenCalledWith(
      summary.id,
      "replacement synthetic password",
      actor,
      expect.anything(),
    );
  });
});
