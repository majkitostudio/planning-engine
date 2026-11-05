import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/section-placeholder";

export const metadata: Metadata = {
  title: "Analýzy",
};

export default function AnalyticsPage() {
  return (
    <SectionPlaceholder
      icon="chart"
      title="Analýzy"
      description="Přehledy pokrytí, vytížení a dalších ukazatelů z potvrzených rozpisů. Implementace analytiky je plánována (Milník 2)."
    />
  );
}
