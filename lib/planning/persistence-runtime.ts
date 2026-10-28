import { InMemoryPlanningPersistence, PrismaPlanningPersistence, type PlanningPersistence } from "./persistence";

export type PlanningPersistenceMode = "memory" | "prisma";

export type PlanningPersistenceRuntime =
  | {
      readonly configured: true;
      readonly mode: PlanningPersistenceMode;
      readonly persistence: PlanningPersistence;
    }
  | {
      readonly configured: false;
      readonly reason: string;
    };

let memoryPersistence: InMemoryPlanningPersistence | undefined;

export function getPlanningPersistenceRuntime(
  env: Readonly<Record<string, string | undefined>> = process.env,
): PlanningPersistenceRuntime {
  const mode = env.PLANNING_PERSISTENCE?.trim().toLowerCase();

  if (mode === "memory") {
    memoryPersistence ??= new InMemoryPlanningPersistence();
    return { configured: true, mode: "memory", persistence: memoryPersistence };
  }

  if (mode === "prisma" && env.DATABASE_URL?.trim()) {
    return {
      configured: true,
      mode: "prisma",
      persistence: new PrismaPlanningPersistence(),
    };
  }

  if (!mode) {
    return {
      configured: false,
      reason:
        "Perzistence není nakonfigurovaná. Pro běh aplikace nastav PLANNING_PERSISTENCE=prisma a DATABASE_URL; memory je určena pouze pro testy.",
    };
  }

  if (mode === "prisma") {
    return {
      configured: false,
      reason:
        "PLANNING_PERSISTENCE=prisma vyžaduje nastavenou DATABASE_URL. Aplikace bez ní nespustí plánovací běh.",
    };
  }

  return {
    configured: false,
    reason:
      `Neznámý režim perzistence "${mode}". Použij prisma pro aplikaci nebo memory pouze pro testy.`,
  };
}
