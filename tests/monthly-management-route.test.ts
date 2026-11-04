import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ actor: vi.fn(), list: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/auth/route-access", () => ({ requirePlanningActor: mocks.actor }));
vi.mock("@/lib/planning/monthly-runtime", () => ({ getMonthlyPersistenceRuntime: () => ({ configured: true, list: mocks.list, remove: mocks.remove }) }));
import { GET, DELETE } from "@/app/api/planning/monthly/manage/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.actor.mockResolvedValue({ ok: true, actor: { userId: "m", role: "manager" } });
});

it("vrátí rozpisy pro vybraný měsíc", async () => {
  mocks.list.mockResolvedValue([{ id: "p", month: "2026-11", confirmed: false }]);
  const response = await GET(new Request("http://localhost/api/planning/monthly/manage?month=2026-11"));
  expect(await response.json()).toEqual({ ok: true, runs: [{ id: "p", month: "2026-11", confirmed: false }] });
});

it("nedovolí čtenáři odstranit rozpis", async () => {
  mocks.actor.mockResolvedValue({ ok: true, actor: { userId: "v", role: "viewer" } });
  const response = await DELETE(new Request("http://localhost/api/planning/monthly/manage", { method: "DELETE", body: JSON.stringify({ id: "p", confirmed: false }) }));
  expect(response.status).toBe(403);
  expect(mocks.remove).not.toHaveBeenCalled();
});

it("čtenáři nezpřístupní seznam rozpracovaných návrhů", async () => {
  mocks.actor.mockResolvedValue({ ok: true, actor: { userId: "v", role: "viewer" } });
  const response = await GET(new Request("http://localhost/api/planning/monthly/manage?month=2026-11"));
  expect(response.status).toBe(403);
  expect(mocks.list).not.toHaveBeenCalled();
});

it("manažer odstraní přesně vybraný rozpis", async () => {
  mocks.remove.mockResolvedValue({ ok: true });
  const response = await DELETE(new Request("http://localhost/api/planning/monthly/manage", { method: "DELETE", body: JSON.stringify({ id: "p", confirmed: false }) }));
  expect(response.status).toBe(200);
  expect(mocks.remove).toHaveBeenCalledWith("p", expect.objectContaining({ userId: "m" }), false);
});

it("změněný stav rozpisu vrátí jako konflikt", async () => {
  mocks.remove.mockResolvedValue({ ok: false, code: "changed" });
  const response = await DELETE(new Request("http://localhost/api/planning/monthly/manage", { method: "DELETE", body: JSON.stringify({ id: "p", confirmed: false }) }));
  expect(response.status).toBe(409);
});

it("odmítne odstranění bez očekávaného stavu rozpisu", async () => {
  const response = await DELETE(new Request("http://localhost/api/planning/monthly/manage", { method: "DELETE", body: JSON.stringify({ id: "p" }) }));
  expect(response.status).toBe(400);
  expect(mocks.remove).not.toHaveBeenCalled();
});
