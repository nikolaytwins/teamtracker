import { redirect } from "next/navigation";
import { appPath } from "@/lib/api-url";

export default function V2AdminDashboardPage() {
  redirect(appPath("/v2/agency/overview"));
}
