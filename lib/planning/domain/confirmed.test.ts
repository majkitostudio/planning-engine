import { describe, expect, it } from "vitest";

import {
  CONFIRMED_PLANNING_RULES,
  CONFIRMED_SHIFT_DEFINITIONS,
  getShiftWindow,
} from "./index";

describe("potvrzené časy směn", () => {
  it("ranní směna má stejný čas ve všední den i o víkendu", () => {
    const morning = CONFIRMED_SHIFT_DEFINITIONS.find(
      (definition) => definition.kind === "morning",
    );

    expect(morning?.weekday).toEqual({ start: "07:45", end: "16:30" });
    expect(morning?.weekend).toEqual({ start: "07:45", end: "16:30" });
  });

  it("odpolední směna ve všední den začíná 13:15 a končí 21:00", () => {
    const afternoon = CONFIRMED_SHIFT_DEFINITIONS.find(
      (definition) => definition.kind === "afternoon",
    );

    expect(afternoon?.weekday).toEqual({ start: "13:15", end: "21:00" });
  });

  it("víkendová odpolední směna začíná 12:45 a končí 21:00", () => {
    const afternoon = CONFIRMED_SHIFT_DEFINITIONS.find(
      (definition) => definition.kind === "afternoon",
    );

    expect(afternoon?.weekend).toEqual({ start: "12:45", end: "21:00" });
  });

  it("getShiftWindow vybere všední nebo víkendové okno", () => {
    expect(
      getShiftWindow(CONFIRMED_SHIFT_DEFINITIONS, "afternoon", false),
    ).toEqual({ start: "13:15", end: "21:00" });
    expect(
      getShiftWindow(CONFIRMED_SHIFT_DEFINITIONS, "afternoon", true),
    ).toEqual({ start: "12:45", end: "21:00" });
  });

  it("neznámý druh směny je chyba volajícího, ne tichý default", () => {
    expect(() =>
      getShiftWindow(CONFIRMED_SHIFT_DEFINITIONS, "night" as never, false),
    ).toThrow('Chybí definice směny "night".');
  });
});

describe("potvrzená pravidla", () => {
  it("odpočinek následuje po šesti pracovních dnech a trvá 35 hodin", () => {
    expect(
      CONFIRMED_PLANNING_RULES.consecutiveWorkingDaysBeforeLongRest,
    ).toBe(6);
    expect(CONFIRMED_PLANNING_RULES.longRestHours).toBe(35);
  });

  it("práce o víkendu vyžaduje dva dny volna v témže týdnu", () => {
    expect(CONFIRMED_PLANNING_RULES.weekendWorkDaysOff).toBe(2);
  });
});
