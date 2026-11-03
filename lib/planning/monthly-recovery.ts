import type { MonthlyBoundaryData } from "./domain/month-validation";
import { validateMonthlyDraft } from "./monthly-planning";
import type { StoredMonthlyRun } from "./monthly-store";

export async function recoverMonthlyDraft(store: { get(id: string): Promise<StoredMonthlyRun | null> }, id: string, month: string, boundary: MonthlyBoundaryData) {
  const run = await store.get(id);
  if (!run || run.confirmed || run.input.month !== month) return { ok: false as const, message: "Uložený nepotvrzený návrh nebyl nalezen." };
  return { ok: true as const, id: run.id, mode: run.mode, input: run.input, draft: run.draft, validation: validateMonthlyDraft(run.input, run.draft, boundary, run.mode) };
}
