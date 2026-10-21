import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/section-placeholder";

export const metadata: Metadata = {
  title: "Pravidla",
};

export default function RulesPage() {
  return (
    <SectionPlaceholder
      icon="shield"
      title="Pravidla"
      description="Provozní a plánovací pravidla, ze kterých bude engine vycházet. Konkrétní pravidla nejsou schválena."
    />
  );
}
