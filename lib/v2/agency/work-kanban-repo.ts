import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import { createFinanceProject } from "@/lib/v2/finance/finance-repo";
import {
  AGENCY_WORK_STATUSES,
  isAgencyWorkStatus,
  type AgencyKanbanCard,
  type AgencyWorkStatus,
} from "@/lib/v2/agency/work-kanban-types";
import type { V2SessionContext } from "@/lib/v2/types";

function mapFinanceCard(r: Record<string, unknown>): AgencyKanbanCard {
  const statusRaw = r.status;
  const payment_status =
    statusRaw === "paid" || statusRaw === "prepaid" || statusRaw === "not_paid"
      ? statusRaw
      : "not_paid";
  const work = isAgencyWorkStatus(r.work_status) ? r.work_status : "not_started";
  const bl = r.business_line === "impulse" ? "impulse" : "agency";
  return {
    id: `fin:${String(r.id)}`,
    kind: "finance",
    finance_project_id: String(r.id),
    title: String(r.name ?? ""),
    work_status: work,
    sort_order: Number(r.kanban_sort_order) || 0,
    note: r.notes ? String(r.notes) : null,
    total_amount: Number(r.total_amount) || 0,
    paid_amount: Number(r.paid_amount) || 0,
    payment_status,
    business_line: bl,
    deadline: r.deadline ? String(r.deadline).slice(0, 10) : null,
    updated_at: String(r.updated_at ?? r.created_at ?? nowIso()),
  };
}

function mapInternalCard(r: Record<string, unknown>): AgencyKanbanCard {
  const work = isAgencyWorkStatus(r.work_status) ? r.work_status : "not_started";
  return {
    id: `int:${String(r.id)}`,
    kind: "internal",
    finance_project_id: null,
    title: String(r.title ?? ""),
    work_status: work,
    sort_order: Number(r.sort_order) || 0,
    note: r.note ? String(r.note) : null,
    total_amount: null,
    paid_amount: null,
    payment_status: null,
    business_line: null,
    deadline: null,
    updated_at: String(r.updated_at ?? r.created_at ?? nowIso()),
  };
}

function parseCardId(cardId: string): { kind: "finance" | "internal"; rawId: string } | null {
  if (cardId.startsWith("fin:")) return { kind: "finance", rawId: cardId.slice(4) };
  if (cardId.startsWith("int:")) return { kind: "internal", rawId: cardId.slice(4) };
  return null;
}

export async function listAgencyKanbanCards(
  _ctx: V2SessionContext
): Promise<AgencyKanbanCard[]> {
  const sb = getV2Supabase();
  const [finRes, intRes] = await Promise.all([
    sb
      .from("agency_project")
      .select(
        "id, name, total_amount, paid_amount, status, business_line, deadline, notes, work_status, kanban_sort_order, created_at, updated_at"
      )
      .order("kanban_sort_order", { ascending: true })
      .order("updated_at", { ascending: false }),
    sb
      .from("v2_agency_kanban_internal")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false }),
  ]);
  if (finRes.error) throw finRes.error;
  if (intRes.error) throw intRes.error;

  const cards = [
    ...(finRes.data ?? []).map((r) => mapFinanceCard(r as Record<string, unknown>)),
    ...(intRes.data ?? []).map((r) => mapInternalCard(r as Record<string, unknown>)),
  ];
  cards.sort((a, b) => {
    const ai = AGENCY_WORK_STATUSES.findIndex((s) => s.key === a.work_status);
    const bi = AGENCY_WORK_STATUSES.findIndex((s) => s.key === b.work_status);
    if (ai !== bi) return ai - bi;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.title.localeCompare(b.title, "ru");
  });
  return cards;
}

export async function moveAgencyKanbanCard(
  ctx: V2SessionContext,
  cardId: string,
  workStatus: AgencyWorkStatus,
  sortOrder?: number
): Promise<AgencyKanbanCard | null> {
  const parsed = parseCardId(cardId);
  if (!parsed || !isAgencyWorkStatus(workStatus)) return null;
  const sb = getV2Supabase();
  const now = nowIso();

  if (parsed.kind === "finance") {
    const patch: Record<string, unknown> = {
      work_status: workStatus,
      updated_at: now,
    };
    if (typeof sortOrder === "number") patch.kanban_sort_order = sortOrder;
    const { error } = await sb.from("agency_project").update(patch).eq("id", parsed.rawId);
    if (error) throw error;
  } else {
    const patch: Record<string, unknown> = {
      work_status: workStatus,
      updated_at: now,
    };
    if (typeof sortOrder === "number") patch.sort_order = sortOrder;
    const { error } = await sb
      .from("v2_agency_kanban_internal")
      .update(patch)
      .eq("id", parsed.rawId)
      .eq("workspace_id", ctx.workspaceId);
    if (error) throw error;
  }

  const all = await listAgencyKanbanCards(ctx);
  return all.find((c) => c.id === cardId) ?? null;
}

export async function createAgencyKanbanCard(
  ctx: V2SessionContext,
  input: {
    title: string;
    work_status?: AgencyWorkStatus;
    note?: string | null;
    /** true — создать проект в «Проекты и финансы»; false — только канбан */
    include_in_finance?: boolean;
    total_amount?: number;
    business_line?: "agency" | "impulse";
  }
): Promise<AgencyKanbanCard> {
  const title = input.title.trim();
  if (!title) throw new Error("title required");
  const workStatus = isAgencyWorkStatus(input.work_status) ? input.work_status : "not_started";
  const includeFinance = input.include_in_finance !== false;

  if (includeFinance) {
    const project = await createFinanceProject(ctx, {
      name: title,
      totalAmount: typeof input.total_amount === "number" ? input.total_amount : 0,
      paidAmount: 0,
      status: "not_paid",
      serviceType: "site",
      businessLine: input.business_line === "impulse" ? "impulse" : "agency",
      notes: input.note ?? null,
    });
    const sb = getV2Supabase();
    const { data: maxRow } = await sb
      .from("agency_project")
      .select("kanban_sort_order")
      .eq("work_status", workStatus)
      .order("kanban_sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sort = (Number(maxRow?.kanban_sort_order) || 0) + 1;
    await sb
      .from("agency_project")
      .update({
        work_status: workStatus,
        kanban_sort_order: sort,
        updated_at: nowIso(),
      })
      .eq("id", project.id);

    const all = await listAgencyKanbanCards(ctx);
    const card = all.find((c) => c.finance_project_id === project.id);
    if (!card) throw new Error("create_failed");
    return card;
  }

  const sb = getV2Supabase();
  const { data: maxRow } = await sb
    .from("v2_agency_kanban_internal")
    .select("sort_order")
    .eq("workspace_id", ctx.workspaceId)
    .eq("work_status", workStatus)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const now = nowIso();
  const row = {
    id: newV2Id(),
    workspace_id: ctx.workspaceId,
    title,
    work_status: workStatus,
    note: input.note?.trim() || null,
    sort_order: (Number(maxRow?.sort_order) || 0) + 1,
    created_by: ctx.userId,
    created_at: now,
    updated_at: now,
  };
  const { error } = await sb.from("v2_agency_kanban_internal").insert(row);
  if (error) throw error;
  return mapInternalCard(row);
}

export async function updateAgencyKanbanCard(
  ctx: V2SessionContext,
  cardId: string,
  patch: { title?: string; note?: string | null; work_status?: AgencyWorkStatus }
): Promise<AgencyKanbanCard | null> {
  const parsed = parseCardId(cardId);
  if (!parsed) return null;
  const sb = getV2Supabase();
  const now = nowIso();

  if (parsed.kind === "finance") {
    const safe: Record<string, unknown> = { updated_at: now };
    if (patch.title !== undefined) {
      const t = patch.title.trim();
      if (!t) throw new Error("title required");
      safe.name = t;
    }
    if (patch.note !== undefined) safe.notes = patch.note;
    if (isAgencyWorkStatus(patch.work_status)) safe.work_status = patch.work_status;
    const { error } = await sb.from("agency_project").update(safe).eq("id", parsed.rawId);
    if (error) throw error;
  } else {
    const safe: Record<string, unknown> = { updated_at: now };
    if (patch.title !== undefined) {
      const t = patch.title.trim();
      if (!t) throw new Error("title required");
      safe.title = t;
    }
    if (patch.note !== undefined) safe.note = patch.note;
    if (isAgencyWorkStatus(patch.work_status)) safe.work_status = patch.work_status;
    const { error } = await sb
      .from("v2_agency_kanban_internal")
      .update(safe)
      .eq("id", parsed.rawId)
      .eq("workspace_id", ctx.workspaceId);
    if (error) throw error;
  }

  const all = await listAgencyKanbanCards(ctx);
  return all.find((c) => c.id === cardId) ?? null;
}

export async function deleteAgencyKanbanCard(
  ctx: V2SessionContext,
  cardId: string
): Promise<boolean> {
  const parsed = parseCardId(cardId);
  if (!parsed) return false;
  const sb = getV2Supabase();

  if (parsed.kind === "finance") {
    // Не удаляем финансовый проект из канбана — только внутренние.
    // Для finance используй удаление в «Проекты и финансы».
    return false;
  }

  const { error, count } = await sb
    .from("v2_agency_kanban_internal")
    .delete({ count: "exact" })
    .eq("id", parsed.rawId)
    .eq("workspace_id", ctx.workspaceId);
  if (error) throw error;
  return (count ?? 0) > 0;
}
