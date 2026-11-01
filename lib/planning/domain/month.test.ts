import { describe, expect, it } from "vitest";
import { datesInMonth, monthWeekStarts } from "./month";

describe("datesInMonth", () => {
  it.each([
    ["2024-02", 29, "2024-02-29"],
    ["2025-02", 28, "2025-02-28"],
    ["2026-04", 30, "2026-04-30"],
    ["2026-12", 31, "2026-12-31"],
  ])("returns all calendar dates in %s", (month, count, last) => {
    const dates = datesInMonth(month);
    expect(dates).toHaveLength(count);
    expect(dates[0]).toBe(`${month}-01`);
    expect(dates.at(-1)).toBe(last);
  });

  it.each(["2026-00", "2026-13", "2026-2", "0000-01", "not-a-month"])(
    "rejects invalid month %s",
    (month) => expect(() => datesInMonth(month)).toThrow(RangeError),
  );
});

describe("monthWeekStarts", () => {
  it("includes partial weeks crossing both month boundaries", () => {
    expect(monthWeekStarts("2026-11")).toEqual([
      "2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30",
    ]);
  });
});
