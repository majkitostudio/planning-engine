import { auth } from "@/auth";

import { toPlanningActor, type PlanningActor } from "./actor";
import { getActiveAuthRuntimeConfig } from "./local";

export type PlanningActorAccess =
  | { readonly ok: true; readonly actor: PlanningActor }
  | {
      readonly ok: false;
      readonly status: 401 | 403 | 503;
      readonly code:
        | "unauthorized"
        | "forbidden"
        | "password_change_required"
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
    const session = await auth();
    if (session?.user?.mustChangePassword) {
      return {
        ok: false,
        status: 403,
        code: "password_change_required",
        message: "Před použitím aplikace změňte dočasné heslo.",
      };
    }
    const actor = toPlanningActor(session);
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

export async function requirePlanningManager(): Promise<PlanningActorAccess> {
  const access = await requirePlanningActor();
  if (!access.ok || access.actor.role === "manager") return access;

  return {
    ok: false,
    status: 403,
    code: "forbidden",
    message: "Tuto akci může provést pouze manažer.",
  };
}
