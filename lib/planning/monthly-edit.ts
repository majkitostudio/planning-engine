import type { MonthlyBoundaryData } from "./domain/month-validation";
import { isMonthlyPlanDraft, validateMonthlyDraft } from "./monthly-planning";
import type { MonthlyDraftRecord, StoredMonthlyRun } from "./monthly-store";

export async function reviseMonthlyDraft(store: { get(id: string): Promise<StoredMonthlyRun | null>; create(record: MonthlyDraftRecord): Promise<void> }, id: string, newId: string, assignments: unknown, boundary: MonthlyBoundaryData) {
  const run = await store.get(id);
  if (!run || run.confirmed) return { ok: false as const, message: "Návrh neexistuje nebo je již potvrzený." };
  const draft = { ...run.draft, assignments, explanations: [], alternatives: [] };
  if (!isMonthlyPlanDraft(draft, run.input.month)) return { ok: false as const, message: "Neplatný seznam směn." };
  const validation = validateMonthlyDraft(run.input, draft, boundary, run.mode);
  await store.create({ id: newId, input: run.input, draft, mode: run.mode, providerName: run.providerName });
  return { ok: true as const, id: newId, mode: run.mode, input: run.input, draft, validation };
}
