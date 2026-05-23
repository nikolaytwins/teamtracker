/**
 * Миграция v1 → v2 (вариант 3): pm_card → только проект, задачи создаются вручную.
 *
 * PM_BOARD_SQLITE_PATH — приоритет над Supabase pm_*
 * CLEAN_V1_TASKS=1 — удалить ошибочные v1t-* задачи перед импортом (по умолчанию да)
 */
import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { statusToSimpleViewGroup } from "../lib/statuses";
import type { PmStatusKey } from "../lib/statuses";
import type { V2ProjectStatus } from "../lib/v2/types";

const WS = "ws-default";
const ADMIN_USER = process.env.V2_MIGRATE_ADMIN_USER_ID?.trim() || "u_be81c9da3f083fcae9d0d614";

import { pickProjectColor } from "../lib/v2/project-colors";
type Row = Record<string, unknown>;

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function mapCardStatusToProject(status: string | null): V2ProjectStatus {
  const key = (status ?? "not_started") as PmStatusKey;
  const group = statusToSimpleViewGroup(key);
  switch (group) {
    case "done":
      return "completed";
    case "pause":
      return "paused";
    case "not_started":
      return "not_started";
    case "awaiting_approval":
      return "approval";
    default:
      return "in_progress";
  }
}

function defaultSqlitePath(): string {
  const o = process.env.PM_BOARD_SQLITE_PATH?.trim();
  if (o) return path.resolve(o);
  return path.join(process.cwd(), "data", "pm-board.db");
}

function loadFromSqlite(dbPath: string): Row[] {
  const db = new Database(dbPath, { readonly: true });
  const cards = db.prepare("SELECT * FROM pm_cards").all() as Row[];
  db.close();
  return cards;
}

async function loadFromSupabase(sb: ReturnType<typeof createClient>): Promise<Row[]> {
  const { data, error } = await sb.from("pm_cards").select("*");
  if (error) throw error;
  return data ?? [];
}

async function cleanupBadTasks(sb: ReturnType<typeof createClient>, dryRun: boolean): Promise<number> {
  const { data, error } = await sb.from("v2_tasks").select("id").like("id", "v1t-%");
  if (error) throw error;
  const ids = (data ?? []).map((r) => r.id as string);
  if (!ids.length) return 0;
  if (dryRun) {
    console.log(`CLEAN: удалить ${ids.length} ошибочных v1t-* задач`);
    return ids.length;
  }
  const { error: delErr } = await sb.from("v2_tasks").delete().like("id", "v1t-%");
  if (delErr) throw delErr;
  return ids.length;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const dryRun = process.env.DRY_RUN === "1";
  const cleanTasks = process.env.CLEAN_V1_TASKS !== "0";
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  if (cleanTasks) {
    const removed = await cleanupBadTasks(sb, dryRun);
    console.log(removed ? `Очищено ошибочных задач: ${removed}` : "Ошибочных v1t-* задач нет");
  }

  const sqlitePath = defaultSqlitePath();
  let cards: Row[];
  try {
    cards = loadFromSqlite(sqlitePath);
    console.log("Источник: SQLite", sqlitePath);
  } catch {
    cards = await loadFromSupabase(sb);
    console.log("Источник: Supabase pm_cards");
  }

  console.log(`pm_cards: ${cards.length}`);
  if (dryRun) console.log("DRY_RUN — запись пропущена");

  let idx = 0;
  for (const card of cards) {
    const cardId = card.id as string;
    const name = ((card.name as string) || "Проект").trim();
    const projectId = `v1p-${cardId}`;
    const colors = pickProjectColor(idx);
    idx++;

    const row = {
      id: projectId,
      workspace_id: WS,
      scope: "team",
      name,
      short_name: shortName(name),
      color_tint: colors.tint,
      color_bg: colors.bg,
      color_ink: colors.ink ?? colors.tint,
      status: mapCardStatusToProject(card.status as string | null),
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

  console.log(`Готово: проектов ${cards.length} (задачи не создаются — только вручную в v2)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
