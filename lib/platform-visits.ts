import type Database from "better-sqlite3";

export type VisitPlatform = "profi" | "threads";

export function ensurePlatformVisitsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS platform_visits (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      visitedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_platform_visits_platform ON platform_visits(platform);
    CREATE INDEX IF NOT EXISTS idx_platform_visits_at ON platform_visits(visitedAt);
  `);
}

export function insertPlatformVisit(db: Database.Database, platform: VisitPlatform) {
  ensurePlatformVisitsTable(db);
  const id = `vis_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const visitedAt = new Date().toISOString();
  db.prepare(`INSERT INTO platform_visits (id, platform, visitedAt) VALUES (?, ?, ?)`).run(
    id,
    platform,
    visitedAt
  );
}

export function getVisitAggregates(db: Database.Database, platform: VisitPlatform) {
  ensurePlatformVisitsTable(db);
  const total = (
    db.prepare(`SELECT COUNT(*) as c FROM platform_visits WHERE platform = ?`).get(platform) as { c: number }
  ).c;
  const byMonthRows = db
    .prepare(
      `SELECT strftime('%Y-%m', visitedAt) as ym, COUNT(*) as c
       FROM platform_visits WHERE platform = ?
       GROUP BY ym ORDER BY ym DESC`
    )
    .all(platform) as Array<{ ym: string; c: number }>;
  const byMonth: Record<string, number> = {};
  for (const r of byMonthRows) {
    byMonth[r.ym] = r.c;
  }
  return { total, byMonth };
}
