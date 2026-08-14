import { redirect } from "next/navigation";
import { appPath } from "@/lib/api-url";

export default function V2SalesProfiPage() {
  redirect(appPath("/v2/admin/leads/profi"));
}
