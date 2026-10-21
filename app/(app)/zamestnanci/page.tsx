import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/section-placeholder";

export const metadata: Metadata = {
  title: "Zaměstnanci",
};

export default function EmployeesPage() {
  return (
    <SectionPlaceholder
      icon="users"
      title="Zaměstnanci"
      description="Přehled zaměstnanců call centra a jejich základní údaje. Data budou doplněna po schválení doménového modelu."
    />
  );
}
