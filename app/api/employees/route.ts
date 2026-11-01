import { NextResponse } from "next/server";
import { requirePlanningActor } from "@/lib/auth/route-access";
import { canConfirmPlanning } from "@/lib/auth/actor";
import { prisma } from "@/lib/db";
import { getPlanningPersistenceRuntime } from "@/lib/planning/persistence-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function authorize(write: boolean) {
  const access = await requirePlanningActor();
  if (!access.ok) return NextResponse.json({ ok: false, message: access.message }, { status: access.status });
  if (write && !canConfirmPlanning(access.actor)) return NextResponse.json({ ok: false, message: "Zaměstnance může spravovat pouze manažer." }, { status: 403 });
  const persistence = getPlanningPersistenceRuntime();
  if (!persistence.configured || persistence.mode !== "prisma") return NextResponse.json({ ok: false, message: "Uložení zaměstnanců není dostupné." }, { status: 503 });
  return null;
}

export async function GET(request?: Request) {
  const all = request ? new URL(request.url).searchParams.get("all") === "1" : false;
  const denied = await authorize(all); if (denied) return denied;
  try {
    const employees = await prisma.planningEmployee.findMany({ where: all ? {} : { active: true }, select: { id: true, displayName: true, active: true }, orderBy: [{ displayName: "asc" }, { id: "asc" }] });
    return NextResponse.json({ ok: true, employees });
  } catch { return NextResponse.json({ ok: false, message: "Seznam zaměstnanců se nepodařilo načíst." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const denied = await authorize(true); if (denied) return denied;
  const body = await request.json().catch(() => null);
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  if (!displayName || displayName.length > 200) return NextResponse.json({ ok: false, message: "Vyplňte jméno zaměstnance (nejvýše 200 znaků)." }, { status: 400 });
  try {
    const employee = await prisma.planningEmployee.create({ data: { displayName }, select: { id: true, displayName: true } });
    return NextResponse.json({ ok: true, employee }, { status: 201 });
  } catch { return NextResponse.json({ ok: false, message: "Zaměstnance se nepodařilo uložit." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const denied = await authorize(true); if (denied) return denied;
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string" || !body.id.trim()) return NextResponse.json({ ok: false, message: "Vyberte zaměstnance." }, { status: 400 });
  try {
    if (body.active !== undefined && typeof body.active !== "boolean") return NextResponse.json({ ok: false, message: "Neplatný stav zaměstnance." }, { status: 400 });
    const active = body.active === true;
    const result = await prisma.planningEmployee.updateMany({ where: { id: body.id, active: !active }, data: { active } });
    if (!result.count) return NextResponse.json({ ok: false, message: "Zaměstnanec nebyl nalezen nebo už má tento stav." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ ok: false, message: "Zaměstnance se nepodařilo odebrat." }, { status: 503 }); }
}
