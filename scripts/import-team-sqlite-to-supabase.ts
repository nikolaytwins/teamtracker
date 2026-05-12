/**
 * Импорт из локальных SQLite в Supabase (PostgREST + service_role).
 * Порядок: примените SQL-миграцию `supabase/migrations/20260512180000_team_tracker_pm_board_history.sql`.
 *
 * Переменные: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Опционально: PM_BOARD_SQLITE_PATH (по умолчанию data/pm-board.db), AGENCY_SQLITE_PATH (по умолчанию data/agency.db)
 *
 * Запуск: npm run import-team-to-supabase
 */
import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { getAgencySqlitePath } from "../lib/agency-sqlite";

function getPmBoardPath(): string {
  const o = process.env.PM_BOARD_SQLITE_PATH?.trim();
  if (o) return path.resolve(o);
  return path.join(process.cwd(), "data", "pm-board.db");
}

async function upsertChunks<T extends Record<string, unknown>>(
  sb: ReturnType<typeof createClient>,
  table: string,
  rows: T[],
  onConflict: string,
  chunkSize = 80
): Promise<void> {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await sb.from(table).upsert(chunk as never[], { onConflict });
    if (error) {
      console.error(`Upsert ${table} chunk ${i}:`, error.message);
      throw error;
    }
  }
}

function allOrEmpty(db: Database.Database, sql: string): Record<string, unknown>[] {
  try {
    return db.prepare(sql).all() as Record<string, unknown>[];
  } catch {
    return [];
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const pmPath = getPmBoardPath();
  const agencyPath = getAgencySqlitePath();
  console.log("PM board SQLite:", pmPath);
  console.log("Agency SQLite (история месяцев):", agencyPath);

  const pmDb = new Database(pmPath, { readonly: true });
  const agencyDb = new Database(agencyPath, { readonly: true });

  const pmCards = allOrEmpty(pmDb, "SELECT * FROM pm_cards");
  const pmTemplates = allOrEmpty(pmDb, "SELECT * FROM pm_project_templates");
  const pmTemplateItems = allOrEmpty(pmDb, "SELECT * FROM pm_project_template_items");
  const pmPhases = allOrEmpty(pmDb, "SELECT * FROM pm_project_phases");
  const pmSubtasks = allOrEmpty(pmDb, "SELECT * FROM pm_subtasks");
  const pmTime = allOrEmpty(pmDb, "SELECT * FROM pm_time_entries");
  const pmComments = allOrEmpty(pmDb, "SELECT * FROM pm_card_comments");
  const ttUsers = allOrEmpty(pmDb, "SELECT * FROM tt_users");
  const monthly = allOrEmpty(agencyDb, "SELECT * FROM monthly_history");

  pmDb.close();
  agencyDb.close();

  console.log("Импорт pm_cards:", pmCards.length);
  await upsertChunks(sb, "pm_cards", pmCards as Record<string, unknown>[], "id");
  console.log("Импорт pm_project_templates:", pmTemplates.length);
  await upsertChunks(sb, "pm_project_templates", pmTemplates as Record<string, unknown>[], "id");
  console.log("Импорт pm_project_template_items:", pmTemplateItems.length);
  await upsertChunks(sb, "pm_project_template_items", pmTemplateItems as Record<string, unknown>[], "id");
  console.log("Импорт pm_project_phases:", pmPhases.length);
  await upsertChunks(sb, "pm_project_phases", pmPhases as Record<string, unknown>[], "id");
  console.log("Импорт pm_subtasks:", pmSubtasks.length);
  await upsertChunks(sb, "pm_subtasks", pmSubtasks as Record<string, unknown>[], "id");
  console.log("Импорт pm_time_entries:", pmTime.length);
  await upsertChunks(sb, "pm_time_entries", pmTime as Record<string, unknown>[], "id");
  console.log("Импорт pm_card_comments:", pmComments.length);
  await upsertChunks(sb, "pm_card_comments", pmComments as Record<string, unknown>[], "id");
  console.log("Импорт tt_users:", ttUsers.length);
  await upsertChunks(sb, "tt_users", ttUsers as Record<string, unknown>[], "id");
  console.log("Импорт monthly_history:", monthly.length);
  if (monthly.length > 0) {
    await upsertChunks(sb, "monthly_history", monthly as Record<string, unknown>[], "id");
  }

  console.log("Готово.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
