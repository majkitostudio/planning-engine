import { describe, expect, it } from "vitest";

import { getPlanningPersistenceRuntime } from "./persistence-runtime";

describe("planning persistence runtime", () => {
  it("mimo testy odmítne in-memory perzistenci", () => {
    expect(
      getPlanningPersistenceRuntime({
        NODE_ENV: "production",
        PLANNING_PERSISTENCE: "memory",
      }),
    ).toMatchObject({
      configured: false,
      reason: expect.stringContaining("pouze pro testy"),
    });
  });

  it("v testech zpřístupní in-memory perzistenci", () => {
    expect(
      getPlanningPersistenceRuntime({
        NODE_ENV: "test",
        PLANNING_PERSISTENCE: "memory",
      }),
    ).toMatchObject({
      configured: true,
      mode: "memory",
    });
  });
});
