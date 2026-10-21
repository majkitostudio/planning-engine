import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/section-placeholder";

export const metadata: Metadata = {
  title: "Požadavky",
};

export default function RequestsPage() {
  return (
    <SectionPlaceholder
      icon="clipboard"
      title="Požadavky"
      description="Požadavky zaměstnanců na směny, volno a absence. Zpracování zatím není implementováno."
    />
  );
}
