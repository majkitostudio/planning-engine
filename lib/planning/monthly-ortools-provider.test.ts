import { describe, expect, it } from "vitest";
import type { MonthlyPlanningInput } from "./domain/month-input";
import type { MonthlyBoundaryData } from "./domain/month-validation";
import { executeMonthlyPlanning, isMonthlyPlanDraft } from "./monthly-planning";
import { MonthlyOrtoolsProvider, MonthlyOrtoolsResultError } from "./monthly-ortools-provider";

const input: MonthlyPlanningInput = { month: "2026-11", employees: [{ id: "person", displayName: "Jméno", employmentType: "full_time" }], absences: [], availability: [{ employeeId: "person", date: "2026-11-02", shiftKind: "morning", available: true }], staffingRequirements: [{ date: "2026-11-02", shiftKind: "morning", requiredEmployees: 2 }], instructions: "Pokyn" };
const boundary: MonthlyBoundaryData = { before: { complete: true, assignments: [] }, after: { complete: true, assignments: [] } };
const options = { url: "https://solver.example/solve", token: "test-token-012345678901234567890123" };

describe("izolovaný OR-Tools provider", () => {
  it("částečný návrh projde nezávislou kontrolou a nelze jej potvrdit", async () => {
    const provider = new MonthlyOrtoolsProvider({ ...options, fetcher: async () => Response.json({ status: "FEASIBLE", modelVersion: "monthly-cpsat-v1", assignments: [{ employeeId: "employee-0", date: "2026-11-02", shiftKind: "morning" }] }) });
    const result = await executeMonthlyPlanning(input, boundary, provider);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft.solverStatus).toBe("FEASIBLE");
    expect(result.draft.instructionsOutcome).toContain("nebyly");
    expect(result.validation.status).toBe("invalid");
    expect(result.validation.canConfirm).toBe(false);
  });

  it("nepředstírá výsledek při UNKNOWN nebo INFEASIBLE", async () => {
    for (const status of ["UNKNOWN", "INFEASIBLE"] as const) {
      const provider = new MonthlyOrtoolsProvider({ ...options, fetcher: async () => Response.json({ status }) });
      await expect(provider.generateMonthlyPlan(input, boundary)).rejects.toBeInstanceOf(MonthlyOrtoolsResultError);
      await expect(provider.generateMonthlyPlan(input, boundary)).rejects.toMatchObject({ status });
      expect(await executeMonthlyPlanning(input, boundary, provider)).toMatchObject({ ok: false, code: status === "UNKNOWN" ? "solver_unknown" : "solver_infeasible" });
    }
  });

  it("odmítá neplatný uložený stav solveru", () => {
    expect(isMonthlyPlanDraft({ month: input.month, instructionsOutcome: "", assignments: [], explanations: [], alternatives: [], assumptions: [], solverStatus: "UNKNOWN" }, input.month)).toBe(false);
  });
});
