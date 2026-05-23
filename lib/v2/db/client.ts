import { createSupabaseServiceClient } from "@/lib/supabase-service";

export function getV2Supabase() {
  return createSupabaseServiceClient();
}

export function isV2SupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && key);
}

export function newV2Id(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
