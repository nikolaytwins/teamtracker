import { redirect } from "next/navigation";
import { appPath } from "@/lib/api-url";

export default function PersonalTasksCompletedPage() {
  redirect(appPath("/v2/personal/ideas-tasks"));
}
