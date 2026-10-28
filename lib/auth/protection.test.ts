import { describe, expect, it } from "vitest";

import { isPublicAuthPath, shouldProtectPagePath } from "./protection";

describe("auth path protection", () => {
  it("ponechá veřejnou login stránku a Auth.js callbacky", () => {
    expect(isPublicAuthPath("/prihlaseni")).toBe(true);
    expect(isPublicAuthPath("/api/auth/signin")).toBe(true);
    expect(isPublicAuthPath("/api/auth/callback/microsoft-entra-id")).toBe(true);
    expect(isPublicAuthPath("/icon.svg")).toBe(true);
  });

  it("chrání stránky aplikace, ale proxy neobsluhuje API cesty", () => {
    expect(shouldProtectPagePath("/")).toBe(true);
    expect(shouldProtectPagePath("/planovani")).toBe(true);
    expect(shouldProtectPagePath("/api/planning/run")).toBe(false);
    expect(shouldProtectPagePath("/api/planning/confirm")).toBe(false);
  });
});
