import { NextResponse } from "next/server";

import { canConfirmPlanning } from "@/lib/auth/actor";
import { requirePlanningActor } from "@/lib/auth/route-access";
import { getPlanningPersistenceRuntime } from "@/lib/planning/persistence-runtime";
import {
  getCompleteStaffingSettings,
  validateStaffingSettingsPayload,
} from "@/lib/planning/staffing-settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const actorAccess = await requirePlanningActor();
  if (!actorAccess.ok) return rejection(actorAccess.code, actorAccess.message, actorAccess.status);

  const persistenceRuntime = getPlanningPersistenceRuntime();
  if (!persistenceRuntime.configured) {
    return rejection("persistence_not_configured", persistenceRuntime.reason, 503);
  }

  try {
    const savedSettings = await persistenceRuntime.persistence.getStaffingSettings();
    return NextResponse.json({
      ok: true,
      settings: getCompleteStaffingSettings(savedSettings),
    });
  } catch {
    return rejection(
      "persistence_failed",
      "Nastavení potřebného obsazení se nepodařilo načíst.",
      503,
    );
  }
}

export async function POST(request: Request) {
  const actorAccess = await requirePlanningActor();
  if (!actorAccess.ok) return rejection(actorAccess.code, actorAccess.message, actorAccess.status);
  if (!canConfirmPlanning(actorAccess.actor)) {
    return rejection(
      "forbidden",
      "Nastavení potřebného obsazení může měnit pouze uživatel s rolí manager.",
      403,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return rejection("invalid_request", "Tělo požadavku není platný JSON.", 400);
  }

  const validation = validateStaffingSettingsPayload(body);
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, rejected: { code: "invalid_request", message: validation.errors.join(" ") } },
      { status: 400 },
    );
  }

  const persistenceRuntime = getPlanningPersistenceRuntime();
  if (!persistenceRuntime.configured) {
    return rejection("persistence_not_configured", persistenceRuntime.reason, 503);
  }

  try {
    await persistenceRuntime.persistence.saveStaffingSettings(validation.settings);
    return NextResponse.json({ ok: true, settings: validation.settings });
  } catch {
    return rejection(
      "persistence_failed",
      "Nastavení potřebného obsazení se nepodařilo uložit.",
      503,
    );
  }
}

function rejection(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, rejected: { code, message } }, { status });
}
