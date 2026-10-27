import { NextResponse } from "next/server";

import type { PlanningConfirmApiResponse } from "@/lib/planning/api-types";
import { confirmRun } from "@/lib/planning/confirm-service";
import { planningRunRegistry } from "@/lib/planning/run-registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
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

  const result = confirmRun(planningRunRegistry, record.proposalId);

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
