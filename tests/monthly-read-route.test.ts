import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getConfirmed: vi.fn(), loadBoundary: vi.fn(), validate: vi.fn() }));
vi.mock("@/lib/auth/route-access", () => ({ requirePlanningActor: vi.fn().mockResolvedValue({ ok: true, actor: { userId: "m", role: "manager" } }) }));
vi.mock("@/lib/planning/monthly-runtime", () => ({ getMonthlyPersistenceRuntime: () => ({ configured: true, getConfirmed: mocks.getConfirmed, loadBoundary: mocks.loadBoundary }) }));
vi.mock("@/lib/planning/monthly-planning", () => ({ validateMonthlyDraft: mocks.validate }));
import { GET } from "@/app/api/planning/monthly/route";

describe("načtení potvrzeného měsíce", () => {
  it("kontroluje potvrzený částečný rozpis s uloženými pevnými podklady", async () => {
    const rosterHistory = { imports: [], days: [] };
    const input = { month: "2026-11", employees: [{ id: "e1" }], planningRange: { startDate: "2026-11-15", endDate: "2026-11-30" }, rosterHistory };
    const draft = { month: "2026-11", assignments: [] };
    const boundary = { before: { complete: true, assignments: [] }, after: { complete: true, assignments: [] } };
    mocks.getConfirmed.mockResolvedValue({ ok: true, run: { id: "p", input, draft, mode: "ortools" } });
    mocks.loadBoundary.mockResolvedValue(boundary);
    mocks.validate.mockReturnValue({ canConfirm: false });
    const response = await GET(new Request("http://localhost/api/planning/monthly?month=2026-11"));
    expect(response.status).toBe(200);
    expect(mocks.validate).toHaveBeenCalledWith(input, draft, boundary, "ortools", rosterHistory);
  });
});
