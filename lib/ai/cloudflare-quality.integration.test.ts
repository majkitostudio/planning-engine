import { describe, expect, it } from "vitest";
import { CloudflarePlanningProvider } from "./cloudflare-planning-provider";
import { monthlyQualityBoundary, monthlyQualityInput } from "./fixtures/monthly-quality-fixture";
import { summarizeIntegrationRun } from "./integration-report";
import { validateMonthlyDraft } from "../planning/monthly-planning";

// Samostatný souhlas: běžné testy a starší smoke nesmí spustit tento AI běh.
const requested = process.env.RUN_CLOUDFLARE_QUALITY === "1";

describe.skipIf(!requested)("Cloudflare AI syntetický kvalitativní scénář", () => {
  it("zaznamená pokrytí a nezávislé validační nálezy", async () => {
    expect(process.env.CLOUDFLARE_ACCOUNT_ID, "Chybí konfigurace účtu Cloudflare").toBeTruthy();
    expect(process.env.CLOUDFLARE_API_TOKEN, "Chybí konfigurace přístupu Cloudflare").toBeTruthy();
    const provider = new CloudflarePlanningProvider();
    const start = performance.now();
    const draft = await provider.generateMonthlyPlan(monthlyQualityInput, monthlyQualityBoundary);
    const validation = validateMonthlyDraft(monthlyQualityInput, draft, monthlyQualityBoundary, provider.name);
    const summary = summarizeIntegrationRun(monthlyQualityInput, draft, validation, performance.now() - start);
    console.info("[cloudflare-quality]", JSON.stringify(summary));
    if (process.env.SHOW_SYNTHETIC_QUALITY_DRAFT === "1") {
      console.info("[cloudflare-quality-synthetic-assignments]", JSON.stringify(draft.assignments));
    }
    expect(draft.month).toBe(monthlyQualityInput.month);
    expect(draft.assignments.length).toBeGreaterThan(0);
    // Test přenosu neoznačuje kvalitu za úspěšnou: rozhoduje zaznamenaná validace.
    expect(validation.canConfirm).toBe(validation.status === "valid");
  }, 290_000);
});
