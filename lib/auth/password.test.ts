import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("stores a salted hash that verifies only the original password", async () => {
    const encodedHash = await hashPassword("correct horse battery staple");

    await expect(
      verifyPassword("correct horse battery staple", encodedHash),
    ).resolves.toBe(true);
    await expect(verifyPassword("incorrect password", encodedHash)).resolves.toBe(
      false,
    );
  });

  it("uses a distinct salt for each stored password hash", async () => {
    const first = await hashPassword("correct horse battery staple");
    const second = await hashPassword("correct horse battery staple");

    expect(first).not.toBe(second);
  });

  it("rejects malformed and unsupported password hashes", async () => {
    await expect(verifyPassword("any password here", "not-a-hash")).resolves.toBe(
      false,
    );
    await expect(
      verifyPassword("any password here", "scrypt$v99$salt$key"),
    ).resolves.toBe(false);
  });

  it("rejects passwords outside the supported length range", async () => {
    await expect(hashPassword("too short")).rejects.toThrow();
    await expect(hashPassword("x".repeat(129))).rejects.toThrow();
  });
});
