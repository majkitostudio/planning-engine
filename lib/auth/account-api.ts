import { NextResponse } from "next/server";

import { AccountServiceError } from "./account-service";
import { canConfirmPlanning, type PlanningActor } from "./actor";
import { requirePlanningActor } from "./route-access";
import { getActiveAuthRuntimeConfig } from "./local";

export type AccountApiActorResult =
  | { readonly ok: true; readonly actor: PlanningActor }
  | { readonly ok: false; readonly response: NextResponse };

export async function requireDatabaseManager(): Promise<AccountApiActorResult> {
  const runtime = getActiveAuthRuntimeConfig();
  if (!runtime.ok || runtime.mode !== "database") {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "auth_not_configured", message: "Databázová správa účtů není nakonfigurovaná." },
        { status: 503 },
      ),
    };
  }

  const access = await requirePlanningActor();
  if (!access.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: access.code, message: access.message },
        { status: access.status },
      ),
    };
  }
  if (!canConfirmPlanning(access.actor)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "forbidden", message: "Správu účtů může používat pouze manager." },
        { status: 403 },
      ),
    };
  }
  return { ok: true, actor: access.actor };
}

export function accountServiceErrorResponse(error: unknown): NextResponse {
  if (!(error instanceof AccountServiceError)) {
    return NextResponse.json(
      { ok: false, error: "account_operation_failed", message: "Operaci účtu se nepodařilo dokončit." },
      { status: 500 },
    );
  }

  const conflictCodes = new Set([
    "email_in_use",
    "last_active_manager",
    "bootstrap_already_completed",
  ]);
  const notFoundCodes = new Set(["account_not_found"]);
  const status = conflictCodes.has(error.code)
    ? 409
    : notFoundCodes.has(error.code)
      ? 404
      : 400;
  return NextResponse.json(
    { ok: false, error: error.code, message: error.message },
    { status },
  );
}

export async function readJsonBody(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}
