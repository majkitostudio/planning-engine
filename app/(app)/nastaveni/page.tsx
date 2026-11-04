import type { Metadata } from "next";
import { auth } from "@/auth";
import { StaffingSettingsForm } from "@/components/settings/staffing-settings-form";
import { staffingSettingsPersistenceNotice } from "@/lib/settings-view";
import { getPlanningPersistenceRuntime } from "@/lib/planning/persistence-runtime";
import {
  getCompleteStaffingSettings,
  getStaffingProfileStatus,
  type StaffingProfileStatus,
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
  let savedSettingsCount = 0;
  let profileStatus: StaffingProfileStatus = getStaffingProfileStatus(
    [],
    persistenceRuntime.configured,
  );
  let notice = staffingSettingsPersistenceNotice(persistenceRuntime.configured);

  if (persistenceRuntime.configured) {
    try {
      const savedSettings = await persistenceRuntime.persistence.getStaffingSettings();
      savedSettingsCount = savedSettings.length;
      profileStatus = getStaffingProfileStatus(savedSettings);
      settings = getCompleteStaffingSettings(savedSettings);
    } catch {
      profileStatus = "unavailable";
      notice = "Nastavení se nepodařilo načíst. Zobrazuji výchozí minima podle dne a směny.";
    }
  }

  return (
    <StaffingSettingsForm
      initialSettings={settings}
      profileStatus={profileStatus}
      savedSettingsCount={savedSettingsCount}
      canEdit={session?.user?.role === "manager"}
      persistenceConfigured={persistenceRuntime.configured}
      notice={notice}
    />
  );
}
