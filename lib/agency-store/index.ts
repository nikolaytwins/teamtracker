import { isSupabaseAgencyConfigured } from "@/lib/agency-env";
export {
  getAgencyDatabaseMode,
  isSupabaseAgencyConfigured,
  shouldUseSupabaseAgency,
} from "@/lib/agency-env";
export type { AgencyDatabaseMode } from "@/lib/agency-env";
export { createSupabaseServiceClient } from "@/lib/supabase-service";
export { getAgencySqlitePath } from "@/lib/agency-sqlite";
export type { AgencyRepo, CreateProjectBody, UpdateProjectBody } from "./repo-interface";

import type { AgencyRepo } from "./repo-interface";
import { SqliteAgencyRepo } from "./sqlite-repo";
import { SupabaseAgencyRepo } from "./supabase-repo";

let sqliteSingleton: SqliteAgencyRepo | null = null;
let supabaseSingleton: SupabaseAgencyRepo | null = null;

/** v1 /agency и /api/agency — всегда локальный SQLite; env AGENCY_DATABASE не переключает v1. */
export function getAgencyRepoV1(): AgencyRepo {
  return (sqliteSingleton ??= new SqliteAgencyRepo());
}

/** v2 /v2/agency и /api/v2/agency — Postgres (Supabase). */
export function getAgencyRepoV2(): AgencyRepo {
  if (!isSupabaseAgencyConfigured()) {
    throw new Error("Supabase agency not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)");
  }
  return (supabaseSingleton ??= new SupabaseAgencyRepo());
}

/** @deprecated Используйте getAgencyRepoV1() или getAgencyRepoV2(). Сохранено для v1 API и интеграций. */
export function getAgencyRepo(): AgencyRepo {
  return getAgencyRepoV1();
}
