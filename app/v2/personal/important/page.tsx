import { appPath } from "@/lib/api-url";
import { redirect } from "next/navigation";

export default function PersonalImportantPage() {
  redirect(appPath("/v2/personal/life-important"));
}
