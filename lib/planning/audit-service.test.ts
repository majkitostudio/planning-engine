import { describe, expect, it, vi } from "vitest";

import { toPlanningActor } from "../auth/actor";
import { makeRunResult } from "../../tests/planning/fixtures";
import { readPlanningAudit } from "./audit-service";
import {
  InMemoryPlanningPersistence,
  type PlanningRunSnapshot,
  type ReplacementRunSnapshot,
} from "./persistence";
import { createReplacementOptions } from "./replacement-service";
import { getSimulatedScenario } from "./simulated/scenarios";
import { getSimulatedReplacementScenario } from "./simulated/replacement-scenarios";

const manager = toPlanningActor({
  user: {
    id: "entra-manager",
    email: "manager@aaauto.cz",
    name: "Manažer",
    role: "manager",
  },
});

const viewer = toPlanningActor({
  user: {
    id: "entra-viewer",
    email: "viewer@aaauto.cz",
    name: "Viewer",
    role: "viewer",
  },
});

if (!manager || !viewer) throw new Error("Testovací aktéři se nepodařilo vytvořit.");

function makeSnapshot(): PlanningRunSnapshot {
  const scenario = getSimulatedScenario("complete");
  if (!scenario) throw new Error("Test scenario se nepodařilo načíst.");

  return {
    proposalId: "plan-audit",
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    providerName: "simulated-fixture/complete",
    mode: "simulated",
    input: scenario.input,
    result: makeRunResult({ id: "plan-audit" }),
    confirmedPlan: null,
    confirmedAt: null,
    confirmedById: null,
  };
}

describe("planning audit service", () => {
  it("rozliší odstranění měsíčního rozpisu od potvrzení", async () => {
    const persistence = new InMemoryPlanningPersistence();
    vi.spyOn(persistence, "listAuditEvents").mockResolvedValue([{ id: "a", action: "planning.removed", entityType: "monthly_planning_run", entityId: "month-1", actorId: "m", createdAt: "2026-11-02T00:00:00.000Z", details: { month: "2026-11", email: "manager@example.test" } }]);
    expect(await readPlanningAudit(persistence, manager)).toMatchObject({ ok: true, entries: [{ proposalId: "month-1", month: "2026-11", action: "removed", confirmedByEmail: "manager@example.test" }] });
  });
  it("zobrazuje měsíc a identitu u měsíčního potvrzení", async () => {
    const persistence = new InMemoryPlanningPersistence();
    vi.spyOn(persistence, "listAuditEvents").mockResolvedValue([{ id: "a", action: "planning.confirmed", entityType: "monthly_planning_run", entityId: "month-1", actorId: "m", createdAt: "2026-11-01T00:00:00.000Z", details: { month: "2026-11", email: "manager@example.test" } }]);
    expect(await readPlanningAudit(persistence, manager)).toMatchObject({ ok: true, entries: [{ proposalId: "month-1", month: "2026-11", confirmedByEmail: "manager@example.test" }] });
  });
  it("manager přečte potvrzený návrh v auditním pohledu", async () => {
    const persistence = new InMemoryPlanningPersistence();
    const snapshot = makeSnapshot();

    await persistence.saveRun(snapshot, manager);
    await persistence.confirmRun(
      snapshot.proposalId,
      snapshot.result.proposal.plan.assignments,
      manager,
      new Date("2026-10-28T13:00:00.000Z"),
    );

    await expect(readPlanningAudit(persistence, manager)).resolves.toEqual({
      ok: true,
      entries: [
        {
          proposalId: "plan-audit",
          weekStart: "2026-10-05",
          confirmedByEmail: "manager@aaauto.cz",
          confirmedAt: "2026-10-28T13:00:00.000Z",
        },
      ],
    });
  });

  it("zobrazí identitu managera, který potvrdil operativní náhradu", async () => {
    const persistence = new InMemoryPlanningPersistence();
    const scenario = getSimulatedReplacementScenario("single-absence");
    if (!scenario) throw new Error("Replacement fixture chybí.");

    const result = createReplacementOptions(
      scenario.input,
      scenario.basePlan,
      scenario.request,
      scenario.drafts,
    );
    const snapshot: ReplacementRunSnapshot = {
      replacementId: "replacement-audit",
      scenarioId: scenario.id,
      scenarioLabel: scenario.label,
      providerName: "simulated-fixture/single-absence",
      mode: "simulated",
      input: scenario.input,
      basePlan: scenario.basePlan,
      result: { ...result, request: { ...result.request, id: "replacement-audit" } },
      confirmedPlan: null,
      confirmedAt: null,
      confirmedById: null,
    };
    await persistence.saveReplacementRun(snapshot, manager);
    await expect(readPlanningAudit(persistence, manager)).resolves.toEqual({
      ok: true,
      entries: [],
    });
    const option = result.options.find((candidate) => candidate.validation.status === "valid");
    if (!option) throw new Error("Fixture nemá validní variantu.");

    await persistence.confirmReplacementRun(
      snapshot.replacementId,
      option.id,
      option.draft.assignments,
      manager,
      new Date("2026-10-28T13:00:00.000Z"),
    );

    await expect(readPlanningAudit(persistence, manager)).resolves.toMatchObject({
      ok: true,
      entries: [
        {
          proposalId: "replacement-audit",
          weekStart: "2026-10-05",
          confirmedByEmail: "manager@aaauto.cz",
        },
      ],
    });
  });

  it("viewer auditní záznamy nedostane", async () => {
    const persistence = new InMemoryPlanningPersistence();

    await expect(readPlanningAudit(persistence, viewer)).resolves.toEqual({
      ok: false,
      code: "forbidden",
    });
  });
});
