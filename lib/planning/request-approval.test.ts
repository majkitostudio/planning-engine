import { describe, expect, it } from "vitest";

import { getSimulatedScenario } from "./simulated/scenarios";
import { previewEmployeeRequest } from "./request-approval";

describe("previewEmployeeRequest", () => {
  it("ukáže dopad přijetí volna a dostupné syntetické kandidáty bez změny návrhu", () => {
    const scenario = getSimulatedScenario("complete");
    if (!scenario) throw new Error("Syntetický scénář chybí.");

    const assignments = scenario.draft.assignments;
    const preview = previewEmployeeRequest(scenario.input, assignments, {
      id: "request-e3-2026-10-07",
      employeeId: "e3",
      date: "2026-10-07",
      kind: "day_off",
      status: "pending",
    });

    expect(preview).toMatchObject({
      requestId: "request-e3-2026-10-07",
      impacts: [{
        date: "2026-10-07",
        shiftKind: "afternoon",
      currentAssignedEmployees: 2,
      assignedAfterRequest: 1,
      requiredEmployees: 2,
      missingEmployees: 1,
      suggestedCandidates: ["e5", "e6"],
      }],
    });
    expect(assignments).toHaveLength(scenario.draft.assignments.length);
  });

  it("nepřidává domnělé pokrytí, pokud pro směnu není volný syntetický kandidát", () => {
    const scenario = getSimulatedScenario("complete");
    if (!scenario) throw new Error("Syntetický scénář chybí.");
    const assignments = [
      ...scenario.draft.assignments,
      { employeeId: "e5", date: "2026-10-07", shiftKind: "afternoon" as const },
      { employeeId: "e6", date: "2026-10-07", shiftKind: "afternoon" as const },
    ];

    const preview = previewEmployeeRequest(scenario.input, assignments, {
      id: "request-e3-2026-10-07",
      employeeId: "e3",
      date: "2026-10-07",
      kind: "day_off",
      status: "pending",
    });

    expect(preview).toMatchObject({
      impacts: [
        expect.objectContaining({
          assignedAfterRequest: 3,
          missingEmployees: 0,
          suggestedCandidates: [],
        }),
      ],
    });
  });

  it("u preference směny ukáže dopad na původní i požadovanou směnu", () => {
    const scenario = getSimulatedScenario("complete");
    if (!scenario) throw new Error("Syntetický scénář chybí.");

    const preview = previewEmployeeRequest(scenario.input, scenario.draft.assignments, {
      id: "request-e4-2026-10-08",
      employeeId: "e4",
      date: "2026-10-08",
      kind: "shift_preference",
      shiftKind: "morning",
      status: "pending",
    });

    expect(preview.impacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ shiftKind: "afternoon", assignedAfterRequest: 1 }),
        expect.objectContaining({ shiftKind: "morning", assignedAfterRequest: 3 }),
      ]),
    );
  });
});
