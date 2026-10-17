import { appPath } from "@/lib/api-url";
import { redirect } from "next/navigation";

export default function PersonalWishesPage() {
  redirect(appPath("/v2/personal/goals?tab=wishes"));
}
