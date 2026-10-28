import { NextResponse } from "next/server";

import { canConfirmPlanning } from "@/lib/auth/actor";
import { requirePlanningActor } from "@/lib/auth/route-access";
import type { PlanningConfirmApiResponse } from "@/lib/planning/api-types";
import { confirmPersistedRun } from "@/lib/planning/confirm-service";
import { getPlanningPersistenceRuntime } from "@/lib/planning/persistence-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const actorAccess = await requirePlanningActor();
  if (!actorAccess.ok) {
    return NextResponse.json<PlanningConfirmApiResponse>(
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

  if (!canConfirmPlanning(actorAccess.actor)) {
    return NextResponse.json<PlanningConfirmApiResponse>(
      {
        ok: false,
        rejected: {
          code: "forbidden",
          message: "Návrh může potvrdit pouze uživatel s rolí manager.",
        },
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<PlanningConfirmApiResponse>(
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

  if (typeof record?.proposalId !== "string" || record.proposalId.length === 0) {
    return NextResponse.json<PlanningConfirmApiResponse>(
      {
        ok: false,
        rejected: {
          code: "invalid_request",
          message: "Požadavek musí obsahovat proposalId.",
        },
      },
      { status: 400 },
    );
  }

  const persistenceRuntime = getPlanningPersistenceRuntime();
  if (!persistenceRuntime.configured) {
    return NextResponse.json<PlanningConfirmApiResponse>(
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

  let result;
  try {
    result = await confirmPersistedRun(
      persistenceRuntime.persistence,
      record.proposalId,
      actorAccess.actor,
    );
  } catch {
    return NextResponse.json<PlanningConfirmApiResponse>(
      {
        ok: false,
        rejected: {
          code: "persistence_failed",
          message: "Potvrzení návrhu se nepodařilo uložit.",
        },
      },
      { status: 503 },
    );
  }

  if (result.ok) {
    return NextResponse.json<PlanningConfirmApiResponse>(
      {
        ok: true,
        view: result.view,
        alreadyConfirmed: result.alreadyConfirmed,
      },
      { status: 200 },
    );
  }

  const status = result.code === "unknown_proposal" ? 404 : 409;

  return NextResponse.json<PlanningConfirmApiResponse>(
    {
      ok: false,
      rejected: {
        code: result.code,
        message: result.message,
        blockers: result.blockers,
      },
    },
    { status },
  );
}
