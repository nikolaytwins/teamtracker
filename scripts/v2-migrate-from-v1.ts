/**
 * Миграция v1 → v2: SQLite pm-board (или pm_* в Supabase) → v2_projects / v2_tasks / v2_time_sessions.
 *
 * PM_BOARD_SQLITE_PATH=/path/to/pm-board.db  — приоритет над Supabase pm_*
 * NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * npm run v2-migrate-from-v1
 * DRY_RUN=1 npm run v2-migrate-from-v1
 */
import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import path from "path";

const WS = "ws-default";
const ADMIN_USER = process.env.V2_MIGRATE_ADMIN_USER_ID?.trim() || "u_be81c9da3f083fcae9d0d614";

type Row = Record<string, unknown>;

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function cardDone(status: string | null): boolean {
  return status === "done";
}

function defaultSqlitePath(): string {
  const o = process.env.PM_BOARD_SQLITE_PATH?.trim();
  if (o) return path.resolve(o);
  return path.join(process.cwd(), "data", "pm-board.db");
}

function loadFromSqlite(dbPath: string): { cards: Row[]; subtasks: Row[]; timeEntries: Row[] } {
  const db = new Database(dbPath, { readonly: true });
  const all = (sql: string) => db.prepare(sql).all() as Row[];
  const cards = all("SELECT * FROM pm_cards");
  const subtasks = all("SELECT * FROM pm_subtasks");
  let timeEntries: Row[] = [];
  try {
    timeEntries = all("SELECT * FROM pm_time_entries");
  } catch {
  }
  db.close();
  return { cards, subtasks, timeEntries };
}

async function loadFromSupabase(sb: ReturnType<typeof createClient>) {
  const { data: cards, error: cardsErr } = await sb.from("pm_cards").select("*");
  if (cardsErr) throw cardsErr;
  const { data: subtasks, error: subErr } = await sb.from("pm_subtasks").select("*");
  if (subErr) throw subErr;
  const { data: timeEntries, error: timeErr } = await sb.from("pm_time_entries").select("*");
  if (timeErr) throw timeErr;
  return { cards: cards ?? [], subtasks: subtasks ?? [], timeEntries: timeEntries ?? [] };
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

  const sqlitePath = defaultSqlitePath();
  let source: { cards: Row[]; subtasks: Row[]; timeEntries: Row[] };
  try {
    source = loadFromSqlite(sqlitePath);
    console.log("Источник: SQLite", sqlitePath);
  } catch {
    source = await loadFromSupabase(sb);
    console.log("Источник: Supabase pm_*");
  }

  const { cards, subtasks, timeEntries } = source;
  console.log(`cards: ${cards.length}, subtasks: ${subtasks.length}, time: ${timeEntries.length}`);
  if (dryRun) console.log("DRY_RUN — запись пропущена");

  const cardToProject = new Map<string, string>();
  const cardToMainTask = new Map<string, string>();
  const subtaskToTask = new Map<string, string>();

  for (const card of cards) {
    const cardId = card.id as string;
    const name = ((card.name as string) || "Проект").trim();
    const projectId = `v1p-${cardId}`;
    const mainTaskId = `v1t-card-${cardId}`;
    cardToProject.set(cardId, projectId);
    cardToMainTask.set(cardId, mainTaskId);

    const completed = cardDone(card.status as string | null);
    const deadline = card.deadline as string | null;

    const projectRow = {
      id: projectId,
      workspace_id: WS,
      scope: "team",
      name,
      short_name: shortName(name),
      color_tint: "#27272A",
      color_bg: "#F4F4F5",
      status: completed ? "completed" : "in_progress",
      owner_user_id: null,
      created_by: ADMIN_USER,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const taskRow = {
      id: mainTaskId,
      workspace_id: WS,
      project_id: projectId,
      parent_id: null,
      scope: "team",
      title: name,
      description: null,
      status: completed ? "done" : "todo",
      priority: "medium",
      assignee_user_id: ADMIN_USER,
      created_by: ADMIN_USER,
      deadline_at: deadline ? new Date(deadline).toISOString() : null,
      estimate_seconds: null,
      completed_at: completed ? new Date().toISOString() : null,
      sort_order: 0,
      inbox_bucket: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!dryRun) {
      const { error: pe } = await sb.from("v2_projects").upsert(projectRow, { onConflict: "id" });
      if (pe) throw pe;
      const { error: te } = await sb.from("v2_tasks").upsert(taskRow, { onConflict: "id" });
      if (te) throw te;
    }
  }

  for (const st of subtasks) {
    const subId = st.id as string;
    const cardId = st.card_id as string;
    const projectId = cardToProject.get(cardId);
    if (!projectId) continue;

    const taskId = `v1t-${subId}`;
    subtaskToTask.set(subId, taskId);

    const completedAt = st.completed_at as string | null;
    const deadline = st.deadline_at as string | null;
    const estimateHours = st.estimated_hours as number | null;

    const row = {
      id: taskId,
      workspace_id: WS,
      project_id: projectId,
      parent_id: null,
      scope: "team",
      title: ((st.title as string) || "Задача").trim(),
      description: null,
      status: completedAt ? "done" : "todo",
      priority: "medium",
      assignee_user_id: (st.assignee_user_id as string) || ADMIN_USER,
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

  for (const te of timeEntries) {
    const subId = te.subtask_id as string | null;
    const cardId = te.card_id as string;
    const taskId = subId ? subtaskToTask.get(subId) : cardToMainTask.get(cardId);
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

  console.log(`Готово: проектов ${cardToProject.size}, задач ${cardToMainTask.size + subtaskToTask.size}, сессий ${timeEntries.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
