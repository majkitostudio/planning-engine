import type { Metadata } from "next";
import { PlanWorkspace } from "@/components/plan/plan-workspace";
import { getPlanningRuntime } from "@/lib/planning/server-config";

export const metadata: Metadata = {
  title: "Plán směn",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PlanningPage() {
  const runtime = getPlanningRuntime();

  return <PlanWorkspace runtime={runtime} />;
}