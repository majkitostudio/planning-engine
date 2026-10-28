import { describe, expect, it } from "vitest";

import {
  DEMO_WEEK_START,
  formatIsoDate,
  isSupportedDemoWeek,
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
});
