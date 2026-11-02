import { describe, expect, it } from "vitest";
import { shouldInitiallyOpenFutureFeatures } from "@/lib/navigation";

describe("shouldInitiallyOpenFutureFeatures", () => {
  it("keeps the group closed on the normal post-login pages", () => {
    expect(shouldInitiallyOpenFutureFeatures("/")).toBe(false);
    expect(shouldInitiallyOpenFutureFeatures("/planovani")).toBe(false);
  });

  it("opens the group when a user enters through a direct future-page link", () => {
    expect(shouldInitiallyOpenFutureFeatures("/pravidla")).toBe(true);
    expect(shouldInitiallyOpenFutureFeatures("/audit")).toBe(true);
    expect(shouldInitiallyOpenFutureFeatures("/uzivatele/123")).toBe(true);
  });
});
