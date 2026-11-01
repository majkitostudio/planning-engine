import { describe, expect, it } from "vitest";

import {
  isPublicAuthPath,
  needsForcedPasswordChange,
  shouldProtectPagePath,
} from "./protection";

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

  it("při dočasném hesle ponechá dostupnou jen změnu hesla a odhlášení", () => {
    expect(needsForcedPasswordChange("/planovani", true)).toBe(true);
    expect(needsForcedPasswordChange("/api/planning/run", true)).toBe(true);
    expect(needsForcedPasswordChange("/zmena-hesla", true)).toBe(false);
    expect(needsForcedPasswordChange("/api/auth/change-password", true)).toBe(false);
    expect(needsForcedPasswordChange("/api/auth/signout", true)).toBe(false);
    expect(needsForcedPasswordChange("/planovani", false)).toBe(false);
  });
});
