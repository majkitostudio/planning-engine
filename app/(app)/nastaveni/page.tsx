import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/section-placeholder";

export const metadata: Metadata = {
  title: "Nastavení",
};

export default function SettingsPage() {
  return (
    <SectionPlaceholder
      icon="settings"
      title="Nastavení"
      description="Nastavení prostředí, plánovacích období a budoucích integrací. Zatím jde o připravenou strukturu."
    />
  );
}
