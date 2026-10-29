import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { GET, POST } from "../app/api/settings/staffing/route";
import { POST as createReplacement } from "../app/api/planning/replacement/route";
import { getSimulatedReplacementScenario } from "../lib/planning/simulated/replacement-scenarios";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

const authMock = auth as unknown as {
  mockResolvedValue(value: unknown): void;
};

const jsonHeaders = { "Content-Type": "application/json" };

function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: jsonHeaders,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function completeSettings(overrides: Record<string, number> = {}) {
  return Array.from({ length: 7 }, (_, dayOfWeek) =>
    (["morning", "afternoon"] as const).map((shiftKind) => ({
      dayOfWeek,
      shiftKind,
      requiredEmployees: overrides[`${dayOfWeek}|${shiftKind}`] ??
        (shiftKind === "morning" ? 15 : 7),
    })),
  ).flat();
}

describe("staffing settings route handlers", () => {
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
        id: "settings-manager",
        email: "manager@aaauto.cz",
        name: "Manažer",
        role: "manager",
      },
    });
  });

  it("viewer může nastavení načíst, ale nesmí je uložit", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "settings-viewer",
        email: "viewer@aaauto.cz",
        name: "Viewer",
        role: "viewer",
      },
    });

    const getResponse = await GET();
    const postResponse = await POST(
      jsonRequest("http://localhost/api/settings/staffing", "POST", {
        settings: completeSettings(),
      }),
    );

    expect(getResponse.status).toBe(200);
    expect(postResponse.status).toBe(403);
  });

  it("server odmítne záporné, desetinné i neúplné nastavení", async () => {
    const cases = [
      completeSettings({ "0|morning": -1 }),
      completeSettings({ "0|morning": 15.5 }),
      completeSettings().slice(0, -1),
    ];

    for (const settings of cases) {
      const response = await POST(
        jsonRequest("http://localhost/api/settings/staffing", "POST", { settings }),
      );

      expect(response.status).toBe(400);
    }
  });

  it("manager nastavení uloží, znovu načte a použije je při náhradě", async () => {
    const settings = completeSettings({ "1|afternoon": 5 });
    const saveResponse = await POST(
      jsonRequest("http://localhost/api/settings/staffing", "POST", { settings }),
    );
    const readResponse = await GET();
    const readBody = (await readResponse.json()) as {
      settings: typeof settings;
    };

    expect(saveResponse.status).toBe(200);
    expect(readBody.settings).toEqual(settings);

    vi.stubEnv("PLANNING_PROVIDER", "simulated");
    const scenario = getSimulatedReplacementScenario("single-absence");
    if (!scenario) throw new Error("Fixture operativní náhrady chybí.");
    const replacementResponse = await createReplacement(
      jsonRequest("http://localhost/api/planning/replacement", "POST", {
        weekStart: scenario.input.weekStart,
        baseProposalId: scenario.basePlan.proposalId,
        incident: scenario.request.incident,
      }),
    );
    const replacementBody = (await replacementResponse.json()) as {
      result: {
        options: readonly [{ coverage: readonly { date: string; shiftKind: string; requiredEmployees: number }[] }];
      };
    };

    expect(replacementResponse.status).toBe(200);
    expect(replacementBody.result.options[0]?.coverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          date: "2026-10-06",
          shiftKind: "afternoon",
          requiredEmployees: 5,
        }),
      ]),
    );
  });
});
