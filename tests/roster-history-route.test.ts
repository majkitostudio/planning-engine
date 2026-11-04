import { beforeEach, describe, expect, it, vi } from "vitest";

const manager = { userId: "manager-1", email: "manager@example.test", displayName: "Test Manager", role: "manager" as const };
const mocks = vi.hoisted(() => ({
  access: vi.fn(), findMany: vi.fn(), save: vi.fn(),
  persistence: { configured: true, mode: "prisma" as "memory" | "prisma" },
}));

vi.mock("@/lib/auth/route-access", () => ({ requirePlanningActor: () => mocks.access() }));
vi.mock("@/lib/db", () => ({ prisma: { rosterHistoryImport: { findMany: mocks.findMany } } }));
vi.mock("@/lib/planning/persistence-runtime", () => ({ getPlanningPersistenceRuntime: () => mocks.persistence }));
vi.mock("@/lib/planning/monthly-runtime", () => ({ getMonthlyPersistenceRuntime: () => ({ configured: false, reason: "Návaznost není dostupná." }) }));
vi.mock("@/lib/planning/roster-history-store", () => ({ PrismaRosterHistoryStore: class { save = mocks.save; } }));

import { GET, POST } from "@/app/api/planning/roster-history/route";

const jsonRequest = (body: unknown) => new Request("http://localhost/api/planning/roster-history", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.persistence.configured = true;
  mocks.persistence.mode = "prisma";
  mocks.access.mockResolvedValue({ ok: true, actor: manager });
  mocks.findMany.mockResolvedValue([]);
});

describe("API uložené návaznosti rosteru", () => {
  it("vyžaduje přihlášení pro čtení i uložení", async () => {
    mocks.access.mockResolvedValue({ ok: false, status: 401, message: "Přihlášení je povinné." });
    expect((await GET(new Request("http://localhost/api/planning/roster-history?month=2026-11"))).status).toBe(401);
    expect((await POST(jsonRequest({}))).status).toBe(401);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("umožní čtení viewerovi, ale viewer nemůže uložit import", async () => {
    mocks.access.mockResolvedValue({ ok: true, actor: { ...manager, role: "viewer" } });
    expect((await GET(new Request("http://localhost/api/planning/roster-history?month=2026-11"))).status).toBe(200);
    expect((await POST(jsonRequest({}))).status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("odmítne neplatné období, zaměstnance a neobjektový obsah", async () => {
    expect((await GET(new Request("http://localhost/api/planning/roster-history?month=bad"))).status).toBe(400);
    expect((await GET(new Request("http://localhost/api/planning/roster-history?month=2026-11&employeeIds=e1,e1"))).status).toBe(400);
    const invalidJson = new Request("http://localhost/api/planning/roster-history", { method: "POST", body: "null" });
    expect((await POST(invalidJson)).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("při opětovném otevření vrátí pouze přehled uložených verzí", async () => {
    mocks.findMany.mockResolvedValue([{
      id: "import-1", periodStart: "2026-11-01", periodEnd: "2026-11-30", source: "copied_roster",
      version: 2, createdAt: new Date("2026-11-01T10:00:00Z"),
      employees: [{ employeeId: "e1", _count: { entries: 3 } }],
    }]);
    const response = await GET(new Request("http://localhost/api/planning/roster-history?month=2026-11"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, imports: [{
      id: "import-1", periodStart: "2026-11-01", periodEnd: "2026-11-30", source: "copied_roster",
      version: 2, createdAt: "2026-11-01T10:00:00.000Z", employeeCount: 1, knownDayCount: 3,
    }] });
  });

  it("nepoužije testovací persistenci pro čtení ani zápis", async () => {
    mocks.persistence.mode = "memory";
    expect((await GET(new Request("http://localhost/api/planning/roster-history?month=2026-11"))).status).toBe(503);
    expect((await POST(jsonRequest({}))).status).toBe(503);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("předá obsah pouze aktivnímu manažerovi a vrátí verzi uložení", async () => {
    const payload = { startDate: "2026-11-01", endDate: "2026-11-30", source: "copied_roster", employeeIds: ["e1"], entries: [] };
    mocks.save.mockResolvedValue({ ok: true, duplicate: false, id: "import-1", version: 1 });
    const response = await POST(jsonRequest(payload));
    expect(response.status).toBe(201);
    expect(mocks.save).toHaveBeenCalledWith(manager, payload);
    expect(await response.json()).toMatchObject({ ok: true, version: 1 });
  });

  it("označí opakovaný import jako existující verzi", async () => {
    mocks.save.mockResolvedValue({ ok: true, duplicate: true, id: "import-1", version: 1 });
    const response = await POST(jsonRequest({ startDate: "2026-11-01" }));
    expect(response.status).toBe(200);
    expect((await response.json()).duplicate).toBe(true);
  });
});
