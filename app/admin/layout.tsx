import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { appPath } from "@/lib/api-url";
import { getServerSession } from "@/lib/get-session";
import { canAccessAgencyRoutes } from "@/lib/roles";
import { effectiveUserRole } from "@/lib/require-role";
import AppShell from "@/components/AppShell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session) {
    redirect(appPath("/login"));
  }
  if (!canAccessAgencyRoutes(effectiveUserRole(session))) {
    redirect(appPath("/me"));
  }
  return <AppShell>{children}</AppShell>;
}
