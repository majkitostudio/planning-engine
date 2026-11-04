export type PlanningIntentActor = "manager";

export type PlanningIntentTranslation =
  | {
      readonly version: 1;
      readonly status: "recognized";
      readonly intent: "shift_rotation_preference";
      readonly enabled: boolean;
    }
  | { readonly version: 1; readonly status: "ambiguous" }
  | { readonly version: 1; readonly status: "unsupported" };

export interface PlanningIntentTranslator {
  translate(text: string, actor: PlanningIntentActor): Promise<PlanningIntentTranslation>;
}

const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
};

/** Runtime allowlist for model output. Unknown fields and versions fail closed. */
export function isPlanningIntentTranslation(value: unknown): value is PlanningIntentTranslation {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== 1 || typeof candidate.status !== "string") return false;

  if (candidate.status === "recognized") {
    return hasExactKeys(candidate, ["version", "status", "intent", "enabled"])
      && candidate.intent === "shift_rotation_preference"
      && typeof candidate.enabled === "boolean";
  }

  return (candidate.status === "ambiguous" || candidate.status === "unsupported")
    && hasExactKeys(candidate, ["version", "status"]);
}

/** Expose an AI-derived S6 value to planning only after explicit manager approval. */
export function getApprovedShiftRotationPreference(
  translation: PlanningIntentTranslation,
  managerApproved: boolean,
): boolean | undefined {
  if (!managerApproved || translation.status !== "recognized") return undefined;
  return translation.enabled;
}
