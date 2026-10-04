import { redirect } from "next/navigation";
import { appPath } from "@/lib/api-url";

export default async function PersonalIdeasTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  if (tab === "ideas") redirect(appPath("/v2/agency/plan?tab=ideas"));
  redirect(appPath("/v2/agency/plan"));
}
