import { afterEach, describe, expect, it, vi } from "vitest";
import { getMonthlyPersistenceRuntime, getMonthlyProviderRuntime, getMonthlyRuntime } from "./monthly-runtime";

afterEach(() => vi.unstubAllEnvs());

describe("měsíční provozní konfigurace", () => {
  it.each([
    { PLANNING_MONTHLY_PROVIDER: "gemini", PLANNING_PROVIDER: "" },
    { PLANNING_PROVIDER: "gemini" },
  ])("nepovolí externí Gemini pro měsíční vstupy bez schváleného rozsahu dat (%o)", (env) => {
    expect(getMonthlyProviderRuntime(env)).toMatchObject({
      configured: false,
      reason: expect.stringContaining("ochran"),
    });
  });

  it("umožní výslovně zapnout OR-Tools jen pro měsíční plánování", () => {
    expect(getMonthlyProviderRuntime({ PLANNING_MONTHLY_PROVIDER: "ortools", PLANNING_PROVIDER: "" })).toEqual({ configured: true, mode: "ortools" });
  });

  it("odmítne neznámý měsíční režim bez tichého přepnutí", () => {
    expect(getMonthlyProviderRuntime({ PLANNING_MONTHLY_PROVIDER: "other", PLANNING_PROVIDER: "simulated" })).toMatchObject({ configured: false, reason: expect.stringContaining("PLANNING_MONTHLY_PROVIDER") });
  });

  it("čtení a potvrzování uložených návrhů nevyžaduje nastaveného poskytovatele AI", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PLANNING_PERSISTENCE", "memory");
    vi.stubEnv("PLANNING_PROVIDER", "");
    expect(getMonthlyPersistenceRuntime().configured).toBe(true);
    expect(getMonthlyRuntime().configured).toBe(false);
  });

  it("v paměťovém režimu vrátí chybějící podklady měsíce jako neznámé", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PLANNING_PERSISTENCE", "memory");
    const runtime = getMonthlyPersistenceRuntime();
    expect(runtime.configured).toBe(true);
    if (!runtime.configured) return;
    const snapshot = await runtime.loadRosterSnapshot("2026-02", ["e1"]);
    expect(snapshot.imports).toEqual([]);
    expect(snapshot.days).toHaveLength(28);
    expect(snapshot.days.every((day) => day.employeeId === "e1" && day.status === "unknown")).toBe(true);
  });
});
