export type AgencyDatabaseMode = "sqlite" | "supabase";

/**
 * Режим агентства (v1 /agency):
 * - по умолчанию — SQLite (`AGENCY_SQLITE_PATH` или `data/agency.db`), даже если заданы ключи Supabase для v2.
 * - `AGENCY_DATABASE=supabase` — Postgres (нужны URL + service key; иначе откат на SQLite).
 * - `AGENCY_DATABASE=sqlite` — явно SQLite.
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

/** true, если выбран режим Supabase и заданы URL + service key. */
export function shouldUseSupabaseAgency(): boolean {
  return getAgencyDatabaseMode() === "supabase" && isSupabaseAgencyConfigured();
}

/** Канбан / таймер / tt_users / monthly_history в Postgres — см. `lib/team-postgres-env.ts`, миграцию `supabase/migrations/20260512180000_team_tracker_pm_board_history.sql`, скрипт `npm run import-team-to-supabase`. Runtime пока SQLite. */
