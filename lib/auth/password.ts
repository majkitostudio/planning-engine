import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const PASSWORD_MIN_CODE_POINTS = 12;
const PASSWORD_MAX_CODE_POINTS = 128;
const SCRYPT_COST = 32_768;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const SCRYPT_MAX_MEMORY_BYTES = 64 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  validatePasswordLength(password);

  const salt = randomBytes(SALT_BYTES);
  const derivedKey = await deriveKey(password, salt);

  return [
    "scrypt",
    "v1",
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const parsed = parseEncodedHash(encodedHash);
  if (!parsed) return false;

  let candidate: Buffer;
  try {
    candidate = await deriveKey(password, parsed.salt);
  } catch {
    return false;
  }

  return timingSafeEqual(candidate, parsed.derivedKey);
}

export function validatePasswordLength(password: string): void {
  const length = Array.from(password).length;
  if (length < PASSWORD_MIN_CODE_POINTS || length > PASSWORD_MAX_CODE_POINTS) {
    throw new Error(
      `Heslo musí mít ${PASSWORD_MIN_CODE_POINTS} až ${PASSWORD_MAX_CODE_POINTS} znaků.`,
    );
  }
}

function deriveKey(password: string, salt: Uint8Array): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_BYTES,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
        maxmem: SCRYPT_MAX_MEMORY_BYTES,
      },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}

function parseEncodedHash(
  encodedHash: string,
): { readonly salt: Buffer; readonly derivedKey: Buffer } | null {
  const parts = encodedHash.split("$");
  if (
    parts.length !== 7 ||
    parts[0] !== "scrypt" ||
    parts[1] !== "v1" ||
    parts[2] !== String(SCRYPT_COST) ||
    parts[3] !== String(SCRYPT_BLOCK_SIZE) ||
    parts[4] !== String(SCRYPT_PARALLELIZATION) ||
    !/^[A-Za-z0-9_-]+$/.test(parts[5]) ||
    !/^[A-Za-z0-9_-]+$/.test(parts[6])
  ) {
    return null;
  }

  const salt = Buffer.from(parts[5], "base64url");
  const derivedKey = Buffer.from(parts[6], "base64url");
  if (salt.length !== SALT_BYTES || derivedKey.length !== KEY_BYTES) return null;

  return { salt, derivedKey };
}
