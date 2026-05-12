import { getCard, getDb, listCards, type PmCard } from "@/lib/db";
import { VIRTUAL_OTHER_CARD_ID } from "@/lib/pm-constants";
import { userHasOpenAssignmentOnCard } from "@/lib/pm-subtasks";
import { isMemberRestrictedRole, type TtUserRole } from "@/lib/roles";

function listAttachedNonDoneCardsForUser(userId: string): PmCard[] {
  const uid = userId.trim();
  if (!uid) return [];
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.*
       FROM pm_cards c
       WHERE c.id IN (
         SELECT s.card_id FROM pm_subtasks s
         WHERE (s.assignee_user_id = ? OR s.lead_user_id = ?)
           AND s.completed_at IS NULL
       )
       AND c.status != 'done'
       ORDER BY c.name COLLATE NOCASE ASC`
    )
    .all(uid, uid) as PmCard[];
  const seen = new Set(rows.map((c) => c.id));
  const other = getCard(VIRTUAL_OTHER_CARD_ID);
  if (other && !seen.has(other.id)) {
    return [...rows, other];
  }
  return rows;
}

/** Проекты для главной / таймера: не «готов»; для роли member — только с открытым участием + «Другое». */
export function listHomeTimerProjectCards(role: TtUserRole, userId: string): PmCard[] {
  if (isMemberRestrictedRole(role)) {
    return listAttachedNonDoneCardsForUser(userId);
  }
  return listCards()
    .filter((c) => c.status !== "done")
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

/** Ошибка или null, если карточку можно использовать для таймера с главной. */
export function validateCardForHomeTimer(role: TtUserRole, userId: string, cardId: string): string | null {
  const card = getCard(cardId);
  if (!card) return "Проект не найден";
  if (card.status === "done") return "Проект завершён, учёт времени недоступен";
  if (isMemberRestrictedRole(role)) {
    if (cardId !== VIRTUAL_OTHER_CARD_ID && !userHasOpenAssignmentOnCard(userId, cardId)) {
      return "Нет доступа к этому проекту";
    }
  }
  return null;
}
