import { afterEach, describe, expect, it, vi } from "vitest";
import { getMonthlyPersistenceRuntime, getMonthlyProviderRuntime, getMonthlyRuntime } from "./monthly-runtime";

afterEach(() => vi.unstubAllEnvs());

describe("měsíční provozní konfigurace", () => {
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
});
