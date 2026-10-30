import type { Metadata } from "next";
import { auth } from "@/auth";
import { StaffingSettingsForm } from "@/components/settings/staffing-settings-form";
import { getPlanningPersistenceRuntime } from "@/lib/planning/persistence-runtime";
import {
  getCompleteStaffingSettings,
  type StaffingSetting,
} from "@/lib/planning/staffing-settings";

export const metadata: Metadata = {
  title: "Nastavení",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  const persistenceRuntime = getPlanningPersistenceRuntime();
  let settings: readonly StaffingSetting[] = getCompleteStaffingSettings([]);
  let notice = persistenceRuntime.configured ? null : persistenceRuntime.reason;

  if (persistenceRuntime.configured) {
    try {
      settings = getCompleteStaffingSettings(
        await persistenceRuntime.persistence.getStaffingSettings(),
      );
    } catch {
      notice = "Nastavení se nepodařilo načíst. Zobrazuji výchozí minima podle dne a směny.";
    }
  }

  return (
    <StaffingSettingsForm
      initialSettings={settings}
      canEdit={session?.user?.role === "manager"}
      persistenceConfigured={persistenceRuntime.configured}
      notice={notice}
    />
  );
}
