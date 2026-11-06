import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/prisma/generated/client";
import { datesInMonth } from "./domain/month";
import { PrismaMonthlyStore } from "./monthly-prisma-store";
import { loadMonthlyRosterSnapshot } from "./monthly-history-service";
import type { PlanningActor } from "../auth/actor";

vi.mock("./monthly-history-service", () => ({ loadMonthlyBoundary: vi.fn().mockResolvedValue({ before: { complete: true, assignments: [] }, after: { complete: true, assignments: [] } }), loadMonthlyRosterSnapshot: vi.fn() }));
vi.mock("./persistence", () => ({ ensurePlanningActorRecord: vi.fn().mockResolvedValue({ id: "m" }) }));

const input = { month: "2026-11", employees: [{ id: "e1", displayName: "Test", employmentType: "full_time" }], absences: [], availability: [], instructions: "", staffingRequirements: datesInMonth("2026-11").flatMap((date) => ["morning", "afternoon"].map((shiftKind) => ({ date, shiftKind, requiredEmployees: 0 }))) };
const draft = { month: "2026-11", assignments: [], explanations: [], alternatives: [], assumptions: [], instructionsOutcome: "" };
const row = { id: "p", month: input.month, input, draft, mode: "simulated", providerName: "simulated", confirmedAt: null, confirmedById: null };
const manager: PlanningActor = { userId: "m", email: "m@example.test", displayName: "Test", role: "manager" };
const updateMany = vi.fn();
const createAudit = vi.fn();
const findUnique = vi.fn();
const findFirst = vi.fn();
const findMany = vi.fn();
const accountFindUnique = vi.fn();
const tx = { monthlyPlanningRun: { findUnique, findFirst, updateMany }, appUser: { findUnique: accountFindUnique }, auditEvent: { create: createAudit } };
const db = { $transaction: vi.fn((callback) => callback(tx)) } as unknown as PrismaClient;

it("vrátí potvrzený měsíc i po novém načtení", async () => {
  const reader = { monthlyPlanningRun: { findMany } } as unknown as PrismaClient;
  findMany.mockResolvedValue([{ ...row, confirmedAt: new Date("2026-11-01T00:00:00Z"), confirmedById: "m" }]);
  expect(await new PrismaMonthlyStore(reader).getConfirmed("2026-11")).toMatchObject({ ok: true, run: { id: "p", confirmed: { by: "m" } } });
});

it("načte uložený OR-Tools návrh jako starší režim", async () => {
  findUnique.mockResolvedValue({ ...row, mode: "ortools", providerName: "ortools" });
  const reader = { monthlyPlanningRun: { findUnique } } as unknown as PrismaClient;
  expect(await new PrismaMonthlyStore(reader).get("p")).toMatchObject({ mode: "ortools", providerName: "ortools" });
});

it("načte uložený Cloudflare návrh; režim nesmí být považován za neznámý", async () => {
  findUnique.mockResolvedValue({ ...row, mode: "cloudflare", providerName: "cloudflare" });
  const reader = { monthlyPlanningRun: { findUnique } } as unknown as PrismaClient;
  expect(await new PrismaMonthlyStore(reader).get("p")).toMatchObject({ mode: "cloudflare", providerName: "cloudflare" });
});

it("načte starší uložený návrh s prázdným ID alternativy", async () => {
  const legacy = { ...row, draft: { ...draft, alternatives: [{ id: "", summary: "Starší alternativa", impact: "Dopad", assignments: [] }] } };
  findUnique.mockResolvedValue(legacy);
  findMany.mockResolvedValue([{ ...legacy, confirmedAt: new Date("2026-11-01T00:00:00Z"), confirmedById: "m" }]);
  const reader = { monthlyPlanningRun: { findUnique, findMany } } as unknown as PrismaClient;
  const store = new PrismaMonthlyStore(reader);
  expect(await store.get("p")).toMatchObject({ id: "p" });
  expect(await store.getConfirmed("2026-11")).toMatchObject({ ok: true, run: { id: "p" } });
});

beforeEach(() => { vi.clearAllMocks(); findUnique.mockResolvedValue(row); findFirst.mockResolvedValue(null); updateMany.mockResolvedValue({ count: 1 }); });
afterEach(() => vi.unstubAllEnvs());

describe("databázové potvrzení měsíčního návrhu", () => {
  it("odstranění zaznamená ve stejné transakci jako audit", async () => {
    const result = await new PrismaMonthlyStore(db).remove("p", manager, new Date("2026-11-02T00:00:00Z"), false);
    expect(result).toEqual({ ok: true });
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "p", deletedAt: null, confirmedAt: null } }));
    expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "planning.removed", entityId: "p" }) }));
  });
  it("potvrdí úplný částečný návrh jen se shodnými aktuálními podklady", async () => {
    const snapshot = { imports: [], days: datesInMonth("2026-11").map((date) => ({ employeeId: "e1", date, status: date < "2026-11-15" ? "off" as const : "unknown" as const })) };
    const partialInput = { ...input, planningRange: { startDate: "2026-11-15", endDate: "2026-11-30" }, rosterHistory: snapshot };
    findUnique.mockResolvedValue({ ...row, mode: "ortools", providerName: "ortools", input: partialInput });
    vi.mocked(loadMonthlyRosterSnapshot).mockResolvedValue(snapshot);
    const result = await new PrismaMonthlyStore(db).confirm("p", manager, new Date());
    expect(result).toMatchObject({ ok: true, alreadyConfirmed: false, run: { input: { rosterHistory: snapshot } } });
    expect(updateMany).toHaveBeenCalledOnce();
    expect(createAudit).toHaveBeenCalledOnce();
  });
  it("před potvrzením znovu načte roster v transakci a zablokuje změněné podklady", async () => {
    const snapshot = { imports: [{ id: "i1", version: 1, fingerprint: "a".repeat(64) }], days: datesInMonth("2026-11").map((date) => ({ employeeId: "e1", date, status: date < "2026-11-15" ? "off" : "unknown" })) };
    const partialInput = { ...input, planningRange: { startDate: "2026-11-15", endDate: "2026-11-30" }, rosterHistory: snapshot };
    findUnique.mockResolvedValue({ ...row, mode: "ortools", providerName: "ortools", input: partialInput });
    vi.mocked(loadMonthlyRosterSnapshot).mockResolvedValue({ ...snapshot, imports: [{ id: "i2", version: 2, fingerprint: "b".repeat(64) }] } as never);

    const result = await new PrismaMonthlyStore(db).confirm("p", manager, new Date());
    expect(loadMonthlyRosterSnapshot).toHaveBeenCalledWith("2026-11", ["e1"], tx);
    expect(result).toMatchObject({ ok: false, code: "confirmation_blocked", validation: { unverified: expect.arrayContaining([expect.objectContaining({ code: "ROSTER_HISTORY_CHANGED" })]) } });
    expect(updateMany).not.toHaveBeenCalled();
  });
  it("znovu ověří návrh a uloží potvrzení a audit v jedné transakci", async () => {
    const result = await new PrismaMonthlyStore(db).confirm("p", manager, new Date("2026-11-01T00:00:00Z"));
    expect(result).toMatchObject({ ok: true, alreadyConfirmed: false });
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "p", confirmedAt: null, deletedAt: null } }));
    expect(createAudit).toHaveBeenCalledOnce();
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "Serializable" }));
  });
  it("odmítne viewer bez databázové transakce", async () => {
    const result = await new PrismaMonthlyStore(db).confirm("p", { ...manager, role: "viewer" }, new Date());
    expect(result).toMatchObject({ ok: false, code: "forbidden" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("nedovolí znovu potvrdit odstraněný návrh", async () => {
    findUnique.mockResolvedValue({ ...row, deletedAt: new Date("2026-11-02T00:00:00Z") });
    expect(await new PrismaMonthlyStore(db).confirm("p", manager, new Date())).toEqual({ ok: false, code: "not_found" });
    expect(updateMany).not.toHaveBeenCalled();
  });
  it("odmítne potvrzení při již potvrzeném jiném návrhu stejného měsíce", async () => {
    findFirst.mockResolvedValue({ id: "other" });
    const result = await new PrismaMonthlyStore(db).confirm("p", manager, new Date());
    expect(result).toMatchObject({ ok: false, code: "month_conflict" });
    expect(updateMany).not.toHaveBeenCalled();
  });
  it("nepřidá druhý audit při souběžném potvrzení", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    findUnique.mockResolvedValueOnce(row).mockResolvedValueOnce({ ...row, confirmedAt: new Date("2026-11-01T00:00:00Z"), confirmedById: "m" });
    const result = await new PrismaMonthlyStore(db).confirm("p", manager, new Date());
    expect(result).toMatchObject({ ok: true, alreadyConfirmed: true });
    expect(createAudit).not.toHaveBeenCalled();
  });
  it("při serializačním konfliktu transakci bezpečně zopakuje", async () => {
    vi.mocked(db.$transaction).mockRejectedValueOnce({ code: "P2034" });
    const result = await new PrismaMonthlyStore(db).confirm("p", manager, new Date());
    expect(result).toMatchObject({ ok: true, alreadyConfirmed: false });
    expect(db.$transaction).toHaveBeenCalledTimes(2);
    expect(createAudit).toHaveBeenCalledOnce();
  });
  it.each([
    { active: false, role: "manager", mustChangePassword: false, passwordHash: "hash" },
    { active: true, role: "viewer", mustChangePassword: false, passwordHash: "hash" },
    { active: true, role: "manager", mustChangePassword: true, passwordHash: "hash" },
    null,
  ])("v databázovém režimu odmítne účet, který už nemá právo potvrdit", async (account) => {
    vi.stubEnv("PLANNING_AUTH_MODE", "database");
    accountFindUnique.mockResolvedValue(account);
    const result = await new PrismaMonthlyStore(db).confirm("p", manager, new Date());
    expect(result).toMatchObject({ ok: false, code: "forbidden" });
    expect(updateMany).not.toHaveBeenCalled();
    expect(createAudit).not.toHaveBeenCalled();
  });
});
