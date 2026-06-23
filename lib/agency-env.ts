export type AgencyDatabaseMode = "sqlite" | "supabase";

/**
 * Хранилище агентства разделено по версиям UI:
 * - v1 `/agency` и `/api/agency/**` — всегда SQLite (`AGENCY_SQLITE_PATH` или `data/agency.db`).
 * - v2 `/v2/agency` и `/api/v2/agency/**` — Postgres в Supabase (ключи URL + service role).
 *
 * Переменная `AGENCY_DATABASE` больше не переключает v1. Импорт SQLite → Supabase: `npm run import-agency-to-supabase`.
 */
export function getAgencyDatabaseMode(): AgencyDatabaseMode {
  const v = process.env.AGENCY_DATABASE?.trim().toLowerCase();
  if (v === "sqlite") return "sqlite";
  if (v === "supabase") return "supabase";
  return "sqlite";
}

export function isSupabaseAgencyConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

/** @deprecated v1 всегда SQLite; для v2 используется getAgencyRepoV2(). */
export function shouldUseSupabaseAgency(): boolean {
  return getAgencyDatabaseMode() === "supabase" && isSupabaseAgencyConfigured();
}

/** Канбан / таймер / tt_users / monthly_history в Postgres — см. `lib/team-postgres-env.ts`, миграцию `supabase/migrations/20260512180000_team_tracker_pm_board_history.sql`, скрипт `npm run import-team-to-supabase`. Runtime пока SQLite. */
