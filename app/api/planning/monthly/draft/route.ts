import { NextResponse } from "next/server";
import { canConfirmPlanning } from "@/lib/auth/actor";
import { requirePlanningActor } from "@/lib/auth/route-access";
import { datesInMonth } from "@/lib/planning/domain/month";
import { recoverMonthlyDraft } from "@/lib/planning/monthly-recovery";
import { getMonthlyPersistenceRuntime } from "@/lib/planning/monthly-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requirePlanningActor();
  if (!access.ok) return NextResponse.json({ ok: false, message: access.message }, { status: access.status });
  if (!canConfirmPlanning(access.actor)) return NextResponse.json({ ok: false, message: "Návrh může načíst pouze manažer." }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const id = params.get("id") ?? "";
  const month = params.get("month") ?? "";
  try { datesInMonth(month); } catch { return NextResponse.json({ ok: false, message: "Neplatný měsíc." }, { status: 400 }); }
  if (!id) return NextResponse.json({ ok: false, message: "Chybí identifikátor návrhu." }, { status: 400 });
  const current = getMonthlyPersistenceRuntime();
  if (!current.configured) return NextResponse.json({ ok: false, message: current.reason }, { status: 503 });
  try {
    const run = await current.get(id);
    if (!run || run.confirmed || run.input.month !== month) return NextResponse.json({ ok: false, message: "Uložený nepotvrzený návrh nebyl nalezen." }, { status: 404 });
    const boundary = await current.loadBoundary(month, run.input.employees.map((employee) => employee.id));
    const result = await recoverMonthlyDraft(current, id, month, boundary);
    return NextResponse.json(result, { status: result.ok ? 200 : 404 });
  } catch { return NextResponse.json({ ok: false, message: "Návrh se nepodařilo načíst a zkontrolovat." }, { status: 503 }); }
}
