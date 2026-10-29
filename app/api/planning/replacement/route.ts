import { NextResponse } from "next/server";

import { requirePlanningActor } from "@/lib/auth/route-access";
import type { PlanningReplacementApiResponse } from "@/lib/planning/api-types";
import type { PlanningInput } from "@/lib/planning/domain/types";
import { getPlanningPersistenceRuntime } from "@/lib/planning/persistence-runtime";
import { applyStaffingSettings } from "@/lib/planning/staffing-settings";
import { createPlanningProvider } from "@/lib/planning/provider-factory";
import { createReplacementOptions } from "@/lib/planning/replacement-service";
import { getPlanningRuntime } from "@/lib/planning/server-config";
import { getSimulatedReplacementScenario } from "@/lib/planning/simulated/replacement-scenarios";
import {
  validateReplacementRequest,
  type ReplacementRequest,
} from "@/lib/planning/domain";
import type { ShiftIncident } from "@/lib/planning/domain/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const actorAccess = await requirePlanningActor();
  if (!actorAccess.ok) {
    return NextResponse.json<PlanningReplacementApiResponse>(
      { ok: false, rejected: { code: actorAccess.code, message: actorAccess.message } },
      { status: actorAccess.status },
    );
  }

  const runtime = getPlanningRuntime();
  if (!runtime.configured || runtime.mode !== "simulated") {
    return NextResponse.json<PlanningReplacementApiResponse>(
      {
        ok: false,
        rejected: {
          code: "not_configured",
          message: runtime.configured
            ? "Pilot operativních náhrad je zatím dostupný pouze v režimu simulated."
            : runtime.reason,
        },
      },
      { status: 503 },
    );
  }

  const persistenceRuntime = getPlanningPersistenceRuntime();
  if (!persistenceRuntime.configured) {
    return NextResponse.json<PlanningReplacementApiResponse>(
      {
        ok: false,
        rejected: {
          code: "persistence_not_configured",
          message: persistenceRuntime.reason,
        },
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return rejection("invalid_request", "Tělo požadavku není platný JSON.", 400);
  }

  const record = isRecord(body) ? body : null;
  const scenario = getSimulatedReplacementScenario("single-absence");
  if (!scenario || typeof record?.weekStart !== "string") {
    return rejection(
      "invalid_request",
      "Požadavek musí obsahovat weekStart pro syntetický scénář náhrady.",
      400,
    );
  }

  const incident = toIncident(record.incident);
  if (!incident) {
    return rejection(
      "invalid_request",
      "Požadavek musí obsahovat incident celé směny.",
      400,
    );
  }

  const replacementRequest: ReplacementRequest = {
    id: typeof record.requestId === "string" ? record.requestId : newId("replacement"),
    baseProposalId:
      typeof record.baseProposalId === "string"
        ? record.baseProposalId
        : scenario.basePlan.proposalId,
    weekStart: record.weekStart,
    incident,
  };
  const requestValidation = validateReplacementRequest(
    scenario.input,
    scenario.basePlan,
    replacementRequest,
  );
  if (requestValidation.status === "invalid") {
    const baseMismatch = requestValidation.problems.some((problem) =>
      problem.code === "REPLACEMENT_BASE_MISMATCH" ||
      problem.code === "REPLACEMENT_BASE_NOT_FOUND",
    );
    return rejection(
      baseMismatch ? "base_version_mismatch" : "invalid_request",
      requestValidation.problems.map((problem) => problem.message).join(" "),
      baseMismatch ? 409 : 400,
    );
  }

  let input: PlanningInput;
  try {
    const savedSettings = await persistenceRuntime.persistence.getStaffingSettings();
    input = applyStaffingSettings(scenario.input, savedSettings);
  } catch {
    return rejection(
      "persistence_failed",
      "Nastavení potřebného obsazení se nepodařilo načíst.",
      503,
    );
  }

  let drafts;
  try {
    const provider = createPlanningProvider({
      mode: "simulated_replacement",
      scenario: "single-absence",
    });
    if (!provider.generateReplacements) {
      return rejection(
        "not_configured",
        "Provider operativních náhrad není nakonfigurovaný.",
        503,
      );
    }
    drafts = await provider.generateReplacements(
      input,
      replacementRequest,
    );
  } catch (error) {
    return rejection(
      "ai_invalid_output",
      error instanceof Error ? error.message : "Provider vrátil neplatný návrh.",
      503,
    );
  }

  const result = createReplacementOptions(
    input,
    scenario.basePlan,
    replacementRequest,
    drafts,
  );
  const snapshot = {
    replacementId: replacementRequest.id,
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    providerName: "simulated-fixture/single-absence",
    mode: "simulated" as const,
    input,
    basePlan: scenario.basePlan,
    result,
    confirmedPlan: null,
    confirmedAt: null,
    confirmedById: null,
  };

  try {
    await persistenceRuntime.persistence.saveReplacementRun(
      snapshot,
      actorAccess.actor,
    );
  } catch {
    return rejection(
      "persistence_failed",
      "Výsledek operativní náhrady se nepodařilo uložit.",
      503,
    );
  }

  return NextResponse.json<PlanningReplacementApiResponse>(
    { ok: true, replacementId: replacementRequest.id, result },
    { status: 200 },
  );
}

function rejection(code: string, message: string, status: number) {
  return NextResponse.json<PlanningReplacementApiResponse>(
    { ok: false, rejected: { code, message } },
    { status },
  );
}

function toIncident(value: unknown): ShiftIncident | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    typeof value.date !== "string" ||
    (value.shiftKind !== "morning" && value.shiftKind !== "afternoon") ||
    typeof value.absentEmployeeId !== "string"
  ) {
    return null;
  }
  return {
    id: value.id,
    status: "open",
    date: value.date,
    shiftKind: value.shiftKind,
    absentEmployeeId: value.absentEmployeeId,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function newId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}
