export type AuthRole = "manager" | "viewer";

export interface AuthRuntimeConfig {
  readonly ok: true;
  readonly secret: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly issuer: string;
  readonly allowedEmailDomain: string;
  readonly managerEmails: readonly string[];
}

export interface AuthRuntimeConfigFailure {
  readonly ok: false;
  readonly code: "auth_not_configured" | "auth_invalid_config";
  readonly missing: readonly string[];
  readonly message: string;
}

export type AuthRuntimeConfigResult =
  | AuthRuntimeConfig
  | AuthRuntimeConfigFailure;

export interface AuthProfile {
  readonly sub?: unknown;
  readonly email?: unknown;
  readonly preferred_username?: unknown;
  readonly name?: unknown;
}

export interface AuthenticatedProfile {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: AuthRole;
}

type AuthEnvironment = Readonly<Record<string, string | undefined>>;

const DEFAULT_EMAIL_DOMAIN = "aaauto.cz";

export function getAuthRuntimeConfig(
  env: AuthEnvironment = process.env,
): AuthRuntimeConfigResult {
  const required = [
    "AUTH_SECRET",
    "AUTH_MICROSOFT_ENTRA_ID_ID",
    "AUTH_MICROSOFT_ENTRA_ID_SECRET",
    "AUTH_MICROSOFT_ENTRA_ID_ISSUER",
  ] as const;
  const missing = required.filter((name) => !env[name]?.trim());

  if (missing.length > 0) {
    return {
      ok: false,
      code: "auth_not_configured",
      missing,
      message:
        "Microsoft Entra přihlášení není nakonfigurované. Doplňte AUTH_SECRET a AUTH_MICROSOFT_ENTRA_ID_*.",
    };
  }

  const issuer = env.AUTH_MICROSOFT_ENTRA_ID_ISSUER!.trim().replace(/\/$/, "");
  if (
    !/^https:\/\/login\.microsoftonline\.com\/[^/]+\/v2\.0$/.test(issuer)
  ) {
    return {
      ok: false,
      code: "auth_invalid_config",
      missing: [],
      message:
        "AUTH_MICROSOFT_ENTRA_ID_ISSUER musí být tenant-specific issuer ve tvaru https://login.microsoftonline.com/<tenant-id>/v2.0.",
    };
  }

  const allowedEmailDomain = (
    env.PLANNING_ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase() ||
    DEFAULT_EMAIL_DOMAIN
  ).replace(/^@/, "");
  const managerEmails = (env.PLANNING_MANAGER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return {
    ok: true,
    secret: env.AUTH_SECRET!.trim(),
    clientId: env.AUTH_MICROSOFT_ENTRA_ID_ID!.trim(),
    clientSecret: env.AUTH_MICROSOFT_ENTRA_ID_SECRET!.trim(),
    issuer,
    allowedEmailDomain,
    managerEmails,
  };
}

export function mapAuthProfile(
  profile: AuthProfile,
  runtime: AuthRuntimeConfig,
): AuthenticatedProfile | null {
  const id = typeof profile.sub === "string" ? profile.sub.trim() : "";
  const rawEmail =
    typeof profile.email === "string"
      ? profile.email
      : typeof profile.preferred_username === "string"
        ? profile.preferred_username
        : "";
  const email = rawEmail.trim().toLowerCase();
  const domainSuffix = `@${runtime.allowedEmailDomain}`;

  if (!id || !email.endsWith(domainSuffix)) return null;

  const rawName = typeof profile.name === "string" ? profile.name.trim() : "";

  return {
    id,
    email,
    name: rawName || email,
    role: runtime.managerEmails.includes(email) ? "manager" : "viewer",
  };
}
