import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Серверный клиент с service_role: обходит RLS. Не импортировать в клиентские компоненты.
 * Переменные: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
export function createSupabaseServiceClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY обязательны для режима Supabase"
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
