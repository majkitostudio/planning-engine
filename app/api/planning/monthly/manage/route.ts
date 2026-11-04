import { NextResponse } from "next/server";
import { canConfirmPlanning } from "@/lib/auth/actor";
import { requirePlanningActor } from "@/lib/auth/route-access";
import { datesInMonth } from "@/lib/planning/domain/month";
import { getMonthlyPersistenceRuntime } from "@/lib/planning/monthly-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requirePlanningActor();
  if (!access.ok) return NextResponse.json({ ok: false, message: access.message }, { status: access.status });
  if (!canConfirmPlanning(access.actor)) return NextResponse.json({ ok: false, message: "Správa rozpisů je dostupná pouze manažerovi." }, { status: 403 });
  const month = new URL(request.url).searchParams.get("month") ?? "";
  try { datesInMonth(month); } catch { return NextResponse.json({ ok: false, message: "Neplatný měsíc." }, { status: 400 }); }
  const current = getMonthlyPersistenceRuntime();
  if (!current.configured) return NextResponse.json({ ok: false, message: current.reason }, { status: 503 });
  try { return NextResponse.json({ ok: true, runs: await current.list(month) }); }
  catch { return NextResponse.json({ ok: false, message: "Rozpisy se nepodařilo načíst." }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  const access = await requirePlanningActor();
  if (!access.ok) return NextResponse.json({ ok: false, message: access.message }, { status: access.status });
  if (!canConfirmPlanning(access.actor)) return NextResponse.json({ ok: false, message: "Rozpis může odstranit pouze manažer." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, message: "Neplatný požadavek." }, { status: 400 }); }
  const id = typeof body === "object" && body !== null ? (body as Record<string, unknown>).id : null;
  const confirmed = typeof body === "object" && body !== null ? (body as Record<string, unknown>).confirmed : null;
  if (typeof id !== "string" || !id.trim() || typeof confirmed !== "boolean") return NextResponse.json({ ok: false, message: "Chybí identifikátor nebo stav rozpisu." }, { status: 400 });
  const current = getMonthlyPersistenceRuntime();
  if (!current.configured) return NextResponse.json({ ok: false, message: current.reason }, { status: 503 });
  try {
    const result = await current.remove(id, access.actor, confirmed);
    return NextResponse.json(result, { status: result.ok ? 200 : result.code === "forbidden" ? 403 : result.code === "changed" ? 409 : 404 });
  } catch { return NextResponse.json({ ok: false, message: "Rozpis se nepodařilo odstranit." }, { status: 503 }); }
}
