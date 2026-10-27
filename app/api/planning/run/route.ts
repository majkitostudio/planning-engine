import { NextResponse } from "next/server";

import type { PlanningRunApiResponse } from "@/lib/planning/api-types";
import { getPlanningRuntime } from "@/lib/planning/server-config";
import { executePlanningRun } from "@/lib/planning/run-service";
import { isSimulatedScenarioId } from "@/lib/planning/simulated/scenarios";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
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

  // Plánovací selhání je doménový výsledek, ne HTTP chyba.
  return NextResponse.json<PlanningRunApiResponse>(result, { status: 200 });
}
