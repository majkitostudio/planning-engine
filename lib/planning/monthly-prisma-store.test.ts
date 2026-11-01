import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/prisma/generated/client";
import { datesInMonth } from "./domain/month";
import { PrismaMonthlyStore } from "./monthly-prisma-store";
import type { PlanningActor } from "../auth/actor";

vi.mock("./monthly-history-service", () => ({ loadMonthlyBoundary: vi.fn().mockResolvedValue({ before: { complete: true, assignments: [] }, after: { complete: true, assignments: [] } }) }));
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

beforeEach(() => { vi.clearAllMocks(); findUnique.mockResolvedValue(row); findFirst.mockResolvedValue(null); updateMany.mockResolvedValue({ count: 1 }); });
afterEach(() => vi.unstubAllEnvs());

describe("databázové potvrzení měsíčního návrhu", () => {
  it("znovu ověří návrh a uloží potvrzení a audit v jedné transakci", async () => {
    const result = await new PrismaMonthlyStore(db).confirm("p", manager, new Date("2026-11-01T00:00:00Z"));
    expect(result).toMatchObject({ ok: true, alreadyConfirmed: false });
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "p", confirmedAt: null } }));
    expect(createAudit).toHaveBeenCalledOnce();
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "Serializable" }));
  });
  it("odmítne viewer bez databázové transakce", async () => {
    const result = await new PrismaMonthlyStore(db).confirm("p", { ...manager, role: "viewer" }, new Date());
    expect(result).toMatchObject({ ok: false, code: "forbidden" });
    expect(db.$transaction).not.toHaveBeenCalled();
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
