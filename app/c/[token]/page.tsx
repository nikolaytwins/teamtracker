import { notFound } from "next/navigation";
import { AgencyClientEstimateView } from "@/components/agency/agency-client-estimate-view";
import { isClientShareToken } from "@/lib/agency/client-share";
import { loadPublicClientEstimate } from "@/lib/agency/load-public-client-estimate";
import { getAgencyRepoV1, getAgencyRepoV2, isSupabaseAgencyConfigured } from "@/lib/agency-store";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isClientShareToken(token)) return { title: "Смета" };
  try {
    const repo = isSupabaseAgencyConfigured() ? getAgencyRepoV2() : getAgencyRepoV1();
    const data = await loadPublicClientEstimate(repo, token);
    if (!data) return { title: "Смета" };
    return { title: `${data.name} — смета` };
  } catch {
    return { title: "Смета" };
  }
}

export default async function PublicClientEstimatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isClientShareToken(token)) {
    notFound();
  }
  try {
    const repo = isSupabaseAgencyConfigured() ? getAgencyRepoV2() : getAgencyRepoV1();
    const data = await loadPublicClientEstimate(repo, token);
    if (!data) notFound();
    return <AgencyClientEstimateView data={data} />;
  } catch (error) {
    console.error("public client estimate", error);
    notFound();
  }
}
