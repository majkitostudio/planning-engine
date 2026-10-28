import { auth } from "@/auth";

import { toPlanningActor, type PlanningActor } from "./actor";
import { getActiveAuthRuntimeConfig } from "./local";

export type PlanningActorAccess =
  | { readonly ok: true; readonly actor: PlanningActor }
  | {
      readonly ok: false;
      readonly status: 401 | 503;
      readonly code:
        | "unauthorized"
        | "auth_not_configured"
        | "auth_invalid_config"
        | "auth_failed";
      readonly message: string;
    };

export async function requirePlanningActor(): Promise<PlanningActorAccess> {
  const runtime = getActiveAuthRuntimeConfig();
  if (!runtime.ok) {
    return {
      ok: false,
      status: 503,
      code: runtime.code,
      message: runtime.message,
    };
  }

  try {
    const actor = toPlanningActor(await auth());
    if (actor) return { ok: true, actor };
  } catch {
    return {
      ok: false,
      status: 503,
      code: "auth_failed",
      message: "Přihlášení se nepodařilo ověřit.",
    };
  }

  return {
    ok: false,
    status: 401,
    code: "unauthorized",
    message: "Pro použití plánovacího API je nutné přihlášení.",
  };
}
