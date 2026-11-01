import type { Metadata } from "next";
import { auth } from "@/auth";
import { EmployeesManager } from "@/components/employees-manager";

export const metadata: Metadata = {
  title: "Zaměstnanci",
};

export default async function EmployeesPage() {
  const session = await auth();
  return <EmployeesManager canManage={session?.user?.role === "manager"} />;
}
