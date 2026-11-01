import { beforeEach, describe, expect, it, vi } from "vitest";

const { access, findMany, create, updateMany } = vi.hoisted(() => ({ access: vi.fn(), findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() }));
vi.mock("@/lib/auth/route-access", () => ({ requirePlanningActor: () => access() }));
vi.mock("@/lib/db", () => ({ prisma: { planningEmployee: { findMany, create, updateMany } } }));
vi.mock("@/lib/planning/persistence-runtime", () => ({ getPlanningPersistenceRuntime: () => ({ configured: true, mode: "prisma" }) }));
import { GET, POST, PATCH } from "@/app/api/employees/route";

const request = (method: string, body: unknown) => new Request("http://localhost/api/employees", { method, body: JSON.stringify(body), headers: { "content-Type": "application/json" } });
beforeEach(() => { vi.clearAllMocks(); access.mockResolvedValue({ ok: true, actor: { userId: "m", role: "manager" } }); });
describe("správa zaměstnanců", () => {
  it("načte aktivní zaměstnance i pro uživatele s právem prohlížet", async () => {
    access.mockResolvedValue({ ok: true, actor: { userId: "v", role: "viewer" } });
    findMany.mockResolvedValue([{ id: "e1", displayName: "Test" }]);
    expect(await (await GET()).json()).toEqual({ ok: true, employees: [{ id: "e1", displayName: "Test" }] });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { active: true } }));
  });
  it("úplný seznam včetně odebraných zpřístupní pouze manažerovi", async () => {
    const all = new Request("http://localhost/api/employees?all=1");
    access.mockResolvedValueOnce({ ok: true, actor: { userId: "v", role: "viewer" } });
    expect((await GET(all)).status).toBe(403);
    findMany.mockResolvedValue([]);
    expect((await GET(all)).status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });
  it("povolí přidat zaměstnance jen manažerovi a odmítne prázdné jméno", async () => {
    access.mockResolvedValueOnce({ ok: true, actor: { userId: "v", role: "viewer" } });
    expect((await POST(request("POST", { displayName: "Test" }))).status).toBe(403);
    expect((await POST(request("POST", { displayName: "  " }))).status).toBe(400);
    create.mockResolvedValue({ id: "e1", displayName: "Test" });
    expect((await POST(request("POST", { displayName: " Test " }))).status).toBe(201);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: { displayName: "Test" } }));
  });
  it("odebere zaměstnance z výběru bez smazání historie", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    expect((await PATCH(request("PATCH", { id: "e1" }))).status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({ where: { id: "e1", active: true }, data: { active: false } });
  });
  it("nepovolí odebrání uživateli bez role manažera", async () => {
    access.mockResolvedValue({ ok: true, actor: { userId: "v", role: "viewer" } });
    expect((await PATCH(request("PATCH", { id: "e1" }))).status).toBe(403);
    expect(updateMany).not.toHaveBeenCalled();
  });
  it("umožní znovu zařadit odebraného zaměstnance se stejnou identitou", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    expect((await PATCH(request("PATCH", { id: "e1", active: true }))).status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({ where: { id: "e1", active: false }, data: { active: true } });
  });
});
