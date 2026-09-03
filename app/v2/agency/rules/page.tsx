import { redirect } from "next/navigation";
import { appPath } from "@/lib/api-url";

export default function V2AgencyRulesPage() {
  redirect(appPath("/v2/agency/plan?tab=rules"));
}
