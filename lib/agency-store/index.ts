import { shouldUseSupabaseAgency } from "@/lib/agency-env";
export { getAgencyDatabaseMode, isSupabaseAgencyConfigured, shouldUseSupabaseAgency } from "@/lib/agency-env";
export type { AgencyDatabaseMode } from "@/lib/agency-env";
export { createSupabaseServiceClient } from "@/lib/supabase-service";
export { getAgencySqlitePath } from "@/lib/agency-sqlite";
export type { AgencyRepo, CreateProjectBody, UpdateProjectBody } from "./repo-interface";

import type { AgencyRepo } from "./repo-interface";
import { SqliteAgencyRepo } from "./sqlite-repo";
import { SupabaseAgencyRepo } from "./supabase-repo";

let sqliteSingleton: SqliteAgencyRepo | null = null;
let supabaseSingleton: SupabaseAgencyRepo | null = null;

export function getAgencyRepo(): AgencyRepo {
  if (shouldUseSupabaseAgency()) {
    return (supabaseSingleton ??= new SupabaseAgencyRepo());
  }
  return (sqliteSingleton ??= new SqliteAgencyRepo());
}
