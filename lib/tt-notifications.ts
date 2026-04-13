import { getDb } from "@/lib/db";
import { APPROVAL_WAITING_STATUS_SET } from "@/lib/statuses";
import { listUserIdsWithRole } from "@/lib/tt-auth-db";
import type { TtUserRole } from "@/lib/roles";

export type TtNotificationRow = {
  id: string;
  user_id: string;
  type: string;
  payload: string;
  read_at: string | null;
  created_at: string;
};

export function createNotification(params: {
  userId: string;
  type: string;
  payload: Record<string, unknown>;
}): TtNotificationRow {
  const db = getDb();
  const id = `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const payloadJson = JSON.stringify(params.payload);
  db.prepare(
    `INSERT INTO tt_notifications (id, user_id, type, payload, read_at) VALUES (?, ?, ?, ?, NULL)`
  ).run(id, params.userId, params.type, payloadJson);
  return db.prepare(`SELECT * FROM tt_notifications WHERE id = ?`).get(id) as TtNotificationRow;
}

export function listNotificationsForUser(userId: string, limit = 30): TtNotificationRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM tt_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(userId, limit) as TtNotificationRow[];
}

export function countUnreadForUser(userId: string): number {
  const db = getDb();
  const row = db
    .prepare(`SELECT COUNT(*) as c FROM tt_notifications WHERE user_id = ? AND read_at IS NULL`)
    .get(userId) as { c: number };
  return Number(row?.c) || 0;
}

export function markNotificationsRead(userId: string, ids: string[]): number {
  if (ids.length === 0) return 0;
  const db = getDb();
  const now = new Date().toISOString();
  let n = 0;
  const stmt = db.prepare(`UPDATE tt_notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL`);
  for (const id of ids) {
    const r = stmt.run(now, id, userId);
    n += r.changes;
  }
  return n;
}

function hasRecentApprovalStale(userId: string, cardId: string, hours = 24): boolean {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id FROM tt_notifications
       WHERE user_id = ? AND type = 'approval_stale'
         AND json_extract(payload, '$.cardId') = ?
         AND datetime(created_at) > datetime('now', ?)
       LIMIT 1`
    )
    .get(userId, cardId, `-${hours} hours`) as { id: string } | undefined;
  return Boolean(row);
}

/** Создаёт уведомления админам о карточках в согласовании дольше 48 ч (не чаще 1 на карточку / пользователя за сутки). */
export function ensureApprovalStaleNotifications(): void {
  const db = getDb();
  const adminIds = listUserIdsWithRole("admin" as TtUserRole);
  if (adminIds.length === 0) return;
  const statusList = [...APPROVAL_WAITING_STATUS_SET];
  const sql = `SELECT id, name, approval_waiting_since, status FROM pm_cards
    WHERE approval_waiting_since IS NOT NULL
      AND approval_waiting_since != ''
      AND status IN (${statusList.map(() => "?").join(",")})
      AND datetime(approval_waiting_since) <= datetime('now', '-48 hours')`;
  const cards = db.prepare(sql).all(...statusList) as Array<{
    id: string;
    name: string;
    approval_waiting_since: string;
    status: string;
  }>;
  for (const card of cards) {
    for (const uid of adminIds) {
      if (hasRecentApprovalStale(uid, card.id)) continue;
      createNotification({
        userId: uid,
        type: "approval_stale",
        payload: {
          cardId: card.id,
          cardName: card.name,
          waitingSince: card.approval_waiting_since,
          status: card.status,
        },
      });
    }
  }
}
