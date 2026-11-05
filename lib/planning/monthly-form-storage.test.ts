import { describe, expect, it } from "vitest";
import { loadMonthlyForm, saveMonthlyFormAtomically, type MonthlyFormSnapshot } from "./monthly-form-storage";

const snapshot: MonthlyFormSnapshot = {
  employees: [{ id: "synthetic-1", name: "Test A" }], name: "Rozepsané jméno",
  absences: [{ id: "a1", employeeId: "synthetic-1", from: "2026-11-01", to: "2026-11-02", type: "other", status: "approved" }],
  partialAbsences: [{ id: "a2", employeeId: "synthetic-1", from: "2026-11-03", to: "2026-11-03", shiftKind: "morning" }],
  workFunds: [{ employeeId: "synthetic-1", hours: "168", excusedHours: "0" }],
  staffing: ["1", "", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"],
  instructions: "Testovací pokyn", shiftRotationPreference: true, partialMonth: true,
  rangeStart: "2026-11-05", rangeEnd: "2026-11-20", employeeId: "synthetic-1",
  date: "2026-11-04", endDate: "", absenceShift: "afternoon", step: 2,
};

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}
const uncontendedLock = { request: async <T>(_name: string, task: () => T | PromiseLike<T>): Promise<T> => task() };

describe("lokální rozpracované zadání", () => {
  it("obnoví i částečně vyplněné údaje a oddělí účty i měsíce", async () => {
    const store = storage();
    const saved = await saveMonthlyFormAtomically(store, uncontendedLock, "manager-a", "2026-11", snapshot, null);
    expect(saved.status).toBe("saved");
    expect(loadMonthlyForm(store, "manager-a", "2026-11")).toMatchObject({ status: "found", value: snapshot });
    expect(loadMonthlyForm(store, "manager-b", "2026-11")).toMatchObject({ status: "empty" });
    expect(loadMonthlyForm(store, "manager-a", "2026-12")).toMatchObject({ status: "empty" });
    if (saved.status !== "saved") throw new Error("Zadání se neuložilo.");
    expect((await saveMonthlyFormAtomically(store, uncontendedLock, "manager-a", "2026-11", null, saved.raw)).status).toBe("saved");
    expect(loadMonthlyForm(store, "manager-a", "2026-11")).toMatchObject({ status: "empty" });
  });

  it("poškozené údaje nerozpozná jako platné a při odmítnutém úložišti vrátí chybu", async () => {
    const broken = { getItem: () => '{"version":1,"data":{"employees":null}}', setItem: () => { throw new Error("quota"); }, removeItem: () => { throw new Error("blocked"); } };
    expect(loadMonthlyForm(broken, "manager-a", "2026-11")).toMatchObject({ status: "invalid" });
    const invalidFunds = { getItem: () => JSON.stringify({ version: 1, data: { ...snapshot, workFunds: [{ employeeId: "synthetic-1", hours: "1" }] } }), setItem: () => {}, removeItem: () => {} };
    expect(loadMonthlyForm(invalidFunds, "manager-a", "2026-11")).toMatchObject({ status: "invalid" });
    expect((await saveMonthlyFormAtomically(broken, uncontendedLock, "manager-a", "2026-11", snapshot, null, true)).status).toBe("unavailable");
    expect((await saveMonthlyFormAtomically(broken, uncontendedLock, "manager-a", "2026-11", null, null, true)).status).toBe("unavailable");
    expect((await saveMonthlyFormAtomically(broken, undefined, "manager-a", "2026-11", snapshot, null)).status).toBe("unavailable");
  });

  it("při současném zápisu dvou oken nedovolí druhé verzi přepsat první", async () => {
    const store = storage();
    let tail = Promise.resolve();
    const locks = { request: async <T>(_name: string, task: () => T | Promise<T>): Promise<T> => {
      const previous = tail;
      let release!: () => void;
      tail = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      try { return await task(); } finally { release(); }
    } };
    const [first, second] = await Promise.all([
      saveMonthlyFormAtomically(store, locks, "manager-a", "2026-11", { ...snapshot, name: "první" }, null),
      saveMonthlyFormAtomically(store, locks, "manager-a", "2026-11", { ...snapshot, name: "druhé" }, null),
    ]);
    expect([first.status, second.status].sort()).toEqual(["conflict", "saved"]);
    expect(loadMonthlyForm(store, "manager-a", "2026-11")).toMatchObject({ status: "found", value: { name: "první" } });
  });

  it("načte i starší uložené zadání bez pracovního fondu", async () => {
    const store = storage();
    const legacy = { ...snapshot, workFunds: undefined };
    const saved = await saveMonthlyFormAtomically(store, uncontendedLock, "manager-a", "2026-11", legacy, null);
    expect(saved.status).toBe("saved");
    const loaded = loadMonthlyForm(store, "manager-a", "2026-11");
    expect(loaded).toMatchObject({ status: "found" });
    if (loaded.status === "found") expect(loaded.value).not.toHaveProperty("workFunds");
  });

  it("bez podpory koordinace nezapisuje, ale dovolí vymazat beze změny uložená data", async () => {
    const store = storage();
    const saved = await saveMonthlyFormAtomically(store, uncontendedLock, "manager-a", "2026-11", snapshot, null);
    if (saved.status !== "saved") throw new Error("Zadání se neuložilo.");
    expect((await saveMonthlyFormAtomically(store, undefined, "manager-a", "2026-11", snapshot, saved.raw)).status).toBe("unavailable");
    expect((await saveMonthlyFormAtomically(store, undefined, "manager-a", "2026-11", null, saved.raw)).status).toBe("saved");
    expect(loadMonthlyForm(store, "manager-a", "2026-11")).toMatchObject({ status: "empty" });
  });

  it("zastaralé mazání neodstraní novější zadání z jiného okna", async () => {
    const store = storage();
    const first = await saveMonthlyFormAtomically(store, uncontendedLock, "manager-a", "2026-11", snapshot, null);
    if (first.status !== "saved") throw new Error("Zadání se neuložilo.");
    const second = await saveMonthlyFormAtomically(store, uncontendedLock, "manager-a", "2026-11", { ...snapshot, name: "novější" }, first.raw);
    expect(second.status).toBe("saved");
    expect((await saveMonthlyFormAtomically(store, uncontendedLock, "manager-a", "2026-11", null, first.raw)).status).toBe("conflict");
    expect(loadMonthlyForm(store, "manager-a", "2026-11")).toMatchObject({ status: "found", value: { name: "novější" } });
  });
});
