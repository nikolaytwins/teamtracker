import { redirect } from "next/navigation";
import { appPath } from "@/lib/api-url";

export default function TeamLoadRedirectPage() {
  redirect(appPath("/admin/dashboard"));
}
