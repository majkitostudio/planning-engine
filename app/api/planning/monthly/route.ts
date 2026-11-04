import { NextResponse } from "next/server";
import { requirePlanningActor } from "@/lib/auth/route-access";
import { datesInMonth } from "@/lib/planning/domain/month";
import { validateMonthlyDraft } from "@/lib/planning/monthly-planning";
import { getMonthlyPersistenceRuntime } from "@/lib/planning/monthly-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requirePlanningActor();
  if (!access.ok) return NextResponse.json({ ok: false, message: access.message }, { status: access.status });
  const month = new URL(request.url).searchParams.get("month") ?? "";
  try { datesInMonth(month); } catch { return NextResponse.json({ ok: false, message: "Neplatný měsíc." }, { status: 400 }); }
  const current = getMonthlyPersistenceRuntime();
  if (!current.configured) return NextResponse.json({ ok: false, message: current.reason }, { status: 503 });
  try {
    if (new URL(request.url).searchParams.get("employees") === "previous-week") {
      const employees = await current.loadPreviousWeeklyEmployees(month);
      if (!employees.ok) return NextResponse.json({ ok: false, message: "Předchozí týdenní rozpis není jednoznačný nebo neobsahuje úplné údaje o zaměstnancích." }, { status: 409 });
      return NextResponse.json({ ok: true, employees: employees.employees });
    }
    const result = await current.getConfirmed(month);
    if (!result.ok) return NextResponse.json({ ok: false, message: "Potvrzený rozpis není jednoznačný." }, { status: 409 });
    if (!result.run) return NextResponse.json({ ok: true, view: null });
    const run = result.run;
    const boundary = await current.loadBoundary(month, run.input.employees.map((employee) => employee.id));
    return NextResponse.json({ ok: true, view: { id: run.id, mode: run.mode, input: run.input, draft: run.draft, confirmed: true, validation: validateMonthlyDraft(run.input, run.draft, boundary, run.mode, run.input.rosterHistory) } });
  } catch { return NextResponse.json({ ok: false, message: "Potvrzený rozpis se nepodařilo načíst." }, { status: 503 }); }
}
