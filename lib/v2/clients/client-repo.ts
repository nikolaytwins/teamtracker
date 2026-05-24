import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import type { V2SessionContext } from "@/lib/v2/types";

export type V2ClientRow = {
  id: string;
  workspace_id: string;
  display_name: string;
  normalized_name: string;
  created_at: string;
  updated_at: string;
};

export function normalizeClientName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function searchClients(
  ctx: V2SessionContext,
  query: string,
  limit = 8
): Promise<Array<Pick<V2ClientRow, "id" | "display_name">>> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_clients")
    .select("id, display_name")
    .eq("workspace_id", ctx.workspaceId)
    .ilike("display_name", `%${trimmed}%`)
    .order("display_name")
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function findOrCreateClient(ctx: V2SessionContext, displayName: string): Promise<string> {
  const trimmed = displayName.trim().replace(/\s+/g, " ");
  if (!trimmed) throw new Error("clientName required");

  const normalized = normalizeClientName(trimmed);
  const sb = getV2Supabase();

  const { data: existing, error: findErr } = await sb
    .from("v2_clients")
    .select("id")
    .eq("workspace_id", ctx.workspaceId)
    .eq("normalized_name", normalized)
    .maybeSingle();

  if (findErr) throw new Error(findErr.message);
  if (existing?.id) return existing.id as string;

  const id = newV2Id();
  const ts = nowIso();
  const { error } = await sb.from("v2_clients").insert({
    id,
    workspace_id: ctx.workspaceId,
    display_name: trimmed,
    normalized_name: normalized,
    created_at: ts,
    updated_at: ts,
  });

  if (error) throw new Error(error.message);
  return id;
}
