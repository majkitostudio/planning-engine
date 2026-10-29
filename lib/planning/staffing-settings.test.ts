import { describe, expect, it } from "vitest";

import {
  DEFAULT_STAFFING_MINIMUMS,
  applyStaffingSettings,
  getCompleteStaffingSettings,
  getStaffingRequirement,
  validateStaffingSettingsPayload,
} from "./staffing-settings";
import { InMemoryPlanningPersistence, createInMemoryPersistenceState } from "./persistence";
import { getSimulatedReplacementScenario } from "./simulated/replacement-scenarios";
import { evaluateReplacementOption } from "./replacement-service";

describe("staffing settings", () => {
  it("vrací výchozí minima 15 ráno a 7 odpoledne pro všech sedm dnů", () => {
    const settings = getCompleteStaffingSettings([]);

    expect(settings).toHaveLength(14);
    expect(settings.filter((setting) => setting.shiftKind === "morning").every(
      (setting) => setting.requiredEmployees === DEFAULT_STAFFING_MINIMUMS.morning,
    )).toBe(true);
    expect(settings.filter((setting) => setting.shiftKind === "afternoon").every(
      (setting) => setting.requiredEmployees === DEFAULT_STAFFING_MINIMUMS.afternoon,
    )).toBe(true);
  });

  it("načte uloženou hodnotu pro konkrétní kalendářní den a směnu", () => {
    const settings = getCompleteStaffingSettings([
      { dayOfWeek: 2, shiftKind: "morning", requiredEmployees: 18 },
    ]);

    expect(getStaffingRequirement(settings, "2026-10-07", "morning")).toBe(18);
    expect(getStaffingRequirement(settings, "2026-10-07", "afternoon")).toBe(7);
    expect(getStaffingRequirement(settings, "2026-10-08", "morning")).toBe(15);
  });

  it("uloží nastavení a po znovu vytvoření persistence ho znovu načte", async () => {
    const state = createInMemoryPersistenceState();
    const firstPersistence = new InMemoryPlanningPersistence(state);
    const settings = getCompleteStaffingSettings([
      { dayOfWeek: 4, shiftKind: "afternoon", requiredEmployees: 5 },
    ]);

    await firstPersistence.saveStaffingSettings(settings);
    const restartedPersistence = new InMemoryPlanningPersistence(state);

    expect(await restartedPersistence.getStaffingSettings()).toEqual(settings);
  });

  it("odmítne záporné číslo", () => {
    const result = validateStaffingSettingsPayload({
      settings: getCompleteStaffingSettings([]).map((setting) =>
        setting.dayOfWeek === 0 && setting.shiftKind === "morning"
          ? { ...setting, requiredEmployees: -1 }
          : setting,
      ),
    });

    expect(result.ok).toBe(false);
  });

  it("odmítne desetinné číslo", () => {
    const result = validateStaffingSettingsPayload({
      settings: getCompleteStaffingSettings([]).map((setting) =>
        setting.dayOfWeek === 0 && setting.shiftKind === "morning"
          ? { ...setting, requiredEmployees: 15.5 }
          : setting,
      ),
    });

    expect(result.ok).toBe(false);
  });

  it("odmítne neúplný týden", () => {
    const result = validateStaffingSettingsPayload({
      settings: getCompleteStaffingSettings([]).filter(
        (setting) => !(setting.dayOfWeek === 6 && setting.shiftKind === "afternoon"),
      ),
    });

    expect(result.ok).toBe(false);
  });

  it("použije uložené minimum při výpočtu operativní náhrady", () => {
    const scenario = getSimulatedReplacementScenario("single-absence");
    if (!scenario) throw new Error("Fixture operativní náhrady chybí.");
    const settings = getCompleteStaffingSettings([
      { dayOfWeek: 1, shiftKind: "afternoon", requiredEmployees: 5 },
    ]);
    const input = applyStaffingSettings(scenario.input, settings);

    const option = evaluateReplacementOption(
      input,
      scenario.basePlan,
      scenario.request,
      scenario.drafts[0]!,
    );

    expect(option.coverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          date: "2026-10-06",
          shiftKind: "afternoon",
          requiredEmployees: 5,
        }),
      ]),
    );
  });
});
