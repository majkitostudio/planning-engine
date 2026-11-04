import { NextResponse } from "next/server";

import { requirePlanningManager } from "@/lib/auth/route-access";
import type { PlanningRunApiResponse } from "@/lib/planning/api-types";
import { getPlanningPersistenceRuntime } from "@/lib/planning/persistence-runtime";
import { PlanningPersistenceConflictError } from "@/lib/planning/persistence";
import { getPlanningRuntime } from "@/lib/planning/server-config";
import { executePlanningRun } from "@/lib/planning/run-service";
import { isSimulatedScenarioId } from "@/lib/planning/simulated/scenarios";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const actorAccess = await requirePlanningManager();
  if (!actorAccess.ok) {
    return NextResponse.json<PlanningRunApiResponse>(
      {
        ok: false,
        rejected: {
          code: actorAccess.code,
          message: actorAccess.message,
        },
      },
      { status: actorAccess.status },
    );
  }

  const planningRuntime = getPlanningRuntime();

  if (!planningRuntime.configured) {
    return NextResponse.json<PlanningRunApiResponse>(
      {
        ok: false,
        rejected: {
          code: "not_configured",
          message: planningRuntime.reason,
        },
      },
      { status: 503 },
    );
  }

  const persistenceRuntime = getPlanningPersistenceRuntime();
  if (!persistenceRuntime.configured) {
    return NextResponse.json<PlanningRunApiResponse>(
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
    return NextResponse.json<PlanningRunApiResponse>(
      {
        ok: false,
        rejected: {
          code: "invalid_request",
          message: "Tělo požadavku není platný JSON.",
        },
      },
      { status: 400 },
    );
  }

  const record =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : null;
  const scenario = record?.scenario;
  const weekStart = record?.weekStart;

  if (!isSimulatedScenarioId(scenario) || typeof weekStart !== "string") {
    return NextResponse.json<PlanningRunApiResponse>(
      {
        ok: false,
        rejected: {
          code: "invalid_request",
          message:
            "Požadavek musí obsahovat platný scénář a weekStart ve formátu YYYY-MM-DD.",
        },
      },
      { status: 400 },
    );
  }

  const result = await executePlanningRun({
    scenarioId: scenario,
    weekStart,
    mode: planningRuntime.mode,
  });

  if (result.ok) {
    try {
      await persistenceRuntime.persistence.saveRun(result.snapshot, actorAccess.actor);
    } catch (error) {
      if (error instanceof PlanningPersistenceConflictError) {
        return NextResponse.json<PlanningRunApiResponse>(
          {
            ok: false,
            rejected: {
              code: "record_conflict",
              message: "Rozpis s tímto identifikátorem už existuje a nebyl změněn.",
            },
          },
          { status: 409 },
        );
      }
      return NextResponse.json<PlanningRunApiResponse>(
        {
          ok: false,
          rejected: {
            code: "persistence_failed",
            message: "Výsledek plánování se nepodařilo uložit.",
          },
        },
        { status: 503 },
      );
    }
  }

  // Plánovací selhání je doménový výsledek, ne HTTP chyba.
  if (!result.ok) {
    return NextResponse.json<PlanningRunApiResponse>(result, { status: 200 });
  }

  return NextResponse.json<PlanningRunApiResponse>(
    { ok: true, view: result.view },
    { status: 200 },
  );
}
