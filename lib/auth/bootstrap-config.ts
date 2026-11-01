export interface BootstrapManagerConfig {
  readonly connectionString: string;
  readonly email: string;
  readonly displayName: string;
  readonly temporaryPassword: string;
}

export type BootstrapManagerConfigResult =
  | { readonly ok: true; readonly config: BootstrapManagerConfig }
  | { readonly ok: false; readonly message: string };

type BootstrapEnvironment = Readonly<Record<string, string | undefined>>;

const REQUIRED_KEYS = [
  "DATABASE_URL",
  "BOOTSTRAP_MANAGER_EMAIL",
  "BOOTSTRAP_MANAGER_NAME",
  "BOOTSTRAP_MANAGER_PASSWORD",
] as const;

export function getBootstrapManagerConfig(
  env: BootstrapEnvironment = process.env,
): BootstrapManagerConfigResult {
  const missing = REQUIRED_KEYS.filter((key) => !env[key]?.trim());
  if (missing.length > 0) {
    return {
      ok: false,
      message: `Chybí povinná konfigurace: ${missing.join(", ")}.`,
    };
  }

  return {
    ok: true,
    config: {
      connectionString: env.DATABASE_URL!.trim(),
      email: env.BOOTSTRAP_MANAGER_EMAIL!.trim(),
      displayName: env.BOOTSTRAP_MANAGER_NAME!.trim(),
      temporaryPassword: env.BOOTSTRAP_MANAGER_PASSWORD!,
    },
  };
}
