import type { Metadata } from "next";
import { auth } from "@/auth";
import { PlanWorkspace } from "@/components/plan/plan-workspace";
import {
  getStaffingProfileStatus,
  type StaffingProfileStatus,
  type StaffingSetting,
} from "@/lib/planning/staffing-settings";
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
  let staffingProfileStatus: StaffingProfileStatus = "unavailable";

  if (persistenceRuntime.configured) {
    try {
      initialStaffing = await persistenceRuntime.persistence.getStaffingSettings();
      staffingProfileStatus = getStaffingProfileStatus(initialStaffing);
    } catch {
      initialStaffing = null;
      staffingProfileStatus = "unavailable";
    }
  }

  return (
    <PlanWorkspace
      key={`${session?.user?.id ?? "anonymous"}:${session?.user?.role ?? "none"}`}
      runtime={runtime}
      canManage={session?.user?.role === "manager"}
      formOwnerId={session?.user?.id ?? null}
      initialStaffing={initialStaffing}
      staffingProfileStatus={staffingProfileStatus}
    />
  );
}
