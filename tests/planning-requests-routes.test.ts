import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { InMemoryPlanningPersistence } from "@/lib/planning/persistence";

const mocks = vi.hoisted(() => ({ getRuntime: vi.fn() }));

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/planning/persistence-runtime", () => ({
  getPlanningPersistenceRuntime: mocks.getRuntime,
}));

import { GET, POST } from "../app/api/requests/route";

const authMock = auth as unknown as { mockResolvedValue(value: unknown): void };
const manager = {
  user: { id: "synthetic-manager", email: "manager@example.test", name: "Manager", role: "manager" },
};
const viewer = {
  user: { id: "synthetic-viewer", email: "viewer@example.test", name: "Viewer", role: "viewer" },
};

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("employee request decision API", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "synthetic-test-secret");
    vi.stubEnv("PLANNING_AUTH_MODE", "local");
    vi.stubEnv("PLANNING_LOGIN_EMAIL", "manager@example.test");
    vi.stubEnv("PLANNING_LOGIN_PASSWORD", "synthetic-test-password");
    vi.stubEnv("PLANNING_LOGIN_ROLE", "manager");
    authMock.mockResolvedValue(manager);
    mocks.getRuntime.mockReturnValue({
      configured: true,
      mode: "memory",
      persistence: new InMemoryPlanningPersistence(),
    });
  });

  it("viewer může požadavky zobrazit, ale API mu zakáže rozhodnutí", async () => {
    authMock.mockResolvedValue(viewer);

    const getResponse = await GET();
    const body = await getResponse.json();
    const postResponse = await POST(jsonRequest({
      requestId: "request-e3-2026-10-07",
      decision: "approved",
    }));

    expect(getResponse.status).toBe(200);
    expect(body).toHaveProperty("canDecide", false);
    expect(body.requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "request-e3-2026-10-07",
          status: "pending",
          preview: expect.objectContaining({
            impacts: expect.arrayContaining([
              expect.objectContaining({ missingEmployees: 1 }),
            ]),
          }),
        }),
      ]),
    );
    expect(postResponse.status).toBe(403);
  });

  it("manager uloží schválení i zamítnutí a rozpis se tím nepotvrdí", async () => {
    const persistence = new InMemoryPlanningPersistence();
    mocks.getRuntime.mockReturnValue({ configured: true, mode: "memory", persistence });

    const approved = await POST(jsonRequest({
      requestId: "request-e3-2026-10-07",
      decision: "approved",
    }));
    const approvedBody = await approved.json();
    const reloaded = await GET();
    const reloadedBody = await reloaded.json();
    const rejected = await POST(jsonRequest({
      requestId: "request-e4-2026-10-08",
      decision: "rejected",
    }));

    expect(approved.status).toBe(200);
    expect(approvedBody).toHaveProperty("planApplied", false);
    expect(approvedBody).not.toHaveProperty("confirmedPlan");
    expect(reloadedBody.requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "request-e3-2026-10-07", status: "approved" }),
      ]),
    );
    expect(rejected.status).toBe(200);
  });

  it("odmítne neplatný nebo neznámý požadavek", async () => {
    const invalid = await POST(jsonRequest({ requestId: "request-e3-2026-10-07", decision: "maybe" }));
    const unknown = await POST(jsonRequest({ requestId: "unknown", decision: "approved" }));

    expect(invalid.status).toBe(400);
    expect(unknown.status).toBe(404);
  });
});
