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
      description="Absence a dostupnost se zadávají jako vstupy měsíčního plánování. Samostatná evidence mimo plán zatím není implementovaná."
    />
  );
}
