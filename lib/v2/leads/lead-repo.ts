import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import type { V2SessionContext } from "@/lib/v2/types";
import {
  isV2LeadSource,
  isV2LeadStatus,
  isV2LeadType,
  type V2LeadRow,
  type V2LeadSource,
  type V2LeadStatus,
  type V2LeadType,
} from "@/lib/v2/leads/lead-types";

function parseAmount(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return Math.round(raw);
}

function normalizeSource(
  source: V2LeadSource | undefined,
  sourceCustom: string | null | undefined
): { source: V2LeadSource; source_custom: string | null } {
  const src = source && isV2LeadSource(source) ? source : "";
  if (src === "custom") {
    return { source: "custom", source_custom: sourceCustom?.trim() || null };
  }
  return { source: src, source_custom: null };
}

function mapLead(raw: Record<string, unknown>): V2LeadRow {
  const leadType = isV2LeadType(raw.lead_type) ? raw.lead_type : "agency";
  const status = isV2LeadStatus(raw.status) ? raw.status : "correspondence";
  const sourceRaw = typeof raw.source === "string" ? raw.source : "";
  const source = isV2LeadSource(sourceRaw) ? sourceRaw : "";
  return {
    id: String(raw.id),
    workspace_id: String(raw.workspace_id),
    name: String(raw.name ?? ""),
    contact: String(raw.contact ?? ""),
    comment: raw.comment != null ? String(raw.comment) : null,
    lead_type: leadType,
    status,
    reminder_at: raw.reminder_at ? String(raw.reminder_at).slice(0, 10) : null,
    estimated_amount: parseAmount(raw.estimated_amount),
    source,
    source_custom: raw.source_custom != null ? String(raw.source_custom) : null,
    taken_into_work_at: raw.taken_into_work_at ? String(raw.taken_into_work_at).slice(0, 10) : null,
    lost_reason: raw.lost_reason != null ? String(raw.lost_reason) : null,
    lost_at: raw.lost_at ? String(raw.lost_at).slice(0, 10) : null,
    sort_order: Number(raw.sort_order) || 0,
    archived_at: raw.archived_at ? String(raw.archived_at) : null,
    created_by: String(raw.created_by),
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
  };
}

export async function listLeads(ctx: V2SessionContext): Promise<V2LeadRow[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_leads")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapLead(r as Record<string, unknown>));
}

export async function getLeadById(ctx: V2SessionContext, id: string): Promise<V2LeadRow | null> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_leads")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapLead(data as Record<string, unknown>);
}

export type CreateLeadInput = {
  name: string;
  contact?: string;
  comment?: string | null;
  leadType?: V2LeadType;
  status?: V2LeadStatus;
  reminderAt?: string | null;
  estimatedAmount?: number | null;
  source?: V2LeadSource;
  sourceCustom?: string | null;
  takenIntoWorkAt?: string | null;
  lostReason?: string | null;
  lostAt?: string | null;
  createdAt?: string | null;
};

export async function createLead(ctx: V2SessionContext, input: CreateLeadInput): Promise<V2LeadRow> {
  const name = input.name.trim();
  if (!name) throw new Error("name required");

  const estimatedAmount =
    typeof input.estimatedAmount === "number" && Number.isFinite(input.estimatedAmount) && input.estimatedAmount >= 0
      ? Math.round(input.estimatedAmount)
      : null;

  const { source, source_custom } = normalizeSource(input.source, input.sourceCustom);
  const status = input.status && isV2LeadStatus(input.status) ? input.status : "correspondence";
  const ts = nowIso();
  const createdAt = input.createdAt?.trim()
    ? new Date(`${input.createdAt.trim().slice(0, 10)}T12:00:00.000Z`).toISOString()
    : ts;

  const row = {
    id: newV2Id(),
    workspace_id: ctx.workspaceId,
    name,
    contact: (input.contact ?? "").trim(),
    comment: input.comment?.trim() || null,
    lead_type: input.leadType && isV2LeadType(input.leadType) ? input.leadType : "agency",
    status,
    reminder_at: input.reminderAt?.trim() || null,
    estimated_amount: estimatedAmount,
    source,
    source_custom,
    taken_into_work_at: input.takenIntoWorkAt?.trim() || null,
    lost_reason: status === "lost" ? input.lostReason?.trim() || null : null,
    lost_at: status === "lost" ? input.lostAt?.trim() || new Date().toISOString().slice(0, 10) : null,
    sort_order: Math.floor(Date.now() / 1000),
    archived_at: null,
    created_by: ctx.userId,
    created_at: createdAt,
    updated_at: ts,
  };

  const sb = getV2Supabase();
  const { error } = await sb.from("v2_leads").insert(row);
  if (error) throw new Error(error.message);
  return mapLead(row);
}

export type UpdateLeadInput = Partial<{
  name: string;
  contact: string;
  comment: string | null;
  leadType: V2LeadType;
  status: V2LeadStatus;
  reminderAt: string | null;
  estimatedAmount: number | null;
  source: V2LeadSource;
  sourceCustom: string | null;
  takenIntoWorkAt: string | null;
  lostReason: string | null;
  lostAt: string | null;
  createdAt: string | null;
  sortOrder: number;
}>;

export async function updateLead(
  ctx: V2SessionContext,
  id: string,
  input: UpdateLeadInput
): Promise<V2LeadRow> {
  const existing = await getLeadById(ctx, id);
  if (!existing) throw new Error("Lead not found");

  const patch: Record<string, unknown> = { updated_at: nowIso() };
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("name required");
    patch.name = name;
  }
  if (input.contact !== undefined) patch.contact = input.contact.trim();
  if (input.comment !== undefined) patch.comment = input.comment?.trim() || null;
  if (input.leadType !== undefined) {
    if (!isV2LeadType(input.leadType)) throw new Error("invalid lead type");
    patch.lead_type = input.leadType;
  }
  if (input.status !== undefined) {
    if (!isV2LeadStatus(input.status)) throw new Error("invalid status");
    patch.status = input.status;
  }
  if (input.reminderAt !== undefined) patch.reminder_at = input.reminderAt?.trim() || null;
  if (input.estimatedAmount !== undefined) {
    patch.estimated_amount =
      input.estimatedAmount != null && Number.isFinite(input.estimatedAmount) && input.estimatedAmount >= 0
        ? Math.round(input.estimatedAmount)
        : null;
  }
  if (input.source !== undefined || input.sourceCustom !== undefined) {
    const next = normalizeSource(
      input.source !== undefined ? input.source : existing.source,
      input.sourceCustom !== undefined ? input.sourceCustom : existing.source_custom
    );
    patch.source = next.source;
    patch.source_custom = next.source_custom;
  }
  if (input.takenIntoWorkAt !== undefined) {
    patch.taken_into_work_at = input.takenIntoWorkAt?.trim() || null;
  }
  if (input.lostReason !== undefined) {
    patch.lost_reason = input.lostReason?.trim() || null;
  }
  if (input.lostAt !== undefined) {
    patch.lost_at = input.lostAt?.trim() || null;
  }

  const nextStatus =
    input.status !== undefined ? input.status : (patch.status as V2LeadStatus | undefined) ?? existing.status;
  if (nextStatus === "lost") {
    if (input.lostAt === undefined && !existing.lost_at && patch.lost_at === undefined) {
      patch.lost_at = new Date().toISOString().slice(0, 10);
    }
  } else if (input.status !== undefined && input.status !== "lost") {
    // Ушли из «Слив» — дату слива очищаем; причину оставляем для истории, если не передали явно
    if (input.lostAt === undefined) patch.lost_at = null;
  }

  if (input.createdAt !== undefined) {
    const ymd = input.createdAt?.trim().slice(0, 10);
    if (ymd) {
      patch.created_at = new Date(`${ymd}T12:00:00.000Z`).toISOString();
    }
  }
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;

  const sb = getV2Supabase();
  const { error } = await sb.from("v2_leads").update(patch).eq("id", id).eq("workspace_id", ctx.workspaceId);
  if (error) throw new Error(error.message);

  const updated = await getLeadById(ctx, id);
  if (!updated) throw new Error("Lead not found after update");
  return updated;
}

export async function archiveLead(ctx: V2SessionContext, id: string): Promise<void> {
  const existing = await getLeadById(ctx, id);
  if (!existing) throw new Error("Lead not found");
  const sb = getV2Supabase();
  const { error } = await sb
    .from("v2_leads")
    .update({ archived_at: nowIso(), updated_at: nowIso() })
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId);
  if (error) throw new Error(error.message);
}
