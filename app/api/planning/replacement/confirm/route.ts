import { NextResponse } from "next/server";

import { canConfirmPlanning } from "@/lib/auth/actor";
import { requirePlanningActor } from "@/lib/auth/route-access";
import type { PlanningReplacementConfirmApiResponse } from "@/lib/planning/api-types";
import {
  confirmPersistedReplacementRun,
} from "@/lib/planning/confirm-service";
import { getPlanningPersistenceRuntime } from "@/lib/planning/persistence-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const actorAccess = await requirePlanningActor();
  if (!actorAccess.ok) {
    return NextResponse.json<PlanningReplacementConfirmApiResponse>(
      { ok: false, rejected: { code: actorAccess.code, message: actorAccess.message } },
      { status: actorAccess.status },
    );
  }
  if (!canConfirmPlanning(actorAccess.actor)) {
    return NextResponse.json<PlanningReplacementConfirmApiResponse>(
      {
        ok: false,
        rejected: {
          code: "forbidden",
          message: "Operativní náhradu může potvrdit pouze uživatel s rolí manager.",
        },
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return rejection("invalid_request", "Tělo požadavku není platný JSON.", 400);
  }
  const record = isRecord(body) ? body : null;
  if (
    typeof record?.replacementId !== "string" ||
    typeof record.optionId !== "string" ||
    record.replacementId.length === 0 ||
    record.optionId.length === 0
  ) {
    return rejection(
      "invalid_request",
      "Požadavek musí obsahovat replacementId a optionId.",
      400,
    );
  }
  if (
    record.acceptedTimeOffChangeIds !== undefined &&
    (!Array.isArray(record.acceptedTimeOffChangeIds) ||
      record.acceptedTimeOffChangeIds.some((id) => typeof id !== "string"))
  ) {
    return rejection(
      "invalid_request",
      "Seznam přijatých změn volna má neplatný tvar.",
      400,
    );
  }

  const persistenceRuntime = getPlanningPersistenceRuntime();
  if (!persistenceRuntime.configured) {
    return rejection(
      "persistence_not_configured",
      persistenceRuntime.reason,
      503,
    );
  }

  try {
    const result = await confirmPersistedReplacementRun(
      persistenceRuntime.persistence,
      record.replacementId,
      record.optionId,
      actorAccess.actor,
      Date.now(),
      (record.acceptedTimeOffChangeIds as string[] | undefined) ?? [],
    );
    if (result.ok) {
      return NextResponse.json<PlanningReplacementConfirmApiResponse>(
        {
          ok: true,
          replacementId: record.replacementId,
          result: result.snapshot.result,
          confirmedPlan: result.snapshot.confirmedPlan,
          alreadyConfirmed: result.alreadyConfirmed,
        },
        { status: 200 },
      );
    }

    return NextResponse.json<PlanningReplacementConfirmApiResponse>(
      {
        ok: false,
        rejected: {
          code: result.code,
          message: result.message,
          blockers: result.blockers,
        },
      },
      { status: result.code === "unknown_replacement" ? 404 : 409 },
    );
  } catch {
    return rejection(
      "persistence_failed",
      "Potvrzení operativní náhrady se nepodařilo uložit.",
      503,
    );
  }
}

function rejection(code: string, message: string, status: number) {
  return NextResponse.json<PlanningReplacementConfirmApiResponse>(
    { ok: false, rejected: { code, message } },
    { status },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
