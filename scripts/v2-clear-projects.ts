/**
 * Удаляет все проекты v2 (v2_projects) и связанные данные (members, links, files, phases).
 * v1 (pm_cards, agency_*, SQLite) не затрагивается.
 *
 * Требуется: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * DRY_RUN=1 — только подсчёт, без удаления
 *
 * Запуск: npm run v2-clear-projects
 */
import { createClient } from "@supabase/supabase-js";

async function count(sb: ReturnType<typeof createClient>, table: string): Promise<number> {
  const { count, error } = await sb.from(table).select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
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

  const projects = await count(sb, "v2_projects");
  const members = await count(sb, "v2_project_members");
  const links = await count(sb, "v2_project_links");
  const files = await count(sb, "v2_project_files");
  const phases = await count(sb, "v2_project_phases");
  const tasksWithProject = await sb
    .from("v2_tasks")
    .select("id", { count: "exact", head: true })
    .not("project_id", "is", null)
    .is("deleted_at", null);

  if (tasksWithProject.error) throw tasksWithProject.error;

  console.log("v2 перед очисткой:");
  console.log(`  v2_projects:         ${projects}`);
  console.log(`  v2_project_members:  ${members}`);
  console.log(`  v2_project_links:    ${links}`);
  console.log(`  v2_project_files:    ${files}`);
  console.log(`  v2_project_phases:   ${phases}`);
  console.log(`  v2_tasks с project_id: ${tasksWithProject.count ?? 0} (project_id станет NULL)`);
  console.log("v1 pm_cards и agency_* не изменяются.");

  if (projects === 0) {
    console.log("Проектов v2 нет — нечего удалять.");
    return;
  }

  if (dryRun) {
    console.log("DRY_RUN=1 — удаление пропущено.");
    return;
  }

  const { error } = await sb.from("v2_projects").delete().neq("id", "");
  if (error) throw error;

  const left = await count(sb, "v2_projects");
  console.log(`Готово. Осталось v2_projects: ${left}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
