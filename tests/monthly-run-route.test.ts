import { beforeEach, describe, expect, it, vi } from "vitest";
import { datesInMonth } from "@/lib/planning/domain/month";

const mocks = vi.hoisted(() => ({ loadBoundary: vi.fn(), loadRosterSnapshot: vi.fn(), create: vi.fn(), execute: vi.fn() }));
vi.mock("@/lib/auth/route-access", () => ({ requirePlanningActor: vi.fn().mockResolvedValue({ ok: true, actor: { userId: "m", role: "manager" } }) }));
vi.mock("@/lib/planning/monthly-runtime", () => ({ getMonthlyRuntime: () => ({ configured: true, mode: "cloudflare", loadBoundary: mocks.loadBoundary, loadRosterSnapshot: mocks.loadRosterSnapshot, create: mocks.create }) }));
vi.mock("@/lib/planning/monthly-planning", () => ({ executeMonthlyPlanning: mocks.execute }));
import { POST } from "@/app/api/planning/monthly/run/route";

const input = { month: "2026-11", employees: [{ id: "e1", displayName: "Test", employmentType: "full_time" }], absences: [], availability: [], staffingRequirements: [], instructions: "" };
const snapshot = { imports: [], days: datesInMonth("2026-11").map((date) => ({ employeeId: "e1", date, status: date < "2026-11-15" ? "off" : "unknown" })) };
const boundary = { before: { complete: false, assignments: [] }, after: { complete: false, assignments: [] } };
const request = (data: unknown) => new Request("http://localhost/api/planning/monthly/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: data }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadBoundary.mockResolvedValue(boundary);
  mocks.loadRosterSnapshot.mockResolvedValue(snapshot);
  mocks.create.mockResolvedValue(undefined);
  mocks.execute.mockResolvedValue({ ok: true, draft: { month: "2026-11", assignments: [], explanations: [], alternatives: [], assumptions: [], instructionsOutcome: "" }, validation: { canConfirm: false } });
});

describe("měsíční plánování se serverovými podklady", () => {
  it("odmítne podklady dodané klientem", async () => {
    const response = await POST(request({ ...input, rosterHistory: snapshot }));
    expect(response.status).toBe(400);
    expect(mocks.loadRosterSnapshot).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("odmítne 201 zaměstnance před načtením podkladů a spuštěním plánovače", async () => {
    const employees = Array.from({ length: 201 }, (_, index) => ({
      id: `e${index + 1}`,
      displayName: `Test ${index + 1}`,
      employmentType: "full_time",
    }));
    const response = await POST(request({ ...input, employees }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      message: "Plán lze připravit nejvýše pro 200 zaměstnanců.",
    });
    expect(mocks.loadBoundary).not.toHaveBeenCalled();
    expect(mocks.loadRosterSnapshot).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});
