import { describe, expect, it } from "vitest";

import {
  DEFAULT_STAFFING_MINIMUMS,
  applyStaffingSettings,
  getCompleteStaffingSettings,
  getStaffingProfileStatus,
  getStaffingRequirement,
  validateStaffingSettingsPayload,
} from "./staffing-settings";
import { InMemoryPlanningPersistence, createInMemoryPersistenceState } from "./persistence";
import { getSimulatedReplacementScenario } from "./simulated/replacement-scenarios";
import { evaluateReplacementOption } from "./replacement-service";

describe("staffing settings", () => {
  it("rozlišuje úplný, částečný, chybějící a nedostupný uložený profil", () => {
    const complete = Array.from({ length: 14 }, (_, index) => ({
      dayOfWeek: Math.floor(index / 2),
      shiftKind: index % 2 === 0 ? "morning" as const : "afternoon" as const,
      requiredEmployees: 1,
    }));

    expect(getStaffingProfileStatus(complete)).toBe("complete");
    expect(getStaffingProfileStatus(complete.slice(0, 1))).toBe("partial");
    expect(getStaffingProfileStatus([])).toBe("missing");
    expect(getStaffingProfileStatus([], false)).toBe("unavailable");
  });

  it("vrací minima podle pracovního dne nebo víkendu", () => {
    const settings = getCompleteStaffingSettings([]);

    expect(settings).toHaveLength(14);
    expect(DEFAULT_STAFFING_MINIMUMS).toEqual({ weekday: { morning: 23, afternoon: 8 }, weekend: { morning: 12, afternoon: 9 } });
    expect(settings.find((setting) => setting.dayOfWeek === 0 && setting.shiftKind === "morning")?.requiredEmployees).toBe(23);
    expect(settings.find((setting) => setting.dayOfWeek === 1 && setting.shiftKind === "morning")?.requiredEmployees).toBe(23);
    expect(settings.find((setting) => setting.dayOfWeek === 5 && setting.shiftKind === "afternoon")?.requiredEmployees).toBe(9);
    expect(settings.find((setting) => setting.dayOfWeek === 4 && setting.shiftKind === "afternoon")?.requiredEmployees).toBe(8);
  });

  it("načte uloženou hodnotu pro konkrétní kalendářní den a směnu", () => {
    const settings = getCompleteStaffingSettings([
      { dayOfWeek: 2, shiftKind: "morning", requiredEmployees: 18 },
    ]);

    expect(getStaffingRequirement(settings, "2026-10-07", "morning")).toBe(18);
    expect(getStaffingRequirement(settings, "2026-10-07", "afternoon")).toBe(8);
    expect(getStaffingRequirement(settings, "2026-10-08", "morning")).toBe(23);
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

  it("chybějící uložené minimum při náhradě nenahradí výchozí hodnotou", () => {
    const scenario = getSimulatedReplacementScenario("single-absence");
    if (!scenario) throw new Error("Fixture operativní náhrady chybí.");
    const settings = getCompleteStaffingSettings([]).filter((setting) => !(setting.dayOfWeek === 0 && setting.shiftKind === "morning"));
    const input = applyStaffingSettings(scenario.input, settings);
    expect(input.staffingRequirements.some((item) => item.date === "2026-10-05" && item.shiftKind === "morning")).toBe(false);
    expect(evaluateReplacementOption(input, scenario.basePlan, scenario.request, scenario.drafts[0]!).validation.status).toBe("not_verified");
  });

  it("pro cílovou směnu incidentu použije uložené obsazení i při nulové hodnotě v ukázce", () => {
    const scenario = getSimulatedReplacementScenario("single-absence");
    if (!scenario) throw new Error("Fixture operativní náhrady chybí.");
    const incident = scenario.request.incident;
    const input = { ...scenario.input, staffingRequirements: scenario.input.staffingRequirements.map((item) => item.date === incident.date && item.shiftKind === incident.shiftKind ? { ...item, requiredEmployees: 0 } : item) };
    const settings = getCompleteStaffingSettings([]).map((item) => item.dayOfWeek === 1 && item.shiftKind === "afternoon" ? { ...item, requiredEmployees: 5 } : item);
    const result = applyStaffingSettings(input, settings, incident);
    expect(result.staffingRequirements.find((item) => item.date === incident.date && item.shiftKind === incident.shiftKind)?.requiredEmployees).toBe(5);
  });
});
