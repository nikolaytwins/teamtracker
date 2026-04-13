/**
 * Заполняет pm_time_entries.worker_user_id по историческому worker_name:
 * совпадение с tt_users.display_name или tt_users.login (без учёта регистра, trim, схлопывание пробелов).
 *
 * Использование:
 *   npx tsx scripts/backfill-worker-user-id.ts           # применить
 *   npx tsx scripts/backfill-worker-user-id.ts --dry-run  # только отчёт
 *
 * База: PM_BOARD_SQLITE_PATH или data/pm-board.db (см. lib/db.ts).
 */
import { getDb } from "../lib/db";
import { ensurePhasesSchema } from "../lib/pm-phases";
import { ensureTtUsersSchema } from "../lib/tt-auth-db";

function normLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function main() {
  const dry = process.argv.includes("--dry-run");
  ensurePhasesSchema();
  ensureTtUsersSchema();
  const db = getDb();

  const users = db.prepare(`SELECT id, display_name, login FROM tt_users`).all() as {
    id: string;
    display_name: string;
    login: string;
  }[];

  const byDisplay = new Map<string, string[]>();
  const byLogin = new Map<string, string>();

  for (const u of users) {
    const dKey = normLabel(u.display_name);
    if (!byDisplay.has(dKey)) byDisplay.set(dKey, []);
    byDisplay.get(dKey)!.push(u.id);
    byLogin.set(normLabel(u.login), u.id);
  }

  const rows = db
    .prepare(
      `SELECT id, worker_name, worker_user_id FROM pm_time_entries
       WHERE worker_user_id IS NULL OR trim(COALESCE(worker_user_id, '')) = ''`
    )
    .all() as { id: string; worker_name: string; worker_user_id: string | null }[];

  let updated = 0;
  let ambiguous = 0;
  let unmatched = 0;
  let emptyName = 0;

  const upd = db.prepare(`UPDATE pm_time_entries SET worker_user_id = ? WHERE id = ?`);

  for (const row of rows) {
    const wn = String(row.worker_name ?? "").trim();
    if (!wn) {
      emptyName++;
      continue;
    }
    const key = normLabel(wn);
    let userId: string | undefined;
    const displayMatches = byDisplay.get(key);
    if (displayMatches?.length === 1) {
      userId = displayMatches[0];
    } else if (displayMatches && displayMatches.length > 1) {
      ambiguous++;
      continue;
    } else {
      const loginHit = byLogin.get(key);
      if (loginHit) userId = loginHit;
    }

    if (!userId) {
      unmatched++;
      continue;
    }

    updated++;
    if (!dry) {
      upd.run(userId, row.id);
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun: dry,
        candidates: rows.length,
        updated,
        ambiguousDisplayName: ambiguous,
        unmatched,
        emptyWorkerName: emptyName,
      },
      null,
      2
    )
  );
}

main();
