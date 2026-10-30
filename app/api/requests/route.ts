import { NextResponse } from "next/server";

import { canConfirmPlanning } from "@/lib/auth/actor";
import { requirePlanningActor } from "@/lib/auth/route-access";
import type { EmployeeRequest } from "@/lib/planning/domain/types";
import { getEmployeeRequestById, getEmployeeRequestPreview, getSimulatedEmployeeRequests } from "@/lib/planning/request-approval";
import { getPlanningPersistenceRuntime } from "@/lib/planning/persistence-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const actorAccess = await requirePlanningActor();
  if (!actorAccess.ok) {
    return rejection(actorAccess.code, actorAccess.message, actorAccess.status);
  }

  const persistenceRuntime = getPlanningPersistenceRuntime();
  if (!persistenceRuntime.configured) {
    return rejection("persistence_not_configured", persistenceRuntime.reason, 503);
  }

  try {
    const decisions = await persistenceRuntime.persistence.getEmployeeRequestDecisions();
    const decisionByRequestId = new Map(decisions.map((decision) => [decision.requestId, decision]));
    const requests = getSimulatedEmployeeRequests().map((request) => {
      const decision = decisionByRequestId.get(request.id);
      const currentRequest: EmployeeRequest = {
        ...request,
        status: decision?.status ?? "pending",
      };
      const employees = getEmployeeRequestPreview(currentRequest);
      return {
        ...currentRequest,
        employeeLabel: `Syntetický zaměstnanec ${request.employeeId}`,
        decision,
        preview: employees,
      };
    });

    return NextResponse.json({
      ok: true,
      simulated: true,
      canDecide: canConfirmPlanning(actorAccess.actor),
      planApplied: false,
      requests,
    });
  } catch {
    return rejection("persistence_failed", "Požadavky se nepodařilo načíst.", 503);
  }
}

export async function POST(request: Request) {
  const actorAccess = await requirePlanningActor();
  if (!actorAccess.ok) {
    return rejection(actorAccess.code, actorAccess.message, actorAccess.status);
  }
  if (!canConfirmPlanning(actorAccess.actor)) {
    return rejection("forbidden", "O požadavcích může rozhodovat pouze manager.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return rejection("invalid_request", "Tělo požadavku není platný JSON.", 400);
  }
  const record = isRecord(body) ? body : null;
  if (
    typeof record?.requestId !== "string" ||
    (record.decision !== "approved" && record.decision !== "rejected")
  ) {
    return rejection(
      "invalid_request",
      "Požadavek musí obsahovat requestId a rozhodnutí approved nebo rejected.",
      400,
    );
  }
  if (!getEmployeeRequestById(record.requestId)) {
    return rejection("unknown_request", "Tento syntetický požadavek neexistuje.", 404);
  }

  const persistenceRuntime = getPlanningPersistenceRuntime();
  if (!persistenceRuntime.configured) {
    return rejection("persistence_not_configured", persistenceRuntime.reason, 503);
  }

  try {
    const decision = await persistenceRuntime.persistence.saveEmployeeRequestDecision(
      record.requestId,
      record.decision,
      actorAccess.actor,
      new Date(),
    );
    return NextResponse.json({ ok: true, decision, planApplied: false });
  } catch {
    return rejection("persistence_failed", "Rozhodnutí o požadavku se nepodařilo uložit.", 503);
  }
}

function rejection(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, rejected: { code, message } }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
