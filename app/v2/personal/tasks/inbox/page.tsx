import { redirect } from "next/navigation";
import { appPath } from "@/lib/api-url";

export default function PersonalTasksInboxPage() {
  redirect(appPath("/v2/personal/ideas-tasks"));
}
