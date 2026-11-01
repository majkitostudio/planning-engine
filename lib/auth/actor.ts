import type { AuthRole } from "./config";

export interface PlanningActor {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: AuthRole;
}

export interface AuthSessionLike {
  readonly user?: {
    readonly id?: string | null;
    readonly email?: string | null;
    readonly name?: string | null;
    readonly role?: AuthRole;
    readonly mustChangePassword?: boolean;
  } | null;
}

export function toPlanningActor(
  session: AuthSessionLike | null | undefined,
): PlanningActor | null {
  const user = session?.user;
  if (!user?.id || !user.email || !user.role) return null;

  return {
    userId: user.id,
    email: user.email,
    displayName: user.name?.trim() || user.email,
    role: user.role,
  };
}

export function canConfirmPlanning(actor: PlanningActor): boolean {
  return actor.role === "manager";
}
