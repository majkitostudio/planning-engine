import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/section-placeholder";

export const metadata: Metadata = {
  title: "Dovolené a absence",
};

export default function AbsencesPage() {
  return (
    <SectionPlaceholder
      icon="umbrella"
      title="Dovolené a absence"
      description="Evidence dovolených, nemocí a dalších absencí. Způsob evidence čeká na schválení doménového kontraktu."
    />
  );
}
