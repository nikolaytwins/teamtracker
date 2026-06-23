import { NextResponse } from "next/server";
import type { AgencyRepo } from "@/lib/agency-store/repo-interface";
import { getAgencyRepoV2, isSupabaseAgencyConfigured } from "@/lib/agency-store";

export function agencyV2NotConfiguredResponse() {
  return NextResponse.json(
    {
      error:
        "Supabase agency не настроен. Задайте NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY, примените миграции и выполните npm run import-agency-to-supabase.",
    },
    { status: 503 }
  );
}

export async function withAgencyRepoV2<T>(
  fn: (repo: AgencyRepo) => Promise<T>
): Promise<T | NextResponse> {
  if (!isSupabaseAgencyConfigured()) {
    return agencyV2NotConfiguredResponse();
  }
  return fn(getAgencyRepoV2());
}
