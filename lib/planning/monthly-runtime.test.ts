import { afterEach, describe, expect, it, vi } from "vitest";
import { getMonthlyPersistenceRuntime, getMonthlyRuntime } from "./monthly-runtime";

afterEach(() => vi.unstubAllEnvs());

describe("měsíční provozní konfigurace", () => {
  it("čtení a potvrzování uložených návrhů nevyžaduje nastaveného poskytovatele AI", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PLANNING_PERSISTENCE", "memory");
    vi.stubEnv("PLANNING_PROVIDER", "");
    expect(getMonthlyPersistenceRuntime().configured).toBe(true);
    expect(getMonthlyRuntime().configured).toBe(false);
  });
});
