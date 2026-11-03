import type { Metadata } from "next";
import { auth } from "@/auth";
import { PlanWorkspace } from "@/components/plan/plan-workspace";
import { getCompleteStaffingSettings, type StaffingSetting } from "@/lib/planning/staffing-settings";
import { getPlanningPersistenceRuntime } from "@/lib/planning/persistence-runtime";
import { getMonthlyProviderRuntime } from "@/lib/planning/monthly-runtime";

export const metadata: Metadata = {
  title: "Plán směn",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PlanningPage() {
  const session = await auth();
  const runtime = getMonthlyProviderRuntime();
  const persistenceRuntime = getPlanningPersistenceRuntime();
  let initialStaffing: readonly StaffingSetting[] | null = null;

  if (persistenceRuntime.configured) {
    try {
      const settings = await persistenceRuntime.persistence.getStaffingSettings();
      initialStaffing = getCompleteStaffingSettings(settings);
    } catch {
      initialStaffing = null;
    }
  }

  return (
    <PlanWorkspace
      runtime={runtime}
      canManage={session?.user?.role === "manager"}
      initialStaffing={initialStaffing}
    />
  );
}
