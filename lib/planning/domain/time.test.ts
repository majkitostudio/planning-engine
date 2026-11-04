import { describe, expect, it } from "vitest";
import { getZonedDateTimeStatus, zonedDateTimeToUtcMs } from "./time";

describe("místní časy v časové zóně", () => {
  it("rozliší platný, neexistující a nejednoznačný čas při změně času", () => {
    expect(getZonedDateTimeStatus("2026-03-29", "03:30", "Europe/Prague")).toBe("valid");
    expect(getZonedDateTimeStatus("2026-03-29", "02:30", "Europe/Prague")).toBe("nonexistent");
    expect(getZonedDateTimeStatus("2026-10-25", "02:30", "Europe/Prague")).toBe("ambiguous");
    expect(getZonedDateTimeStatus("2026-10-25", "03:30", "Europe/Prague")).toBe("valid");
  });

  it("nepřevede neexistující ani nejednoznačný místní čas na jeden odhadovaný okamžik", () => {
    expect(() => zonedDateTimeToUtcMs("2026-03-29", "02:30", "Europe/Prague")).toThrow(RangeError);
    expect(() => zonedDateTimeToUtcMs("2026-10-25", "02:30", "Europe/Prague")).toThrow(RangeError);
  });
});
