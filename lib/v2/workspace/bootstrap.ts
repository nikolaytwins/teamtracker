import { listUsersPublic } from "@/lib/tt-auth-db";
import type { TtUserRole } from "@/lib/roles";
import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import { V2_DEFAULT_WORKSPACE_ID } from "@/lib/v2/types";
import type { V2SessionContext, V2WorkspaceMemberRow } from "@/lib/v2/types";

const MEMBERS_SYNC_TTL_MS = 10 * 60 * 1000;
let membersSyncedAt = 0;
let membersSyncInFlight: Promise<void> | null = null;

const memberRowCache = new Map<string, V2WorkspaceMemberRow>();

const ctxCache = new Map<string, { ctx: V2SessionContext; at: number }>();
const CTX_CACHE_MS = 60_000;

type WorkspaceMemberView = V2WorkspaceMemberRow & {
  display_name: string;
  job_title: string;
  avatar_url: string | null;
};

const membersListCache: { at: number; data: WorkspaceMemberView[] } = {
  at: 0,
  data: [],
};
const MEMBERS_LIST_CACHE_MS = 5 * 60 * 1000;

const memberEnsureInFlight = new Map<string, Promise<V2WorkspaceMemberRow>>();
const ctxInFlight = new Map<string, Promise<V2SessionContext>>();

async function ensureWorkspaceMemberUncached(userId: string, role: TtUserRole): Promise<V2WorkspaceMemberRow> {
  const sb = getV2Supabase();
  const { data: existing } = await sb
    .from("v2_workspace_members")
    .select("*")
    .eq("workspace_id", V2_DEFAULT_WORKSPACE_ID)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const row = existing as V2WorkspaceMemberRow;
    memberRowCache.set(userId, row);
    return row;
  }

  const row = {
    workspace_id: V2_DEFAULT_WORKSPACE_ID,
    user_id: userId,
    role,
    weekly_hours_norm: 40,
    created_at: nowIso(),
  };

  const { data, error } = await sb.from("v2_workspace_members").insert(row).select("*").single();
  if (error) throw new Error(`ensureWorkspaceMember: ${error.message}`);
  const created = data as V2WorkspaceMemberRow;
  memberRowCache.set(userId, created);
  return created;
}

export async function ensureWorkspaceMember(userId: string, role: TtUserRole): Promise<V2WorkspaceMemberRow> {
  const hit = memberRowCache.get(userId);
  if (hit) return hit;

  let inflight = memberEnsureInFlight.get(userId);
  if (!inflight) {
    inflight = ensureWorkspaceMemberUncached(userId, role).finally(() => {
      memberEnsureInFlight.delete(userId);
    });
    memberEnsureInFlight.set(userId, inflight);
  }
  return inflight;
}

/** Синхронизирует всех tt_users в workspace members (идемпотентно). */
export async function syncAllWorkspaceMembers(): Promise<number> {
  const sb = getV2Supabase();
  const users = listUsersPublic();
  if (users.length === 0) return 0;

  const rows = users.map((u) => ({
    workspace_id: V2_DEFAULT_WORKSPACE_ID,
    user_id: u.id,
    role: u.role,
    weekly_hours_norm: u.weekly_capacity_hours ?? 40,
    created_at: nowIso(),
  }));

  const { error } = await sb.from("v2_workspace_members").upsert(rows, {
    onConflict: "workspace_id,user_id",
    ignoreDuplicates: true,
  });
  if (error) throw new Error(`syncAllWorkspaceMembers: ${error.message}`);
  return users.length;
}

/** Полная синхронизация участников — фоном, не чаще раза в 10 мин на инстанс. Не блокирует запросы. */
function maybeSyncAllWorkspaceMembers() {
  const now = Date.now();
  if (now - membersSyncedAt < MEMBERS_SYNC_TTL_MS) return;
  if (membersSyncInFlight) return;

  membersSyncInFlight = syncAllWorkspaceMembers()
    .then(() => {
      membersSyncedAt = Date.now();
    })
    .catch((e) => {
      console.warn("syncAllWorkspaceMembers:", e);
    })
    .finally(() => {
      membersSyncInFlight = null;
    });
}

export async function buildV2SessionContext(
  userId: string,
  userName: string,
  role: TtUserRole
): Promise<V2SessionContext> {
  const cached = ctxCache.get(userId);
  if (cached && Date.now() - cached.at < CTX_CACHE_MS) {
    return cached.ctx;
  }

  let inflight = ctxInFlight.get(userId);
  if (!inflight) {
    inflight = (async () => {
      maybeSyncAllWorkspaceMembers();
      await ensureWorkspaceMember(userId, role);
      const ctx: V2SessionContext = {
        userId,
        userName,
        role,
        workspaceId: V2_DEFAULT_WORKSPACE_ID,
      };
      ctxCache.set(userId, { ctx, at: Date.now() });
      return ctx;
    })().finally(() => {
      ctxInFlight.delete(userId);
    });
    ctxInFlight.set(userId, inflight);
  }
  return inflight;
}

export async function listWorkspaceMembers(): Promise<WorkspaceMemberView[]> {
  if (Date.now() - membersListCache.at < MEMBERS_LIST_CACHE_MS && membersListCache.data.length) {
    return membersListCache.data;
  }
  const data = await listWorkspaceMembersUncached();
  membersListCache.at = Date.now();
  membersListCache.data = data;
  return data;
}

async function listWorkspaceMembersUncached(): Promise<WorkspaceMemberView[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_workspace_members")
    .select("*")
    .eq("workspace_id", V2_DEFAULT_WORKSPACE_ID);
  if (error) throw new Error(error.message);

  const users = listUsersPublic();
  const byId = new Map(users.map((u) => [u.id, u]));

  return (data ?? []).map((m) => {
    const u = byId.get(m.user_id as string);
    return {
      ...(m as V2WorkspaceMemberRow),
      display_name: u?.display_name ?? m.user_id,
      job_title: u?.job_title ?? "",
      avatar_url: u?.avatar_url ?? null,
    };
  });
}
