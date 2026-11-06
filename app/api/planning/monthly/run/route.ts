import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { canConfirmPlanning } from "@/lib/auth/actor";
import { requirePlanningActor } from "@/lib/auth/route-access";
import { GeminiPlanningProvider } from "@/lib/ai/gemini-planning-provider";
import { CloudflarePlanningProvider } from "@/lib/ai/cloudflare-planning-provider";
import { validateMonthlyInput } from "@/lib/planning/domain/month-input";
import { executeMonthlyPlanning } from "@/lib/planning/monthly-planning";
import { getMonthlyRuntime } from "@/lib/planning/monthly-runtime";
import { SimulatedMonthlyProvider } from "@/lib/planning/simulated/monthly-provider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/**
 * Měsíc se generuje po týdnech, tedy více požadavky za sebou. Vercel Hobby
 * (2026) dovoluje funkci až 300 s; limit je uvedený kvůli čitelnosti záměru.
 */
export const maxDuration = 300;

export async function POST(request: Request) {
  const access = await requirePlanningActor();
  if (!access.ok) return NextResponse.json({ ok: false, message: access.message }, { status: access.status });
  if (!canConfirmPlanning(access.actor)) return NextResponse.json({ ok: false, message: "Plán může vytvářet pouze manažer." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, message: "Neplatný JSON." }, { status: 400 }); }
  const record = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  if (typeof record.input === "object" && record.input !== null && Object.hasOwn(record.input, "rosterHistory")) return NextResponse.json({ ok: false, message: "Podklady rosteru načítá server; nelze je poslat ve vstupu." }, { status: 400 });
  const input = validateMonthlyInput(record.input);
  if (!input.ok) return NextResponse.json({ ok: false, message: input.message }, { status: 400 });
  const current = getMonthlyRuntime();
  if (!current.configured) return NextResponse.json({ ok: false, message: current.reason }, { status: 503 });
  const scenario = record.scenario;
  const providerOverride = record.providerOverride === "simulated" ? "simulated" : null;
  if (current.mode === "simulated" && scenario !== "complete" && scenario !== "partial" && scenario !== "unverified") return NextResponse.json({ ok: false, message: "Zvolte platný simulovaný scénář." }, { status: 400 });
  try {
    const employeeIds = input.value.employees.map((employee) => employee.id);
    const boundary = await current.loadBoundary(input.value.month, employeeIds);
    const planningInput = input.value;
    const effectiveMode = providerOverride === "simulated" ? "simulated" : current.mode;
    const provider = effectiveMode === "simulated" ? new SimulatedMonthlyProvider("complete")
      : effectiveMode === "gemini" ? new GeminiPlanningProvider()
        : new CloudflarePlanningProvider();
    const result = await executeMonthlyPlanning(planningInput, boundary, provider);
    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
    }
    const id = randomUUID();
    await current.create({ id, input: planningInput, draft: result.draft, providerName: provider.name, mode: effectiveMode });
    return NextResponse.json({ ok: true, id, mode: effectiveMode, input: planningInput, draft: result.draft, validation: result.validation });
  } catch {
    return NextResponse.json({ ok: false, message: "Návrh nebo jeho podklady se nepodařilo uložit či načíst." }, { status: 503 });
  }
}
