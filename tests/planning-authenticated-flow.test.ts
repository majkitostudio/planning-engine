import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { POST as confirmPlanning } from "../app/api/planning/confirm/route";
import { POST as runPlanning } from "../app/api/planning/run/route";
import { SIMULATED_WEEK_START } from "../lib/planning/simulated/scenarios";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

const authMock = auth as unknown as {
  mockResolvedValue(value: unknown): void;
};
const jsonHeaders = { "Content-Type": "application/json" };

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
}

async function responseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

const managerSession = {
  user: {
    id: "entra-manager",
    email: "manager@aaauto.cz",
    name: "Manažer",
    role: "manager" as const,
  },
};

const viewerSession = {
  user: {
    id: "entra-viewer",
    email: "viewer@aaauto.cz",
    name: "Viewer",
    role: "viewer" as const,
  },
};

describe("authenticated planning flow", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-auth-secret");
    vi.stubEnv("AUTH_MICROSOFT_ENTRA_ID_ID", "test-client-id");
    vi.stubEnv("AUTH_MICROSOFT_ENTRA_ID_SECRET", "test-client-secret");
    vi.stubEnv(
      "AUTH_MICROSOFT_ENTRA_ID_ISSUER",
      "https://login.microsoftonline.com/test-tenant/v2.0",
    );
    vi.stubEnv("PLANNING_AUTH_MODE", "local");
    vi.stubEnv("PLANNING_LOGIN_EMAIL", "manager@aaauto.cz");
    vi.stubEnv("PLANNING_LOGIN_PASSWORD", "test-password");
    vi.stubEnv("PLANNING_LOGIN_ROLE", "manager");
    vi.stubEnv("PLANNING_PROVIDER", "simulated");
    vi.stubEnv("PLANNING_PERSISTENCE", "memory");
    authMock.mockResolvedValue(managerSession);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("anonymní požadavek nedostane plánovací výsledek", async () => {
    authMock.mockResolvedValue(null);

    const response = await runPlanning(
      jsonRequest("http://localhost/api/planning/run", {
        scenario: "complete",
        weekStart: SIMULATED_WEEK_START,
      }),
    );
    const body = await responseJson<{ ok: false; rejected: { code: string } }>(response);

    expect(response.status).toBe(401);
    expect(body).toMatchObject({ ok: false, rejected: { code: "unauthorized" } });
  });

  it("účet s dočasným heslem nesmí přímo použít plánovací API", async () => {
    authMock.mockResolvedValue({
      ...managerSession,
      user: { ...managerSession.user, mustChangePassword: true },
    });

    const response = await runPlanning(
      jsonRequest("http://localhost/api/planning/run", {
        scenario: "complete",
        weekStart: SIMULATED_WEEK_START,
      }),
    );
    const body = await responseJson<{ ok: false; rejected: { code: string } }>(response);

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      ok: false,
      rejected: { code: "password_change_required" },
    });
  });

  it("viewer nesmí spustit ani potvrdit týdenní návrh", async () => {
    authMock.mockResolvedValue(viewerSession);

    const runResponse = await runPlanning(
      jsonRequest("http://localhost/api/planning/run", {
        scenario: "complete",
        weekStart: SIMULATED_WEEK_START,
      }),
    );
    const runBody = await responseJson<{ ok: false; rejected: { code: string } }>(runResponse);
    const confirmResponse = await confirmPlanning(
      jsonRequest("http://localhost/api/planning/confirm", {
        proposalId: "viewer-cannot-create-this-proposal",
      }),
    );
    const confirmBody = await responseJson<{ ok: false; rejected: { code: string } }>(
      confirmResponse,
    );

    expect(runResponse.status).toBe(403);
    expect(runBody).toMatchObject({ ok: false, rejected: { code: "forbidden" } });
    expect(confirmResponse.status).toBe(403);
    expect(confirmBody).toMatchObject({ ok: false, rejected: { code: "forbidden" } });
  });

  it("manager potvrdí uložený návrh a opakování je idempotentní", async () => {
    const runResponse = await runPlanning(
      jsonRequest("http://localhost/api/planning/run", {
        scenario: "complete",
        weekStart: SIMULATED_WEEK_START,
      }),
    );
    const runBody = await responseJson<{ ok: true; view: { proposalId: string } }>(runResponse);
    const request = () =>
      confirmPlanning(
        jsonRequest("http://localhost/api/planning/confirm", {
          proposalId: runBody.view.proposalId,
        }),
      );

    const firstResponse = await request();
    const firstBody = await responseJson<{
      ok: true;
      alreadyConfirmed: boolean;
      view: { confirmation: { confirmedPlan: unknown } };
    }>(firstResponse);
    const secondResponse = await request();
    const secondBody = await responseJson<{
      ok: true;
      alreadyConfirmed: boolean;
      view: { confirmation: { confirmedPlan: unknown } };
    }>(secondResponse);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(firstBody.alreadyConfirmed).toBe(false);
    expect(secondBody.alreadyConfirmed).toBe(true);
    expect(secondBody.view.confirmation.confirmedPlan).toEqual(
      firstBody.view.confirmation.confirmedPlan,
    );
  });
});
