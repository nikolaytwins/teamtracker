import { redirect } from "next/navigation";
import { appPath } from "@/lib/api-url";

export default function PersonalArticlesPage() {
  redirect(appPath("/v2/personal/sexuality"));
}
