import { describe, expect, it } from "vitest";

import {
  DEMO_WEEK_START,
  formatIsoDate,
  isSupportedDemoWeek,
  demoRosterForWeek,
} from "./demo-data";

describe("supported demo week", () => {
  it("považuje fixture týden za podporovaný", () => {
    expect(isSupportedDemoWeek(DEMO_WEEK_START)).toBe(true);
  });

  it("odmítne jiný týden jako nepodporovaný pro simulovaný běh", () => {
    const followingWeek = new Date(
      DEMO_WEEK_START.getFullYear(),
      DEMO_WEEK_START.getMonth(),
      DEMO_WEEK_START.getDate() + 7,
    );

    expect(isSupportedDemoWeek(followingWeek)).toBe(false);
  });

  it("formátuje datum podle lokálního dne bez posunu přes UTC", () => {
    expect(formatIsoDate(DEMO_WEEK_START)).toBe("2026-10-05");
  });

  it("nevrací ukázkové směny pro jiný týden", () => {
    const next = new Date(DEMO_WEEK_START.getFullYear(), DEMO_WEEK_START.getMonth(), DEMO_WEEK_START.getDate() + 7);
    expect(demoRosterForWeek(next)).toEqual([]);
    expect(demoRosterForWeek(DEMO_WEEK_START).length).toBeGreaterThan(0);
  });
});
