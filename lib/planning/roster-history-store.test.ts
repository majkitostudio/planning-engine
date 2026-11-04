import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/prisma/generated/client";
import { resolveRosterHistoryDay, PrismaRosterHistoryStore, validateRosterHistoryImport } from "./roster-history-store";
import type { PlanningActor } from "../auth/actor";

vi.mock("./persistence", () => ({ ensurePlanningActorRecord: vi.fn().mockResolvedValue({ id: "manager-db-id" }) }));

const base = {
  startDate: "2026-11-01",
  endDate: "2026-11-03",
  source: "copied_roster",
  employeeIds: ["e1"],
  entries: [
    { employeeId: "e1", date: "2026-11-01", status: "off" },
    { employeeId: "e1", date: "2026-11-03", status: "shift", startTime: "08:05", endTime: "16:45" },
  ],
};

const actor: PlanningActor = { userId: "manager-1", email: "manager@example.test", displayName: "Test Manager", role: "manager" };
const createImport = vi.fn();
const createImportEmployees = vi.fn().mockResolvedValue({ count: 1 });
const createEntries = vi.fn().mockResolvedValue({ count: 2 });
const findByFingerprint = vi.fn();
const latestInScope = vi.fn();
const accountFindUnique = vi.fn();
const tx = {
  rosterHistoryImport: { create: createImport, findUnique: findByFingerprint, findFirst: latestInScope },
  rosterHistoryImportEmployee: { createMany: createImportEmployees },
  rosterHistoryEntry: { createMany: createEntries },
  appUser: { findUnique: accountFindUnique },
};
const db = { $transaction: vi.fn((callback) => callback(tx)) } as unknown as PrismaClient;

beforeEach(() => {
  vi.clearAllMocks();
  findByFingerprint.mockResolvedValue(null);
  latestInScope.mockResolvedValue(null);
  createImportEmployees.mockResolvedValue({ count: 1 });
  createEntries.mockResolvedValue({ count: 2 });
  createImport.mockImplementation(async ({ data }) => ({ id: data.id, version: data.version }));
});
afterEach(() => vi.unstubAllEnvs());

describe("uložené podklady návaznosti", () => {
  it("rozlišuje výslovné volno, přesný čas směny a chybějící neznámý den", () => {
    const result = validateRosterHistoryImport(base);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(resolveRosterHistoryDay("e1", "2026-11-01", [result.value])).toMatchObject({ status: "off" });
    expect(resolveRosterHistoryDay("e1", "2026-11-02", [result.value])).toMatchObject({ status: "unknown" });
    expect(resolveRosterHistoryDay("e1", "2026-11-03", [result.value])).toMatchObject({
      status: "shift", startTime: "08:05", endTime: "16:45",
    });
  });

  it("odmítá duplicitní nebo rozporný záznam ve stejném importu", () => {
    const result = validateRosterHistoryImport({
      ...base,
      entries: [base.entries[0], base.entries[0]],
    });
    expect(result).toMatchObject({ ok: false, code: "duplicate_entry" });
  });

  it("nepřijímá den mimo období ani neúplný interval směny", () => {
    expect(validateRosterHistoryImport({
      ...base,
      entries: [{ employeeId: "e1", date: "2026-11-04", status: "off" }],
    })).toMatchObject({ ok: false, code: "entry_outside_period" });
    expect(validateRosterHistoryImport({
      ...base,
      entries: [{ employeeId: "e1", date: "2026-11-02", status: "shift", startTime: "08:00" }],
    })).toMatchObject({ ok: false, code: "invalid_shift_time" });
  });

  it("stejný překryv považuje za jednu známou skutečnost, rozdílné záznamy za konflikt", () => {
    const first = validateRosterHistoryImport({
      ...base,
      entries: [{ employeeId: "e1", date: "2026-11-01", status: "shift", startTime: "07:45", endTime: "16:30" }],
    });
    const repeated = validateRosterHistoryImport({
      ...base,
      source: "manual",
      entries: [{ employeeId: "e1", date: "2026-11-01", status: "shift", startTime: "07:45", endTime: "16:30" }],
    });
    const conflicting = validateRosterHistoryImport({
      ...base,
      source: "manual",
      entries: [{ employeeId: "e1", date: "2026-11-01", status: "off" }],
    });
    expect(first.ok && repeated.ok && conflicting.ok).toBe(true);
    if (!first.ok || !repeated.ok || !conflicting.ok) return;

    expect(resolveRosterHistoryDay("e1", "2026-11-01", [first.value, repeated.value])).toMatchObject({ status: "shift" });
    expect(resolveRosterHistoryDay("e1", "2026-11-01", [first.value, conflicting.value])).toMatchObject({ status: "conflict" });
  });

  it("uloží podklady jako novou auditovatelnou verzi a při opakování vrátí původní import", async () => {
    const store = new PrismaRosterHistoryStore(db);

    const saved = await store.save(actor, base);

    expect(saved).toMatchObject({ ok: true, version: 1, duplicate: false });
    expect(createImport).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      source: "copied_roster", periodStart: base.startDate, periodEnd: base.endDate, createdById: "manager-db-id",
    }) }));
    expect(createImportEmployees).toHaveBeenCalledWith({ data: [{ importId: expect.any(String), employeeId: "e1" }] });
    expect(createEntries).toHaveBeenCalledWith({ data: expect.arrayContaining([
      { importId: expect.any(String), employeeId: "e1", date: "2026-11-01", status: "off", startTime: null, endTime: null },
      { importId: expect.any(String), employeeId: "e1", date: "2026-11-03", status: "shift", startTime: "08:05", endTime: "16:45" },
    ]) });

    latestInScope.mockResolvedValue({ id: "existing", version: 1, fingerprint: createImport.mock.calls[0][0].data.fingerprint });
    await expect(store.save(actor, base)).resolves.toEqual({ ok: true, id: "existing", version: 1, duplicate: true });
    expect(createImport).toHaveBeenCalledOnce();
  });

  it("navýší verzi změněného importu stejného období a okruhu osob", async () => {
    latestInScope.mockResolvedValue({ version: 4 });
    createImport.mockImplementation(async ({ data }) => ({ id: data.id, version: data.version }));
    const result = await new PrismaRosterHistoryStore(db).save(actor, { ...base, entries: [base.entries[0]] });

    expect(result).toMatchObject({ ok: true, version: 5, duplicate: false });
  });

  it("obnoví starší podobu jako novou verzi a její opakování je idempotentní", async () => {
    findByFingerprint.mockResolvedValue({ id: "old", version: 1 });
    latestInScope.mockResolvedValue({ id: "newer", version: 2, fingerprint: "different" });
    const store = new PrismaRosterHistoryStore(db);
    const restored = await store.save(actor, base);
    expect(restored).toMatchObject({ ok: true, version: 3, duplicate: false });
    const created = createImport.mock.calls[0][0].data;
    expect(created.fingerprint).not.toBe("different");
    latestInScope.mockResolvedValue({ id: "restored", version: 3, fingerprint: created.fingerprint });
    await expect(store.save(actor, base)).resolves.toEqual({ ok: true, id: "restored", version: 3, duplicate: true });
    expect(createImport).toHaveBeenCalledOnce();
  });

  it("zakáže viewerovi ukládat podklady bez otevření transakce", async () => {
    const result = await new PrismaRosterHistoryStore(db).save({ ...actor, role: "viewer" }, base);

    expect(result).toEqual({ ok: false, code: "forbidden" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("v režimu databázové autentizace odmítne neaktivního manažera", async () => {
    vi.stubEnv("PLANNING_AUTH_MODE", "database");
    accountFindUnique.mockResolvedValue({ role: "manager", active: false, passwordHash: "hash", mustChangePassword: false });

    const result = await new PrismaRosterHistoryStore(db).save(actor, base);

    expect(result).toEqual({ ok: false, code: "forbidden" });
    expect(createImport).not.toHaveBeenCalled();
  });
});
