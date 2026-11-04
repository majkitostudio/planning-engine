import { describe, expect, it } from "vitest";

import { isPlanningIntentTranslation } from "./intent-translator";

describe("isPlanningIntentTranslation", () => {
  it.each([
    [{ version: 1, status: "recognized", intent: "shift_rotation_preference", enabled: true }, true],
    [{ version: 1, status: "recognized", intent: "shift_rotation_preference", enabled: false }, true],
    [{ version: 1, status: "ambiguous" }, true],
    [{ version: 1, status: "unsupported" }, true],
  ])("validates the supported result %j", (value, expected) => {
    expect(isPlanningIntentTranslation(value)).toBe(expected);
  });

  it.each([
    { version: 2, status: "ambiguous" },
    { version: 1, status: "recognized", intent: "weekend_fairness", enabled: true },
    { version: 1, status: "recognized", intent: "shift_rotation_preference", enabled: "yes" },
    { version: 1, status: "recognized", intent: "shift_rotation_preference" },
    { version: 1, status: "ambiguous", enabled: true },
    { version: 1, status: "unsupported", rule: "invented" },
    { version: 1, status: "unsupported", explanation: "free-form model output" },
    null,
    [],
  ])("rejects invalid or extended output %j", (value) => {
    expect(isPlanningIntentTranslation(value)).toBe(false);
  });
});
