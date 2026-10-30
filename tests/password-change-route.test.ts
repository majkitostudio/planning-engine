import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { AccountServiceError, changeAccountPassword } from "@/lib/auth/account-service";
import { POST } from "../app/api/auth/change-password/route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/auth/account-service", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/auth/account-service")>(),
  changeAccountPassword: vi.fn(),
}));

const authMock = auth as unknown as {
  mockResolvedValue(value: unknown): void;
};
const changePasswordMock = vi.mocked(changeAccountPassword);

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/change-password", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "synthetic-auth-secret");
    vi.stubEnv("PLANNING_AUTH_MODE", "database");
    vi.stubEnv("PLANNING_PERSISTENCE", "prisma");
    vi.stubEnv("DATABASE_URL", "postgresql://synthetic:synthetic@localhost/planning");
    authMock.mockResolvedValue({
      user: {
        id: "database-account-1",
        email: "manager@example.test",
        role: "manager",
        mustChangePassword: true,
      },
    });
    changePasswordMock.mockClear();
  });

  it("does not change the password when the current password is wrong", async () => {
    changePasswordMock.mockRejectedValue(
      new AccountServiceError("invalid_credentials", "wrong"),
    );

    const response = await POST(request({
      currentPassword: "wrong synthetic password",
      newPassword: "new synthetic password",
    }));

    expect(response.status).toBe(400);
    expect(changePasswordMock).toHaveBeenCalledWith(
      "database-account-1",
      "wrong synthetic password",
      "new synthetic password",
      expect.anything(),
    );
  });

  it("rejects reusing the current password with a client error", async () => {
    changePasswordMock.mockRejectedValue(
      new AccountServiceError("password_unchanged", "same password"),
    );

    const response = await POST(request({
      currentPassword: "temporary synthetic password",
      newPassword: "temporary synthetic password",
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "password_unchanged" });
  });

  it("returns a conflict when an account changed during the password update", async () => {
    changePasswordMock.mockRejectedValue(
      new AccountServiceError("account_changed", "account changed"),
    );

    const response = await POST(request({
      currentPassword: "temporary synthetic password",
      newPassword: "new synthetic password",
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "account_changed" });
  });

  it("rejects new passwords outside the confirmed length bounds", async () => {
    for (const newPassword of ["short", "x".repeat(129)]) {
      const response = await POST(request({
        currentPassword: "temporary synthetic password",
        newPassword,
      }));
      expect(response.status).toBe(400);
    }
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it("changes only the authenticated account after valid input", async () => {
    changePasswordMock.mockResolvedValue(undefined);

    const response = await POST(request({
      currentPassword: "temporary synthetic password",
      newPassword: "new synthetic password",
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(changePasswordMock).toHaveBeenCalledWith(
      "database-account-1",
      "temporary synthetic password",
      "new synthetic password",
      expect.anything(),
    );
  });

  it("requires an authenticated account", async () => {
    authMock.mockResolvedValue(null);
    const response = await POST(request({
      currentPassword: "temporary synthetic password",
      newPassword: "new synthetic password",
    }));
    expect(response.status).toBe(401);
    expect(changePasswordMock).not.toHaveBeenCalled();
  });
});
