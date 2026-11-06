import { NextResponse } from "next/server";
import { canConfirmPlanning } from "@/lib/auth/actor";
import { requirePlanningActor } from "@/lib/auth/route-access";
import { prisma } from "@/lib/db";
import { datesInMonth } from "@/lib/planning/domain/month";
import { addDays } from "@/lib/planning/domain/time";
import { PrismaRosterHistoryStore } from "@/lib/planning/roster-history-store";
import { getMonthlyPersistenceRuntime } from "@/lib/planning/monthly-runtime";
import { getPlanningPersistenceRuntime } from "@/lib/planning/persistence-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requirePlanningActor();
  if (!access.ok) return NextResponse.json({ ok: false, message: access.message }, { status: access.status });
  const month = new URL(request.url).searchParams.get("month") ?? "";
  let dates: string[];
  try { dates = datesInMonth(month); } catch { return NextResponse.json({ ok: false, message: "Neplatný měsíc." }, { status: 400 }); }
  const persistence = getPlanningPersistenceRuntime();
  if (!persistence.configured || persistence.mode !== "prisma") return NextResponse.json({ ok: false, message: "Uložená návaznost není dostupná." }, { status: 503 });
  const employeeIdsParam = new URL(request.url).searchParams.get("employeeIds");
  let boundary: { readonly beforeComplete: boolean; readonly afterComplete: boolean } | undefined;
  if (employeeIdsParam !== null) {
    const employeeIds = employeeIdsParam.split(",").map((id) => id.trim());
    if (!employeeIds.length || employeeIds.length > 200 || employeeIds.some((id) => !id) || new Set(employeeIds).size !== employeeIds.length) {
      return NextResponse.json({ ok: false, message: "Seznam zaměstnanců pro kontrolu návaznosti není platný." }, { status: 400 });
    }
    const monthly = getMonthlyPersistenceRuntime();
    if (!monthly.configured) return NextResponse.json({ ok: false, message: monthly.reason }, { status: 503 });
    try {
      const result = await monthly.loadBoundary(month, employeeIds);
      boundary = { beforeComplete: result.before.complete, afterComplete: result.after.complete };
    } catch { return NextResponse.json({ ok: false, message: "Podklady návaznosti se nepodařilo zkontrolovat." }, { status: 503 }); }
  }
  try {
    const imports = await prisma.rosterHistoryImport.findMany({
      where: { periodStart: { lte: addDays(dates[dates.length - 1], 7) }, periodEnd: { gte: addDays(dates[0], -7) } },
      orderBy: [{ createdAt: "desc" }, { version: "desc" }],
      select: {
        id: true, periodStart: true, periodEnd: true, source: true, version: true, createdAt: true,
        employees: { select: { employeeId: true, _count: { select: { entries: true } } } },
      },
    });
    return NextResponse.json({ ok: true, ...(boundary ? { boundary } : {}), imports: imports.map((item) => ({
      id: item.id, periodStart: item.periodStart, periodEnd: item.periodEnd, source: item.source,
      version: item.version, createdAt: item.createdAt.toISOString(), employeeCount: item.employees.length,
      knownDayCount: item.employees.reduce((count, employee) => count + employee._count.entries, 0),
    })) });
  } catch {
    return NextResponse.json({ ok: false, message: "Uloženou návaznost se nepodařilo načíst." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const access = await requirePlanningActor();
  if (!access.ok) return NextResponse.json({ ok: false, message: access.message }, { status: access.status });
  if (!canConfirmPlanning(access.actor)) return NextResponse.json({ ok: false, message: "Podklady může smazat pouze manažer." }, { status: 403 });
  const persistence = getPlanningPersistenceRuntime();
  if (!persistence.configured || persistence.mode !== "prisma") return NextResponse.json({ ok: false, message: "Smazání podkladů není dostupné." }, { status: 503 });
  const body: unknown = await request.json().catch(() => null);
  const id = typeof body === "object" && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>).id : null;
  if (typeof id !== "string" || !id.trim()) return NextResponse.json({ ok: false, message: "Chybí identifikátor podkladů." }, { status: 400 });
  try {
    const result = await new PrismaRosterHistoryStore(prisma).delete(access.actor, id);
    if (!result.ok) {
      return NextResponse.json({
        ok: false,
        code: result.code,
        message: result.code === "forbidden" ? "Podklady může smazat pouze aktivní manažer." : "Tyto podklady už nejsou uložené.",
      }, { status: result.code === "forbidden" ? 403 : 404 });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, message: "Podklady se nepodařilo smazat. Zkuste to znovu." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const access = await requirePlanningActor();
  if (!access.ok) return NextResponse.json({ ok: false, message: access.message }, { status: access.status });
  if (!canConfirmPlanning(access.actor)) return NextResponse.json({ ok: false, message: "Návaznost může uložit pouze manažer." }, { status: 403 });
  const persistence = getPlanningPersistenceRuntime();
  if (!persistence.configured || persistence.mode !== "prisma") return NextResponse.json({ ok: false, message: "Uložení návaznosti není dostupné." }, { status: 503 });
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null || Array.isArray(body)) return NextResponse.json({ ok: false, message: "Vstup návaznosti není platný." }, { status: 400 });
  try {
    const result = await new PrismaRosterHistoryStore(prisma).save(access.actor, body);
    if (!result.ok) {
      const status = result.code === "forbidden" ? 403 : 400;
      return NextResponse.json({ ok: false, code: result.code, message: result.code === "forbidden" ? "Návaznost může uložit pouze aktivní manažer." : "Návaznost obsahuje neplatné údaje." }, { status });
    }
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch {
    return NextResponse.json({ ok: false, message: "Návaznost se nepodařilo uložit. Zkontrolujte zaměstnance a zkuste to znovu." }, { status: 503 });
  }
}
