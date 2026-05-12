/**
 * Хранение канбана, таймера, tt_users и monthly_history в Postgres (Supabase).
 *
 * Схема: `supabase/migrations/20260512180000_team_tracker_pm_board_history.sql` — применить в SQL Editor проекта.
 * Импорт данных из локальных SQLite: `npm run import-team-to-supabase`
 *
 * Дальше (следующий шаг разработки): подключить runtime через `pg` и `DATABASE_URL`
 * (строка подключения к Postgres из Supabase → Settings → Database → URI, режим pooler или direct),
 * чтобы `lib/db.ts` / таймер / история читали из Postgres вместо `data/pm-board.db` и `data/agency.db`.
 * Пока приложение по-прежнему использует только SQLite для этих сущностей.
 */

export function getTeamPostgresConnectionString(): string | null {
  const u = process.env.SUPABASE_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  return u || null;
}

/** Достаточно для импорта и будущего runtime через pg. */
export function isSupabaseServiceConfiguredForTeamImport(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}
