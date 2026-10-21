import type { Metadata } from "next";
import { PlanWorkspace } from "@/components/plan/plan-workspace";

export const metadata: Metadata = {
  title: "Plán směn",
};

export default function PlanningPage() {
  return <PlanWorkspace />;
}
