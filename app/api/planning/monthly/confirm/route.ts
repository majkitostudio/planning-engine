import { NextResponse } from "next/server";
import { canConfirmPlanning } from "@/lib/auth/actor";
import { requirePlanningActor } from "@/lib/auth/route-access";
import { getMonthlyPersistenceRuntime } from "@/lib/planning/monthly-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const access = await requirePlanningActor();
  if (!access.ok) return NextResponse.json({ ok: false, message: access.message }, { status: access.status });
  if (!canConfirmPlanning(access.actor)) return NextResponse.json({ ok: false, message: "Návrh může potvrdit pouze manažer." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, message: "Neplatný JSON." }, { status: 400 }); }
  const id = typeof body === "object" && body !== null ? (body as Record<string, unknown>).id : null;
  if (typeof id !== "string" || !id.trim()) return NextResponse.json({ ok: false, message: "Chybí identifikátor návrhu." }, { status: 400 });
  const current = getMonthlyPersistenceRuntime();
  if (!current.configured) return NextResponse.json({ ok: false, message: current.reason }, { status: 503 });
  try {
    const result = await current.confirm(id, access.actor);
    return NextResponse.json(result, { status: result.ok ? 200 : result.code === "not_found" ? 404 : result.code === "forbidden" ? 403 : 409 });
  } catch {
    return NextResponse.json({ ok: false, message: "Potvrzení se nepodařilo uložit." }, { status: 503 });
  }
}
