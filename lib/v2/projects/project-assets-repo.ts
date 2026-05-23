import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import { getProjectById } from "@/lib/v2/projects/project-repo";
import type { V2SessionContext } from "@/lib/v2/types";

export type V2ProjectLinkRow = {
  id: string;
  project_id: string;
  url: string;
  title: string | null;
  is_primary: boolean;
  created_by: string;
  created_at: string;
};

export type V2ProjectFileRow = {
  id: string;
  project_id: string;
  name: string;
  url: string;
  size_bytes: number | null;
  kind: string | null;
  created_by: string;
  created_at: string;
};

export async function listProjectLinks(projectId: string): Promise<V2ProjectLinkRow[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_project_links")
    .select("*")
    .eq("project_id", projectId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as V2ProjectLinkRow[];
}

export async function addProjectLink(
  ctx: V2SessionContext,
  projectId: string,
  input: { url: string; title?: string; isPrimary?: boolean }
): Promise<V2ProjectLinkRow> {
  const project = await getProjectById(ctx, projectId);
  if (!project) throw new Error("Project not found");

  const sb = getV2Supabase();
  const row: V2ProjectLinkRow = {
    id: newV2Id(),
    project_id: projectId,
    url: input.url.trim(),
    title: input.title?.trim() || null,
    is_primary: input.isPrimary ?? false,
    created_by: ctx.userId,
    created_at: nowIso(),
  };
  const { error } = await sb.from("v2_project_links").insert(row);
  if (error) throw new Error(error.message);
  return row;
}

export async function listProjectFiles(projectId: string): Promise<V2ProjectFileRow[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_project_files")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as V2ProjectFileRow[];
}

export async function addProjectFile(
  ctx: V2SessionContext,
  projectId: string,
  input: { name: string; url: string; sizeBytes?: number | null; kind?: string | null }
): Promise<V2ProjectFileRow> {
  const project = await getProjectById(ctx, projectId);
  if (!project) throw new Error("Project not found");

  const sb = getV2Supabase();
  const row: V2ProjectFileRow = {
    id: newV2Id(),
    project_id: projectId,
    name: input.name.trim(),
    url: input.url.trim(),
    size_bytes: input.sizeBytes ?? null,
    kind: input.kind ?? null,
    created_by: ctx.userId,
    created_at: nowIso(),
  };
  const { error } = await sb.from("v2_project_files").insert(row);
  if (error) throw new Error(error.message);
  return row;
}
