import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { POST as createReplacement } from "../app/api/planning/replacement/route";
import { POST as confirmReplacement } from "../app/api/planning/replacement/confirm/route";
import { getPlanningPersistenceRuntime } from "../lib/planning/persistence-runtime";
import { getSimulatedReplacementScenario } from "../lib/planning/simulated/replacement-scenarios";

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

function validBody(overrides: Record<string, unknown> = {}) {
  const scenario = getSimulatedReplacementScenario("single-absence");
  if (!scenario) throw new Error("Replacement fixture chybí.");
  return {
    weekStart: scenario.input.weekStart,
    baseProposalId: scenario.basePlan.proposalId,
    incident: scenario.request.incident,
    ...overrides,
  };
}

describe("replacement route handlers", () => {
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
    authMock.mockResolvedValue({
      user: {
        id: "replacement-manager",
        email: "manager@aaauto.cz",
        name: "Manažer",
        role: "manager",
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("odmítne anonymní vytvoření návrhu", async () => {
    authMock.mockResolvedValue(null);

    const response = await createReplacement(
      jsonRequest("http://localhost/api/planning/replacement", validBody()),
    );

    expect(response.status).toBe(401);
  });

  it("viewer nesmí potvrdit operativní náhradu", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "replacement-viewer",
        email: "viewer@aaauto.cz",
        name: "Viewer",
        role: "viewer",
      },
    });

    const response = await confirmReplacement(
      jsonRequest("http://localhost/api/planning/replacement/confirm", {
        replacementId: "replacement-unknown",
        optionId: "option-unknown",
      }),
    );
    const body = await responseJson<{ ok: false; rejected: { code: string } }>(response);

    expect(response.status).toBe(403);
    expect(body.rejected.code).toBe("forbidden");
  });

  it("odmítne neplatný incident a zastaralý základ", async () => {
    const invalidIncident = await createReplacement(
      jsonRequest(
        "http://localhost/api/planning/replacement",
        validBody({
          incident: {
            ...validBody().incident,
            date: "2026-10-12",
          },
        }),
      ),
    );
    const invalidBody = await responseJson<{ ok: false; rejected: { code: string } }>(
      invalidIncident,
    );
    expect(invalidIncident.status).toBe(400);
    expect(invalidBody.rejected.code).toBe("invalid_request");

    const stale = await createReplacement(
      jsonRequest(
        "http://localhost/api/planning/replacement",
        validBody({ baseProposalId: "stale-base" }),
      ),
    );
    const staleBody = await responseJson<{ ok: false; rejected: { code: string } }>(stale);
    expect(stale.status).toBe(409);
    expect(staleBody.rejected.code).toBe("base_version_mismatch");
  });

  it("vrátí 503 při chybějícím provideru nebo persistence", async () => {
    vi.stubEnv("PLANNING_PROVIDER", "");
    const providerResponse = await createReplacement(
      jsonRequest("http://localhost/api/planning/replacement", validBody()),
    );
    expect(providerResponse.status).toBe(503);

    vi.stubEnv("PLANNING_PROVIDER", "simulated");
    vi.stubEnv("PLANNING_PERSISTENCE", "");
    const persistenceResponse = await createReplacement(
      jsonRequest("http://localhost/api/planning/replacement", validBody()),
    );
    expect(persistenceResponse.status).toBe(503);
  });

  it("uloží pouze pracovní snapshot a před potvrzením nezmění základ", async () => {
    const response = await createReplacement(
      jsonRequest("http://localhost/api/planning/replacement", validBody()),
    );
    const body = await responseJson<{
      ok: true;
      replacementId: string;
      result: { basePlan: { assignments: readonly unknown[] } };
    }>(response);
    const runtime = getPlanningPersistenceRuntime();
    if (!runtime.configured) throw new Error("Test persistence není nakonfigurovaná.");
    const snapshot = await runtime.persistence.getReplacementRun(body.replacementId);

    expect(response.status).toBe(200);
    expect(snapshot?.confirmedPlan).toBeNull();
    expect(snapshot?.basePlan.assignments).toHaveLength(31);
    expect(body.result.basePlan.assignments).toHaveLength(31);
  });

  it("potvrdí vybranou validní variantu a opakování je idempotentní", async () => {
    const createResponse = await createReplacement(
      jsonRequest("http://localhost/api/planning/replacement", validBody()),
    );
    const created = await responseJson<{
      ok: true;
      replacementId: string;
      result: { options: readonly { id: string; validation: { status: string } }[] };
    }>(createResponse);
    const option = created.result.options.find(
      (candidate) => candidate.validation.status === "valid",
    );
    if (!option) throw new Error("Fixture nemá validní variantu.");

    const makeConfirmRequest = () =>
      confirmReplacement(
        jsonRequest("http://localhost/api/planning/replacement/confirm", {
          replacementId: created.replacementId,
          optionId: option.id,
        }),
      );
    const first = await makeConfirmRequest();
    const firstBody = await responseJson<{
      ok: true;
      alreadyConfirmed: boolean;
      confirmedPlan: unknown;
    }>(first);
    const second = await makeConfirmRequest();
    const secondBody = await responseJson<{
      ok: true;
      alreadyConfirmed: boolean;
      confirmedPlan: unknown;
    }>(second);

    expect(first.status).toBe(200);
    expect(firstBody.alreadyConfirmed).toBe(false);
    expect(second.status).toBe(200);
    expect(secondBody.alreadyConfirmed).toBe(true);
    expect(secondBody.confirmedPlan).toEqual(firstBody.confirmedPlan);
  });

  it("zablokuje potvrzení neplatné varianty", async () => {
    const createResponse = await createReplacement(
      jsonRequest("http://localhost/api/planning/replacement", validBody()),
    );
    const created = await responseJson<{
      ok: true;
      replacementId: string;
      result: { options: readonly { id: string }[] };
    }>(createResponse);
    const invalidOption = created.result.options[2];
    if (!invalidOption) throw new Error("Fixture nemá neplatnou variantu.");

    const response = await confirmReplacement(
      jsonRequest("http://localhost/api/planning/replacement/confirm", {
        replacementId: created.replacementId,
        optionId: invalidOption.id,
      }),
    );
    const body = await responseJson<{
      ok: false;
      rejected: { code: string; blockers: readonly { code: string }[] };
    }>(response);

    expect(response.status).toBe(409);
    expect(body.rejected.blockers.map((blocker) => blocker.code)).toContain(
      "replacement_needs_changes",
    );
  });
});
