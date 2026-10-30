import type { Metadata } from "next";
import { RequestApprovalPanel } from "@/components/requests/request-approval-panel";

export const metadata: Metadata = {
  title: "Požadavky",
};

export default function RequestsPage() {
  return <RequestApprovalPanel />;
}
