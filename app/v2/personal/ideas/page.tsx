import { redirect } from "next/navigation";
import { appPath } from "@/lib/api-url";

export default function PersonalIdeasPage() {
  redirect(appPath("/v2/personal/ideas-tasks?tab=ideas"));
}
