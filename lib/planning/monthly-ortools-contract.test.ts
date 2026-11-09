import { describe, expect, it } from "vitest";
import { createOrtoolsRequest, parseOrtoolsResponse } from "./monthly-ortools-contract";
import type { MonthlyPlanningInput } from "./domain/month-input";
import type { MonthlyBoundaryData } from "./domain/month-validation";

const input: MonthlyPlanningInput = {
  month: "2026-11",
  employees: [{ id: "private-id", displayName: "Soukromé jméno", employmentType: "full_time" }],
  absences: [{ id: "private-absence", employeeId: "private-id", from: "2026-11-01", to: "2026-11-01", type: "vacation", status: "approved" }],
  availability: [{ employeeId: "private-id", date: "2026-11-02", shiftKind: "morning", available: true }],
  staffingRequirements: [{ date: "2026-11-02", shiftKind: "morning", requiredEmployees: 1 }],
  instructions: "Soukromý volný text",
};
const boundary: MonthlyBoundaryData = {
  before: { complete: false, assignments: [{ employeeId: "private-id", date: "2026-10-31", startTime: "09:00", endTime: "15:00" }] },
  after: { complete: true, assignments: [] },
};

describe("izolovaný OR-Tools kontrakt", () => {
  it("přenáší jen potřebná data, token a přesné historické časy", () => {
    const { request, employeeIds } = createOrtoolsRequest(input, boundary, 10);
    const json = JSON.stringify(request);
    expect(json).not.toContain("private-id");
    expect(json).not.toContain("Soukromé");
    expect(json).not.toContain("Soukromý");
    expect(json).not.toContain("private-absence");
    expect(request.boundary.before).toEqual({ complete: false, assignments: [{ employeeId: "employee-0", date: "2026-10-31", startTime: "09:00", endTime: "15:00" }] });
    expect(employeeIds.get("employee-0")).toBe("private-id");
    expect(request.input.availability).toHaveLength(1);
  });

  it("odmítá nepodporovaný rozsah a úvazek", () => {
    expect(() => createOrtoolsRequest({ ...input, planningRange: { startDate: "2026-11-02", endDate: "2026-11-03" } }, boundary, 10)).toThrow();
    expect(() => createOrtoolsRequest({ ...input, employees: [{ ...input.employees[0], employmentType: "part_time" }] }, boundary, 10)).toThrow();
  });

  it("zachová stavy solveru a bezpečně přeloží identity", () => {
    const { employeeIds } = createOrtoolsRequest(input, boundary, 10);
    expect(parseOrtoolsResponse({ status: "FEASIBLE", modelVersion: "monthly-cpsat-v1", assignments: [{ employeeId: "employee-0", date: "2026-11-02", shiftKind: "morning" }] }, input.month, employeeIds)).toEqual({ status: "FEASIBLE", modelVersion: "monthly-cpsat-v1", assignments: [{ employeeId: "private-id", date: "2026-11-02", shiftKind: "morning" }] });
    for (const status of ["UNKNOWN", "INFEASIBLE", "invalid_input", "unavailable", "error"]) expect(parseOrtoolsResponse({ status }, input.month, employeeIds)).toEqual({ status });
  });

  it("odmítá neznámé identity, data, druhy směn i duplicitní dny", () => {
    const { employeeIds } = createOrtoolsRequest(input, boundary, 10);
    const valid = { employeeId: "employee-0", date: "2026-11-02", shiftKind: "morning" };
    for (const assignments of [[{ ...valid, employeeId: "employee-1" }], [{ ...valid, date: "2026-12-01" }], [{ ...valid, shiftKind: "night" }], [valid, { ...valid, shiftKind: "afternoon" }]]) {
      expect(() => parseOrtoolsResponse({ status: "OPTIMAL", modelVersion: "monthly-cpsat-v1", assignments }, input.month, employeeIds)).toThrow();
    }
  });
});
