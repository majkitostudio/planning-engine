import { describe, expect, it, vi } from "vitest";
import type { MonthlyPlanningInput } from "./domain/month-input";
import type { MonthlyBoundaryData } from "./domain/month-validation";
import { callMonthlyOrtools, MonthlySolverError } from "./monthly-ortools-client";

const input: MonthlyPlanningInput = { month: "2026-11", employees: [{ id: "person", displayName: "Jméno", employmentType: "full_time" }], absences: [], availability: [], staffingRequirements: [], instructions: "tajný text" };
const boundary: MonthlyBoundaryData = { before: { complete: false, assignments: [] }, after: { complete: false, assignments: [] } };
const config = { url: "https://solver.example/api/solver", token: "test-token-012345678901234567890123" };

describe("izolovaný klient měsíčního solveru", () => {
  it("odesílá anonymizovaný vstup a překládá výsledek", async () => {
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      expect(init?.redirect).toBe("error");
      expect(init?.headers).toMatchObject({ authorization: `Bearer ${config.token}` });
      expect(String(init?.body)).not.toContain("Jméno");
      expect(String(init?.body)).not.toContain("tajný text");
      return Response.json({ status: "OPTIMAL", modelVersion: "monthly-cpsat-v1", assignments: [{ employeeId: "employee-0", date: "2026-11-02", shiftKind: "morning" }] });
    });
    const result = await callMonthlyOrtools(input, boundary, { ...config, fetcher });
    expect(result).toEqual({ status: "OPTIMAL", modelVersion: "monthly-cpsat-v1", assignments: [{ employeeId: "person", date: "2026-11-02", shiftKind: "morning" }] });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("odlišuje neznámý výsledek od prokázané neproveditelnosti", async () => {
    for (const status of ["UNKNOWN", "INFEASIBLE"] as const) {
      const fetcher: typeof fetch = async () => Response.json({ status });
      expect(await callMonthlyOrtools(input, boundary, { ...config, fetcher })).toEqual({ status });
    }
  });

  it("odmítá nebezpečnou konfiguraci bez volání sítě", async () => {
    const fetcher = vi.fn<typeof fetch>();
    for (const url of ["http://solver.example", "https://x:y@solver.example", "https://solver.example/?token=x"]) {
      await expect(callMonthlyOrtools(input, boundary, { ...config, url, fetcher })).rejects.toMatchObject({ code: "configuration" });
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rozlišuje nedostupnost, poškozenou odpověď a časový limit", async () => {
    await expect(callMonthlyOrtools(input, boundary, { ...config, fetcher: async () => new Response(null, { status: 503 }) })).rejects.toMatchObject({ code: "unavailable" });
    await expect(callMonthlyOrtools(input, boundary, { ...config, fetcher: async () => new Response("{broken") })).rejects.toMatchObject({ code: "invalid_output" });
    await expect(callMonthlyOrtools(input, boundary, { ...config, fetcher: async () => Response.json({ status: "OPTIMAL", modelVersion: "monthly-cpsat-v1", assignments: [{ employeeId: "unexpected", date: "2026-11-02", shiftKind: "morning" }] }) })).rejects.toMatchObject({ code: "invalid_output" });
    const fetcher: typeof fetch = async (_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))));
    await expect(callMonthlyOrtools(input, boundary, { ...config, timeoutMs: 20, solverTimeoutSeconds: 0.001, fetcher })).rejects.toBeInstanceOf(MonthlySolverError);
    await expect(callMonthlyOrtools(input, boundary, { ...config, timeoutMs: 20, solverTimeoutSeconds: 0.001, fetcher })).rejects.toMatchObject({ code: "timeout" });
  });

  it("omezuje velikost odpovědi", async () => {
    const fetcher: typeof fetch = async () => new Response("{}", { headers: { "content-length": "3000001" } });
    await expect(callMonthlyOrtools(input, boundary, { ...config, fetcher })).rejects.toMatchObject({ code: "invalid_output" });
  });
});
