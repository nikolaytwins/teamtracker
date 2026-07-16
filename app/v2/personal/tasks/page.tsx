import { redirect } from "next/navigation";
import { appPath } from "@/lib/api-url";

export default function PersonalTasksIndexPage() {
  redirect(appPath("/v2/personal/tasks/inbox"));
}
