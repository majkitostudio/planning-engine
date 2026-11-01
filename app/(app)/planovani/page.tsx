import type { Metadata } from "next";
import { auth } from "@/auth";
import { PlanWorkspace } from "@/components/plan/plan-workspace";
import { applyStaffingSettings, getCompleteStaffingSettings, type StaffingSetting } from "@/lib/planning/staffing-settings";
import { getPlanningPersistenceRuntime } from "@/lib/planning/persistence-runtime";
import { getReplacementTargetSummary } from "@/lib/planning/replacement-service";
import { getPlanningRuntime } from "@/lib/planning/server-config";
import { getSimulatedReplacementScenario } from "@/lib/planning/simulated/replacement-scenarios";

export const metadata: Metadata = {
  title: "Plán směn",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PlanningPage() {
  const session = await auth();
  const runtime = getPlanningRuntime();
  const scenario = getSimulatedReplacementScenario("single-absence");
  let replacementTargetSummary = scenario
    ? getReplacementTargetSummary(scenario.input, scenario.basePlan, scenario.request)
    : null;
  const persistenceRuntime = getPlanningPersistenceRuntime();
  let initialStaffing: readonly StaffingSetting[] | null = null;

  if (scenario && persistenceRuntime.configured) {
    try {
      const settings = await persistenceRuntime.persistence.getStaffingSettings();
      initialStaffing = getCompleteStaffingSettings(settings);
      const input = applyStaffingSettings(scenario.input, settings);
      replacementTargetSummary = getReplacementTargetSummary(
        input,
        scenario.basePlan,
        scenario.request,
      );
    } catch {
      replacementTargetSummary = null;
    }
  }

  return (
    <PlanWorkspace
      runtime={runtime}
      replacementTargetSummary={replacementTargetSummary}
      canManage={session?.user?.role === "manager"}
      initialStaffing={initialStaffing}
    />
  );
}
