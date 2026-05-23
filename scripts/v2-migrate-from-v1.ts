/**
 * Миграция данных v1 (pm_* в Supabase) → v2 (v2_projects, v2_tasks, v2_time_sessions).
 *
 * Требования:
 * - Миграции 001–003 применены
 * - В Supabase уже есть pm_cards, pm_subtasks, pm_time_entries (import-team-to-supabase)
 * - NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Запуск: npm run v2-migrate-from-v1
 * Dry-run: DRY_RUN=1 npm run v2-migrate-from-v1
 */
import { createClient } from "@supabase/supabase-js";

const WS = "ws-default";
const ADMIN_USER = process.env.V2_MIGRATE_ADMIN_USER_ID?.trim() || "admin";

function mapStatus(pmCompleted: string | null, workStatus?: string): string {
  if (pmCompleted) return "done";
  if (workStatus === "in_progress") return "in_progress";
  if (workStatus === "review") return "review";
  return "todo";
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const dryRun = process.env.DRY_RUN === "1";
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: cards, error: cardsErr } = await sb.from("pm_cards").select("*");
  if (cardsErr) throw cardsErr;
  const { data: subtasks, error: subErr } = await sb.from("pm_subtasks").select("*");
  if (subErr) throw subErr;
  const { data: timeEntries, error: timeErr } = await sb.from("pm_time_entries").select("*");
  if (timeErr) throw timeErr;

  console.log(`pm_cards: ${cards?.length ?? 0}, subtasks: ${subtasks?.length ?? 0}, time: ${timeEntries?.length ?? 0}`);
  if (dryRun) console.log("DRY_RUN — запись в БД пропущена");

  const cardToProject = new Map<string, string>();
  const subtaskToTask = new Map<string, string>();

  for (const card of cards ?? []) {
    const cardId = card.id as string;
    const name = (card.name as string) || "Проект";
    const projectId = `v1p-${cardId}`;
    cardToProject.set(cardId, projectId);

    const row = {
      id: projectId,
      workspace_id: WS,
      scope: "team",
      name,
      short_name: shortName(name),
      color_tint: "#1a1a1a",
      color_bg: "#f0f0f0",
      status: "in_progress",
      owner_user_id: null,
      created_by: ADMIN_USER,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (!dryRun) {
      const { error } = await sb.from("v2_projects").upsert(row, { onConflict: "id" });
      if (error) throw error;
    }
  }

  for (const st of subtasks ?? []) {
    const subId = st.id as string;
    const cardId = st.card_id as string;
    const projectId = cardToProject.get(cardId);
    if (!projectId) continue;

    const taskId = `v1t-${subId}`;
    subtaskToTask.set(subId, taskId);

    const deadline = st.deadline_at as string | null;
    const estimateHours = st.estimated_hours as number | null;
    const completedAt = st.completed_at as string | null;

    const row = {
      id: taskId,
      workspace_id: WS,
      project_id: projectId,
      parent_id: null,
      scope: "team",
      title: (st.title as string) || "Задача",
      description: null,
      status: mapStatus(completedAt),
      priority: "medium",
      assignee_user_id: (st.assignee_user_id as string) || null,
      created_by: ADMIN_USER,
      deadline_at: deadline ? new Date(deadline).toISOString() : null,
      estimate_seconds: estimateHours ? Math.round(estimateHours * 3600) : null,
      completed_at: completedAt ? new Date(completedAt).toISOString() : null,
      sort_order: (st.sort_order as number) ?? 0,
      inbox_bucket: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (!dryRun) {
      const { error } = await sb.from("v2_tasks").upsert(row, { onConflict: "id" });
      if (error) throw error;
    }
  }

  for (const te of timeEntries ?? []) {
    const subId = te.subtask_id as string | null;
    if (!subId) continue;
    const taskId = subtaskToTask.get(subId);
    if (!taskId) continue;

    const sessionId = `v1s-${te.id as string}`;
    const row = {
      id: sessionId,
      workspace_id: WS,
      task_id: taskId,
      user_id: (te.worker_user_id as string) || ADMIN_USER,
      started_at: new Date(te.started_at as string).toISOString(),
      ended_at: te.ended_at ? new Date(te.ended_at as string).toISOString() : null,
      duration_seconds: (te.duration_seconds as number) ?? null,
      is_manual: false,
      note: (te.task_note as string) || null,
      created_at: new Date().toISOString(),
    };
    if (!dryRun) {
      const { error } = await sb.from("v2_time_sessions").upsert(row, { onConflict: "id" });
      if (error) throw error;
    }
  }

  console.log(`Готово: проектов ${cardToProject.size}, задач ${subtaskToTask.size}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
