import { createClient } from "@supabase/supabase-js";

/** Одноразовый вход на сервере: сессия Supabase в браузере не сохраняется, только проверка пароля. */
export async function signInWithSupabaseEmailPassword(
  email: string,
  password: string
): Promise<{ ok: true; supabaseUserId: string } | { ok: false }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return { ok: false };

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user?.id) return { ok: false };
  return { ok: true, supabaseUserId: data.user.id };
}
