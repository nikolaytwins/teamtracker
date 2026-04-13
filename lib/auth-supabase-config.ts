/** Включить вход через Supabase (signInWithPassword по email). Отключить: TEAM_TRACKER_SUPABASE_AUTH=0 */
export function isSupabasePasswordLoginConfigured(): boolean {
  if (process.env.TEAM_TRACKER_SUPABASE_AUTH?.trim() === "0") return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && anon);
}
