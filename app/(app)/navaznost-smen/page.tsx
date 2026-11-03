import type { Metadata } from "next";
import { auth } from "@/auth";
import { RosterHistoryPanel } from "@/components/roster-history-panel";

export const metadata: Metadata = { title: "Návaznost směn" };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function RosterHistoryPage() {
  const session = await auth();
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Europe/Prague", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")!.value;
  const month = parts.find((part) => part.type === "month")!.value;
  return <div className="roster-history-page"><RosterHistoryPanel canManage={session?.user?.role === "manager"} initialMonth={`${year}-${month}`} /></div>;
}
