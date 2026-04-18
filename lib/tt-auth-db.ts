import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getDb } from "@/lib/db";
import { normalizeTtUserRole, type TtUserRole } from "@/lib/roles";
import {
  DEFAULT_WORK_DAYS_JSON,
  effectiveWeeklyCapacityHours,
  parseWorkDaysJson,
  serializeWorkDaysJson,
} from "@/lib/tt-user-schedule";

export interface TtUserRow {
  id: string;
  login: string;
  password_hash: string;
  salt: string;
  display_name: string;
  job_title: string;
  avatar_url: string | null;
  role: TtUserRole;
  supabase_id: string | null;
  /** Email для Supabase Auth (signInWithPassword), если отличается от логина. */
  auth_email: string | null;
  weekly_capacity_hours: number;
  /** Часов в рабочий день (для графика и дневной ёмкости). */
  work_hours_per_day: number;
  /** JSON-массив дней недели 0–6 (Date.getDay()). */
  work_days_json: string | null;
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
  try {
    db.exec(`ALTER TABLE tt_users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'`);
  } catch {
    /* exists */
  }
  try {
    db.exec(`ALTER TABLE tt_users ADD COLUMN supabase_id TEXT`);
  } catch {
    /* exists */
  }
  try {
    db.exec(`ALTER TABLE tt_users ADD COLUMN weekly_capacity_hours REAL NOT NULL DEFAULT 40`);
  } catch {
    /* exists */
  }
  try {
    db.exec(`ALTER TABLE tt_users ADD COLUMN auth_email TEXT`);
  } catch {
    /* exists */
  }
  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_tt_users_supabase_id ON tt_users(supabase_id) WHERE supabase_id IS NOT NULL AND supabase_id != ''`);
  } catch {
    /* ignore */
  }
  try {
    db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_tt_users_auth_email_lower ON tt_users(lower(trim(auth_email))) WHERE auth_email IS NOT NULL AND trim(auth_email) != ''`
    );
  } catch {
    /* ignore */
  }
  try {
    db.exec(`ALTER TABLE tt_users ADD COLUMN work_hours_per_day REAL NOT NULL DEFAULT 8`);
  } catch {
    /* exists */
  }
  try {
    db.exec(`ALTER TABLE tt_users ADD COLUMN work_days_json TEXT`);
  } catch {
    /* exists */
  }
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

const RANDOM_PW_ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRandomPassword(length = 14): string {
  const bytes = randomBytes(length);
  let s = "";
  for (let i = 0; i < length; i++) {
    s += RANDOM_PW_ALPHABET[bytes[i]! % RANDOM_PW_ALPHABET.length];
  }
  return s;
}

function rowToUser(row: Record<string, unknown> | undefined): TtUserRow | null {
  if (!row) return null;
  return {
    id: String(row.id),
    login: String(row.login),
    password_hash: String(row.password_hash),
    salt: String(row.salt),
    display_name: String(row.display_name),
    job_title: String(row.job_title ?? ""),
    avatar_url: row.avatar_url != null ? String(row.avatar_url) : null,
    role: normalizeTtUserRole(row.role != null ? String(row.role) : "admin"),
    supabase_id: row.supabase_id != null && String(row.supabase_id).trim() ? String(row.supabase_id) : null,
    auth_email:
      row.auth_email != null && String(row.auth_email).trim() ? String(row.auth_email).trim() : null,
    weekly_capacity_hours:
      row.weekly_capacity_hours != null && !Number.isNaN(Number(row.weekly_capacity_hours))
        ? Number(row.weekly_capacity_hours)
        : 40,
    work_hours_per_day:
      row.work_hours_per_day != null && !Number.isNaN(Number(row.work_hours_per_day))
        ? Number(row.work_hours_per_day)
        : 8,
    work_days_json:
      row.work_days_json != null && String(row.work_days_json).trim()
        ? String(row.work_days_json)
        : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function getUserByLogin(login: string): TtUserRow | null {
  ensureTtUsersSchema();
  const db = getDb();
  const row = db.prepare(`SELECT * FROM tt_users WHERE lower(login) = lower(?)`).get(login.trim()) as
    | Record<string, unknown>
    | undefined;
  return rowToUser(row);
}

export function getUserById(id: string): TtUserRow | null {
  ensureTtUsersSchema();
  const db = getDb();
  const row = db.prepare(`SELECT * FROM tt_users WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  return rowToUser(row);
}

/** Публичные поля без секретов (списки, админка). */
export type TtUserPublic = {
  id: string;
  login: string;
  display_name: string;
  job_title: string;
  role: TtUserRole;
  weekly_capacity_hours: number;
  work_hours_per_day: number;
  work_days: number[];
  avatar_url: string | null;
  /** Email для входа через Supabase (если задан). */
  auth_email: string | null;
  created_at: string;
};

export function toTtUserPublic(row: TtUserRow): TtUserPublic {
  const work_days = parseWorkDaysJson(row.work_days_json);
  const work_hours_per_day =
    row.work_hours_per_day != null && !Number.isNaN(row.work_hours_per_day) ? row.work_hours_per_day : 8;
  const weekly_capacity_hours = effectiveWeeklyCapacityHours({
    work_hours_per_day,
    work_days,
    weekly_capacity_hours: row.weekly_capacity_hours,
  });
  return {
    id: row.id,
    login: row.login,
    display_name: row.display_name,
    job_title: row.job_title,
    role: row.role,
    weekly_capacity_hours,
    work_hours_per_day,
    work_days,
    avatar_url: row.avatar_url,
    auth_email: row.auth_email,
    created_at: row.created_at,
  };
}

/** Email для signInWithPassword: явный auth_email или логин, если он уже в формате email. */
export function getAuthEmailForUser(user: TtUserRow): string | null {
  if (user.auth_email?.trim()) return user.auth_email.trim();
  const login = user.login.trim();
  if (login.includes("@")) return login;
  return null;
}

function normalizeAuthEmailInput(raw: string | null): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  if (!t.includes("@")) {
    throw new Error("auth_email должен быть email (содержать @)");
  }
  return t;
}

export function listUserIdsWithRole(role: TtUserRole): string[] {
  ensureTtUsersSchema();
  const db = getDb();
  const rows = db.prepare(`SELECT id, role FROM tt_users`).all() as { id: string; role: string | null }[];
  return rows.filter((r) => normalizeTtUserRole(r.role) === role).map((r) => String(r.id));
}

export function listUsersPublic(): TtUserPublic[] {
  ensureTtUsersSchema();
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM tt_users ORDER BY display_name COLLATE NOCASE ASC`)
    .all() as Record<string, unknown>[];
  return rows.map((row) => toTtUserPublic(rowToUser(row)!));
}

function countEffectiveAdmins(): number {
  ensureTtUsersSchema();
  const db = getDb();
  const rows = db.prepare(`SELECT role FROM tt_users`).all() as { role: string | null }[];
  return rows.filter((r) => normalizeTtUserRole(r.role) === "admin").length;
}

export function updateUserRole(
  targetUserId: string,
  newRole: TtUserRole
): { ok: true; user: TtUserPublic } | { ok: false; error: string } {
  const target = getUserById(targetUserId);
  if (!target) return { ok: false, error: "Пользователь не найден" };
  if (normalizeTtUserRole(target.role) === "admin" && newRole !== "admin") {
    if (countEffectiveAdmins() <= 1) {
      return { ok: false, error: "Нельзя снять роль администратора с единственного админа" };
    }
  }
  const db = getDb();
  db.prepare(`UPDATE tt_users SET role = ?, updated_at = datetime('now') WHERE id = ?`).run(newRole, targetUserId);
  const updated = getUserById(targetUserId);
  if (!updated) return { ok: false, error: "Ошибка обновления" };
  return { ok: true, user: toTtUserPublic(updated) };
}

export function updateUserAuthEmail(
  targetUserId: string,
  authEmail: string | null
): { ok: true; user: TtUserPublic } | { ok: false; error: string } {
  const target = getUserById(targetUserId);
  if (!target) return { ok: false, error: "Пользователь не найден" };
  let normalized: string | null;
  try {
    normalized = normalizeAuthEmailInput(authEmail);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Некорректный email" };
  }
  const db = getDb();
  try {
    db.prepare(`UPDATE tt_users SET auth_email = ?, updated_at = datetime('now') WHERE id = ?`).run(
      normalized,
      targetUserId
    );
  } catch (e) {
    const msg = String(e);
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      return { ok: false, error: "Такой auth_email уже занят" };
    }
    throw e;
  }
  const updated = getUserById(targetUserId);
  if (!updated) return { ok: false, error: "Ошибка обновления" };
  return { ok: true, user: toTtUserPublic(updated) };
}

export function upsertUserFromPlain(params: {
  login: string;
  password: string;
  display_name: string;
  job_title?: string;
  avatar_url?: string | null;
  role?: TtUserRole;
  weekly_capacity_hours?: number;
  auth_email?: string | null;
}): TtUserRow {
  ensureTtUsersSchema();
  const db = getDb();
  const { password_hash, salt } = hashNewPassword(params.password);
  const role = params.role != null ? normalizeTtUserRole(params.role) : undefined;
  const cap =
    params.weekly_capacity_hours != null && !Number.isNaN(Number(params.weekly_capacity_hours))
      ? Number(params.weekly_capacity_hours)
      : undefined;
  let nextAuth: string | null | undefined;
  if (params.auth_email !== undefined) {
    try {
      nextAuth = normalizeAuthEmailInput(params.auth_email);
    } catch {
      nextAuth = undefined;
    }
  }
  const existing = getUserByLogin(params.login);
  if (existing) {
    const nextRole = role ?? existing.role;
    const nextCap = cap ?? existing.weekly_capacity_hours;
    const authToStore = nextAuth !== undefined ? nextAuth : existing.auth_email;
    db.prepare(
      `UPDATE tt_users SET password_hash = ?, salt = ?, display_name = ?, job_title = ?, avatar_url = COALESCE(?, avatar_url), role = ?, weekly_capacity_hours = ?, auth_email = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      password_hash,
      salt,
      params.display_name.trim(),
      (params.job_title ?? existing.job_title).trim(),
      params.avatar_url ?? null,
      nextRole,
      nextCap,
      authToStore,
      existing.id
    );
    return getUserById(existing.id)!;
  }
  const id = `u_${randomBytes(12).toString("hex")}`;
  const insertAuth = nextAuth !== undefined ? nextAuth : null;
  const insertWeekly = cap ?? 40;
  db.prepare(
    `INSERT INTO tt_users (id, login, password_hash, salt, display_name, job_title, avatar_url, role, weekly_capacity_hours, auth_email, work_hours_per_day, work_days_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.login.trim(),
    password_hash,
    salt,
    params.display_name.trim(),
    (params.job_title ?? "").trim(),
    params.avatar_url ?? null,
    role ?? "admin",
    insertWeekly,
    insertAuth,
    8,
    DEFAULT_WORK_DAYS_JSON
  );
  return getUserById(id)!;
}

const SELF_REG_MIN_LOGIN = 2;
const SELF_REG_MIN_PASSWORD = 8;

/** Новая учётка с ролью `member` (саморегистрация). */
export function registerSelfServeMember(params: {
  login: string;
  password: string;
  display_name: string;
  job_title?: string;
}): { ok: true; user: TtUserRow } | { ok: false; error: string } {
  ensureTtUsersSchema();
  const login = params.login.trim();
  if (login.length < SELF_REG_MIN_LOGIN) {
    return { ok: false, error: "Логин слишком короткий" };
  }
  if (params.password.length < SELF_REG_MIN_PASSWORD) {
    return { ok: false, error: `Пароль не короче ${SELF_REG_MIN_PASSWORD} символов` };
  }
  const display_name = params.display_name.trim();
  if (!display_name) return { ok: false, error: "Укажите имя" };
  if (getUserByLogin(login)) return { ok: false, error: "Такой логин уже занят" };

  const { password_hash, salt } = hashNewPassword(params.password);
  const id = `u_${randomBytes(12).toString("hex")}`;
  let authEmail: string | null = null;
  if (login.includes("@")) {
    try {
      authEmail = normalizeAuthEmailInput(login);
    } catch {
      authEmail = null;
    }
  }
  const db = getDb();
  try {
    db.prepare(
      `INSERT INTO tt_users (id, login, password_hash, salt, display_name, job_title, avatar_url, role, weekly_capacity_hours, auth_email, work_hours_per_day, work_days_json) VALUES (?, ?, ?, ?, ?, ?, NULL, 'member', 40, ?, ?, ?)`
    ).run(
      id,
      login,
      password_hash,
      salt,
      display_name,
      (params.job_title ?? "").trim(),
      authEmail,
      8,
      DEFAULT_WORK_DAYS_JSON
    );
  } catch (e) {
    const msg = String(e);
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      return { ok: false, error: "Такой логин или email уже занят" };
    }
    throw e;
  }
  const row = getUserById(id);
  if (!row) return { ok: false, error: "Не удалось создать учётку" };
  return { ok: true, user: row };
}

/** После успешного Supabase signIn: записать supabase_id, если не занят другой учёткой. */
export function linkTtUserToSupabaseAuthId(
  ttUserId: string,
  supabaseUserId: string
): { ok: true } | { ok: false; error: string } {
  ensureTtUsersSchema();
  const sid = supabaseUserId.trim();
  if (!sid) return { ok: false, error: "Пустой supabase id" };
  const db = getDb();
  const other = db
    .prepare(`SELECT id FROM tt_users WHERE supabase_id = ? AND id != ?`)
    .get(sid, ttUserId) as { id: string } | undefined;
  if (other) {
    return { ok: false, error: "Этот Supabase-пользователь уже привязан к другой учётке" };
  }
  db.prepare(`UPDATE tt_users SET supabase_id = ?, updated_at = datetime('now') WHERE id = ?`).run(
    sid,
    ttUserId
  );
  return { ok: true };
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

export function createUserByAdminEmail(params: {
  email: string;
  display_name?: string;
  job_title?: string;
  role?: TtUserRole;
}):
  | { ok: true; user: TtUserPublic; temporaryPassword: string }
  | { ok: false; error: string } {
  ensureTtUsersSchema();
  let normalized: string;
  try {
    normalized = normalizeAuthEmailInput(params.email.trim()) as string;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Некорректный email" };
  }
  const login = normalized.toLowerCase();
  if (getUserByLogin(login)) {
    return { ok: false, error: "Пользователь с таким email уже есть" };
  }
  const display_name = (params.display_name?.trim() || login.split("@")[0] || "Сотрудник").slice(0, 200);
  const temporaryPassword = generateRandomPassword(14);
  const { password_hash, salt } = hashNewPassword(temporaryPassword);
  const role = params.role != null ? normalizeTtUserRole(params.role) : "member";
  const work_hours_per_day = 8;
  const work_days_json = DEFAULT_WORK_DAYS_JSON;
  const work_days = parseWorkDaysJson(work_days_json);
  const weekly_capacity_hours = effectiveWeeklyCapacityHours({
    work_hours_per_day,
    work_days,
    weekly_capacity_hours: 40,
  });
  const id = `u_${randomBytes(12).toString("hex")}`;
  const db = getDb();
  try {
    db.prepare(
      `INSERT INTO tt_users (id, login, password_hash, salt, display_name, job_title, avatar_url, role, weekly_capacity_hours, auth_email, work_hours_per_day, work_days_json) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`
    ).run(
      id,
      login,
      password_hash,
      salt,
      display_name,
      (params.job_title ?? "").trim(),
      role,
      weekly_capacity_hours,
      normalized,
      work_hours_per_day,
      work_days_json
    );
  } catch (e) {
    const msg = String(e);
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      return { ok: false, error: "Такой логин или email уже занят" };
    }
    throw e;
  }
  const row = getUserById(id);
  if (!row) return { ok: false, error: "Не удалось создать учётку" };
  return { ok: true, user: toTtUserPublic(row), temporaryPassword };
}

export function updateUserScheduleAndProfile(
  targetUserId: string,
  patch: {
    work_hours_per_day?: number;
    work_days?: number[] | null;
    weekly_capacity_hours?: number | null;
    display_name?: string;
    job_title?: string | null;
  }
): { ok: true; user: TtUserPublic } | { ok: false; error: string } {
  const target = getUserById(targetUserId);
  if (!target) return { ok: false, error: "Пользователь не найден" };

  let work_hours_per_day = target.work_hours_per_day;
  if (patch.work_hours_per_day !== undefined) {
    const h = Number(patch.work_hours_per_day);
    if (!Number.isFinite(h) || h < 0.25 || h > 24) {
      return { ok: false, error: "work_hours_per_day: ожидается число от 0.25 до 24" };
    }
    work_hours_per_day = h;
  }

  let work_days_json = target.work_days_json;
  if (patch.work_days !== undefined) {
    if (patch.work_days === null || patch.work_days.length === 0) {
      work_days_json = DEFAULT_WORK_DAYS_JSON;
    } else {
      work_days_json = serializeWorkDaysJson(patch.work_days);
    }
  }

  const work_days = parseWorkDaysJson(work_days_json);
  let weekly_capacity_hours = target.weekly_capacity_hours;
  if (patch.weekly_capacity_hours !== undefined && patch.weekly_capacity_hours !== null) {
    const w = Number(patch.weekly_capacity_hours);
    if (!Number.isFinite(w) || w <= 0 || w > 168) {
      return { ok: false, error: "weekly_capacity_hours: ожидается число от 1 до 168" };
    }
    weekly_capacity_hours = w;
  } else if (patch.work_hours_per_day !== undefined || patch.work_days !== undefined) {
    weekly_capacity_hours = effectiveWeeklyCapacityHours({
      work_hours_per_day,
      work_days,
      weekly_capacity_hours: target.weekly_capacity_hours,
    });
  }

  const display_name =
    patch.display_name !== undefined ? patch.display_name.trim() || target.display_name : target.display_name;
  const job_title =
    patch.job_title !== undefined ? String(patch.job_title ?? "").trim() : target.job_title;

  const db = getDb();
  db.prepare(
    `UPDATE tt_users SET work_hours_per_day = ?, work_days_json = ?, weekly_capacity_hours = ?, display_name = ?, job_title = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(work_hours_per_day, work_days_json, weekly_capacity_hours, display_name, job_title, targetUserId);

  const updated = getUserById(targetUserId);
  if (!updated) return { ok: false, error: "Ошибка обновления" };
  return { ok: true, user: toTtUserPublic(updated) };
}

export function updateUserPasswordSelf(
  userId: string,
  currentPassword: string,
  newPassword: string
): { ok: true } | { ok: false; error: string } {
  if (newPassword.length < 8) {
    return { ok: false, error: "Новый пароль не короче 8 символов" };
  }
  const row = getUserById(userId);
  if (!row) return { ok: false, error: "Пользователь не найден" };
  if (!verifyPassword(currentPassword, row)) {
    return { ok: false, error: "Неверный текущий пароль" };
  }
  const { password_hash, salt } = hashNewPassword(newPassword);
  const db = getDb();
  db.prepare(`UPDATE tt_users SET password_hash = ?, salt = ?, updated_at = datetime('now') WHERE id = ?`).run(
    password_hash,
    salt,
    userId
  );
  return { ok: true };
}

export function resetUserPasswordByAdmin(
  targetUserId: string
): { ok: true; temporaryPassword: string } | { ok: false; error: string } {
  const row = getUserById(targetUserId);
  if (!row) return { ok: false, error: "Пользователь не найден" };
  const temporaryPassword = generateRandomPassword(14);
  const { password_hash, salt } = hashNewPassword(temporaryPassword);
  const db = getDb();
  db.prepare(`UPDATE tt_users SET password_hash = ?, salt = ?, updated_at = datetime('now') WHERE id = ?`).run(
    password_hash,
    salt,
    targetUserId
  );
  return { ok: true, temporaryPassword };
}

/** Синхронизация учёток из env (те же логины/пароли, что в Twinworks — один JSON при деплое). */
export function syncUsersFromEnv(): void {
  const raw = process.env.TEAM_TRACKER_USERS_JSON?.trim();
  if (!raw) return;
  let arr: Array<{
    login: string;
    password: string;
    name: string;
    title?: string;
    avatar?: string | null;
    role?: string;
    weekly_capacity_hours?: number;
    auth_email?: string | null;
  }>;
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
      role: u.role != null ? normalizeTtUserRole(String(u.role)) : undefined,
      weekly_capacity_hours: u.weekly_capacity_hours,
      auth_email: u.auth_email,
    });
  }
}
