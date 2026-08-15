import { redirect } from "next/navigation";
import { appPath } from "@/lib/api-url";

export default function PersonalDashboardPage() {
  redirect(appPath("/v2/personal/dashboard/youtube"));
}
