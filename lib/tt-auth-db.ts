import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getDb } from "@/lib/db";

export interface TtUserRow {
  id: string;
  login: string;
  password_hash: string;
  salt: string;
  display_name: string;
  job_title: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export function ensureTtUsersSchema() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS tt_users (
      id TEXT PRIMARY KEY,
      login TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      display_name TEXT NOT NULL,
      job_title TEXT NOT NULL DEFAULT '',
      avatar_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tt_users_login ON tt_users(login);
  `);
}

function hashPassword(password: string, saltHex: string): string {
  return scryptSync(password, Buffer.from(saltHex, "hex"), 64).toString("hex");
}

export function verifyPassword(password: string, row: Pick<TtUserRow, "password_hash" | "salt">): boolean {
  const h = hashPassword(password, row.salt);
  try {
    return timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(row.password_hash, "hex"));
  } catch {
    return false;
  }
}

export function hashNewPassword(password: string): { password_hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const password_hash = hashPassword(password, salt);
  return { password_hash, salt };
}

export function getUserByLogin(login: string): TtUserRow | null {
  ensureTtUsersSchema();
  const db = getDb();
  const row = db.prepare(`SELECT * FROM tt_users WHERE lower(login) = lower(?)`).get(login.trim()) as
    | TtUserRow
    | undefined;
  return row ?? null;
}

export function getUserById(id: string): TtUserRow | null {
  ensureTtUsersSchema();
  const db = getDb();
  const row = db.prepare(`SELECT * FROM tt_users WHERE id = ?`).get(id) as TtUserRow | undefined;
  return row ?? null;
}

export function upsertUserFromPlain(params: {
  login: string;
  password: string;
  display_name: string;
  job_title?: string;
  avatar_url?: string | null;
}): TtUserRow {
  ensureTtUsersSchema();
  const db = getDb();
  const { password_hash, salt } = hashNewPassword(params.password);
  const existing = getUserByLogin(params.login);
  if (existing) {
    db.prepare(
      `UPDATE tt_users SET password_hash = ?, salt = ?, display_name = ?, job_title = ?, avatar_url = COALESCE(?, avatar_url), updated_at = datetime('now') WHERE id = ?`
    ).run(
      password_hash,
      salt,
      params.display_name.trim(),
      (params.job_title ?? existing.job_title).trim(),
      params.avatar_url ?? null,
      existing.id
    );
    return getUserById(existing.id)!;
  }
  const id = `u_${randomBytes(12).toString("hex")}`;
  db.prepare(
    `INSERT INTO tt_users (id, login, password_hash, salt, display_name, job_title, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.login.trim(),
    password_hash,
    salt,
    params.display_name.trim(),
    (params.job_title ?? "").trim(),
    params.avatar_url ?? null
  );
  return getUserById(id)!;
}

export function updateUserAvatar(userId: string, avatar_url: string | null): boolean {
  ensureTtUsersSchema();
  const db = getDb();
  const r = db.prepare(`UPDATE tt_users SET avatar_url = ?, updated_at = datetime('now') WHERE id = ?`).run(
    avatar_url,
    userId
  );
  return r.changes > 0;
}

/** Синхронизация учёток из env (те же логины/пароли, что в Twinworks — один JSON при деплое). */
export function syncUsersFromEnv(): void {
  const raw = process.env.TEAM_TRACKER_USERS_JSON?.trim();
  if (!raw) return;
  let arr: Array<{ login: string; password: string; name: string; title?: string; avatar?: string | null }>;
  try {
    arr = JSON.parse(raw);
  } catch (e) {
    console.error("TEAM_TRACKER_USERS_JSON parse error", e);
    return;
  }
  if (!Array.isArray(arr)) return;
  for (const u of arr) {
    if (!u?.login || !u?.password || !u?.name) continue;
    upsertUserFromPlain({
      login: String(u.login),
      password: String(u.password),
      display_name: String(u.name),
      job_title: u.title != null ? String(u.title) : "",
      avatar_url: u.avatar != null ? String(u.avatar) : null,
    });
  }
}
