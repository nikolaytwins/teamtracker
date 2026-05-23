import { getV2Supabase } from "@/lib/v2/db/client";
import { canViewTask } from "@/lib/v2/auth/permissions";
import type { V2InboxBucket, V2SessionContext, V2TaskRow } from "@/lib/v2/types";

export async function listInboxTasks(
  ctx: V2SessionContext
): Promise<Record<V2InboxBucket, V2TaskRow[]>> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_tasks")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .is("deleted_at", null)
    .is("parent_id", null)
    .is("completed_at", null)
    .not("inbox_bucket", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const buckets: Record<V2InboxBucket, V2TaskRow[]> = {
    this_week: [],
    this_month: [],
    someday: [],
  };
  for (const row of (data ?? []) as V2TaskRow[]) {
    if (!canViewTask(ctx, row)) continue;
    const b = row.inbox_bucket;
    if (b && buckets[b]) buckets[b].push(row);
  }
  return buckets;
}

export async function setInboxBucket(
  ctx: V2SessionContext,
  taskId: string,
  bucket: V2InboxBucket | null
): Promise<void> {
  const sb = getV2Supabase();
  const { error } = await sb
    .from("v2_tasks")
    .update({ inbox_bucket: bucket, updated_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
}
