import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { POST as confirmPlanning } from "../app/api/planning/confirm/route";
import { POST as runPlanning } from "../app/api/planning/run/route";
import { planningRunRegistry } from "../lib/planning/run-registry";
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

describe("planning route handlers", () => {
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
    vi.stubEnv("PLANNING_PERSISTENCE", "memory");
    authMock.mockResolvedValue({
      user: {
        id: "entra-manager",
        email: "manager@aaauto.cz",
        name: "Manažer",
        role: "manager",
      },
    });
    planningRunRegistry.clear();
  });

  afterEach(() => {
    planningRunRegistry.clear();
    vi.unstubAllEnvs();
  });

  it("vrátí 503, pokud PLANNING_PROVIDER není nastavený", async () => {
    vi.stubEnv("PLANNING_PROVIDER", "");

    const response = await runPlanning(
      jsonRequest("http://localhost/api/planning/run", {
        scenario: "complete",
        weekStart: SIMULATED_WEEK_START,
      }),
    );
    const body = await responseJson<{
      ok: false;
      rejected: { code: string };
    }>(response);

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ ok: false, rejected: { code: "not_configured" } });
  });

  it("vrátí 400 pro neplatný JSON požadavek", async () => {
    vi.stubEnv("PLANNING_PROVIDER", "simulated");

    const response = await runPlanning(
      new Request("http://localhost/api/planning/run", {
        method: "POST",
        headers: jsonHeaders,
        body: "{",
      }),
    );
    const body = await responseJson<{
      ok: false;
      rejected: { code: string };
    }>(response);

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ ok: false, rejected: { code: "invalid_request" } });
  });

  it("vrátí kompletní simulovaný návrh", async () => {
    vi.stubEnv("PLANNING_PROVIDER", "simulated");

    const response = await runPlanning(
      jsonRequest("http://localhost/api/planning/run", {
        scenario: "complete",
        weekStart: SIMULATED_WEEK_START,
      }),
    );
    const body = await responseJson<{
      ok: true;
      view: {
        scenarioId: string;
        mode: string;
        completeness: string;
        confirmation: { allowed: boolean };
        proposalId: string;
      };
    }>(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      view: {
        scenarioId: "complete",
        mode: "simulated",
        completeness: "complete",
        confirmation: { allowed: true },
      },
    });
    expect(body.view.proposalId).toEqual(expect.any(String));
    expect(body).not.toHaveProperty("snapshot");
  });

  it("částečný návrh vrátí a při potvrzení zůstane blokovaný", async () => {
    vi.stubEnv("PLANNING_PROVIDER", "simulated");

    const runResponse = await runPlanning(
      jsonRequest("http://localhost/api/planning/run", {
        scenario: "partial",
        weekStart: SIMULATED_WEEK_START,
      }),
    );
    const runBody = await responseJson<{
      ok: true;
      view: { proposalId: string; completeness: string; confirmation: { allowed: boolean } };
    }>(runResponse);

    const confirmResponse = await confirmPlanning(
      jsonRequest("http://localhost/api/planning/confirm", {
        proposalId: runBody.view.proposalId,
      }),
    );
    const confirmBody = await responseJson<{
      ok: false;
      rejected: { code: string; blockers: readonly { code: string }[] };
    }>(confirmResponse);

    expect(runBody.view).toMatchObject({
      completeness: "partial",
      confirmation: { allowed: false },
    });
    expect(confirmResponse.status).toBe(409);
    expect(confirmBody).toMatchObject({
      ok: false,
      rejected: { code: "confirmation_blocked" },
    });
    expect(confirmBody.rejected.blockers.map((blocker) => blocker.code)).toContain(
      "partial_blocked_by_oq23",
    );
  });

  it("u neověřeného scénáře ponechá potvrzení zablokované", async () => {
    vi.stubEnv("PLANNING_PROVIDER", "simulated");

    const runResponse = await runPlanning(
      jsonRequest("http://localhost/api/planning/run", {
        scenario: "unverified",
        weekStart: SIMULATED_WEEK_START,
      }),
    );
    const body = await responseJson<{
      ok: true;
      view: {
        scenarioId: string;
        status: string;
        completeness: string;
        confirmation: { allowed: boolean; blockers: readonly { code: string }[] };
      };
    }>(runResponse);

    expect(runResponse.status).toBe(200);
    expect(body.view).toMatchObject({
      scenarioId: "unverified",
      status: "not_verified",
      completeness: "partial",
      confirmation: { allowed: false },
    });
    expect(body.view.confirmation.blockers.map((blocker) => blocker.code)).toContain(
      "run_not_verified",
    );
  });

  it("potvrdí kompletní návrh", async () => {
    vi.stubEnv("PLANNING_PROVIDER", "simulated");

    const runResponse = await runPlanning(
      jsonRequest("http://localhost/api/planning/run", {
        scenario: "complete",
        weekStart: SIMULATED_WEEK_START,
      }),
    );
    const runBody = await responseJson<{ ok: true; view: { proposalId: string } }>(runResponse);

    const confirmResponse = await confirmPlanning(
      jsonRequest("http://localhost/api/planning/confirm", {
        proposalId: runBody.view.proposalId,
      }),
    );
    const confirmBody = await responseJson<{
      ok: true;
      alreadyConfirmed: boolean;
      view: { confirmation: { alreadyConfirmed: boolean } };
    }>(confirmResponse);

    expect(confirmResponse.status).toBe(200);
    expect(confirmBody).toMatchObject({
      ok: true,
      alreadyConfirmed: false,
      view: { confirmation: { alreadyConfirmed: true } },
    });
  });

  it("opakované potvrzení stejného návrhu je idempotentní", async () => {
    vi.stubEnv("PLANNING_PROVIDER", "simulated");

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

  it("vrátí 404 pro neznámé proposalId", async () => {
    const response = await confirmPlanning(
      jsonRequest("http://localhost/api/planning/confirm", {
        proposalId: "plan-neznamy",
      }),
    );
    const body = await responseJson<{
      ok: false;
      rejected: { code: string };
    }>(response);

    expect(response.status).toBe(404);
    expect(body).toMatchObject({ ok: false, rejected: { code: "unknown_proposal" } });
  });
});
