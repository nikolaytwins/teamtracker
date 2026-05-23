import { NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { listWorkspaceMembers } from "@/lib/v2/workspace/bootstrap";
import { getV2Supabase } from "@/lib/v2/db/client";
import { getUserById, syncUsersFromEnv } from "@/lib/tt-auth-db";

export async function GET() {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;

  syncUsersFromEnv();
  const ttUser = getUserById(auth.ctx.userId);

  const sb = getV2Supabase();
  const { data: workspace } = await sb
    .from("v2_workspaces")
    .select("*")
    .eq("id", auth.ctx.workspaceId)
    .single();

  const members = await listWorkspaceMembers();

  return NextResponse.json({
    user: {
      id: auth.ctx.userId,
      name: auth.ctx.userName,
      role: auth.ctx.role,
      login: ttUser?.login ?? "",
      title: ttUser?.job_title ?? "",
      avatarUrl: ttUser?.avatar_url ?? null,
    },
    workspace,
    members,
  });
}
