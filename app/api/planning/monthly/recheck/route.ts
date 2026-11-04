import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { canConfirmPlanning } from "@/lib/auth/actor";
import { requirePlanningActor } from "@/lib/auth/route-access";
import { reviseMonthlyDraft } from "@/lib/planning/monthly-edit";
import { getMonthlyPersistenceRuntime } from "@/lib/planning/monthly-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const access = await requirePlanningActor();
  if (!access.ok) return NextResponse.json({ ok: false, message: access.message }, { status: access.status });
  if (!canConfirmPlanning(access.actor)) return NextResponse.json({ ok: false, message: "Návrh může upravovat pouze manažer." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, message: "Neplatný JSON." }, { status: 400 }); }
  const data = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  if (typeof data.id !== "string" || !Array.isArray(data.assignments)) return NextResponse.json({ ok: false, message: "Chybí návrh nebo seznam směn." }, { status: 400 });
  const current = getMonthlyPersistenceRuntime();
  if (!current.configured) return NextResponse.json({ ok: false, message: current.reason }, { status: 503 });
  try {
    const run = await current.get(data.id);
    if (!run || run.confirmed) return NextResponse.json({ ok: false, message: "Návrh neexistuje nebo je již potvrzený." }, { status: 409 });
    const boundary = await current.loadBoundary(run.input.month, run.input.employees.map((employee) => employee.id));
    const roster = run.input.planningRange ? await current.loadRosterSnapshot(run.input.month, run.input.employees.map((employee) => employee.id)) : undefined;
    const result = await reviseMonthlyDraft(current, data.id, randomUUID(), data.assignments, boundary, roster);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch { return NextResponse.json({ ok: false, message: "Kontrolu nebo uložení návrhu se nepodařilo dokončit." }, { status: 503 }); }
}
