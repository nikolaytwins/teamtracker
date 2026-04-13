export type AgencyDatabaseMode = "sqlite" | "supabase";

/**
 * Режим агентства:
 * - `AGENCY_DATABASE=sqlite` — всегда SQLite.
 * - `AGENCY_DATABASE=supabase` — Supabase (нужны URL + service key; иначе репозиторий откатится на SQLite).
 * - не задано — если в env есть URL и service key, используется Supabase, иначе SQLite.
 */
export function getAgencyDatabaseMode(): AgencyDatabaseMode {
  const v = process.env.AGENCY_DATABASE?.trim().toLowerCase();
  if (v === "sqlite") return "sqlite";
  if (v === "supabase") return "supabase";
  if (isSupabaseAgencyConfigured()) return "supabase";
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
