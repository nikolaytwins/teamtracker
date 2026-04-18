import { getCard, getDb } from "@/lib/db";

export interface PmCardComment {
  id: string;
  card_id: string;
  author_user_id: string;
  author_display_name: string;
  body: string;
  created_at: string;
}

function rowToComment(row: Record<string, unknown>): PmCardComment {
  return {
    id: String(row.id),
    card_id: String(row.card_id),
    author_user_id: String(row.author_user_id ?? ""),
    author_display_name: String(row.author_display_name ?? ""),
    body: String(row.body ?? ""),
    created_at: String(row.created_at ?? ""),
  };
}

export function listCommentsForCard(cardId: string): PmCardComment[] {
  if (!getCard(cardId)) return [];
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM pm_card_comments WHERE card_id = ? ORDER BY created_at ASC, id ASC`)
    .all(cardId) as Record<string, unknown>[];
  return rows.map(rowToComment);
}

export function createCardComment(params: {
  cardId: string;
  authorUserId: string;
  authorDisplayName: string;
  body: string;
}): PmCardComment | null {
  if (!getCard(params.cardId)) return null;
  const body = params.body.trim();
  if (!body) return null;
  const id = `ccom_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const db = getDb();
  db.prepare(
    `INSERT INTO pm_card_comments (id, card_id, author_user_id, author_display_name, body) VALUES (?, ?, ?, ?, ?)`
  ).run(
    id,
    params.cardId,
    params.authorUserId.trim(),
    params.authorDisplayName.trim() || "—",
    body.slice(0, 8000)
  );
  const row = db.prepare(`SELECT * FROM pm_card_comments WHERE id = ?`).get(id) as Record<string, unknown>;
  return rowToComment(row);
}
