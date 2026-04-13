import { getCard } from "@/lib/db";
import { createNotification } from "@/lib/tt-notifications";
import type { PmSubtask } from "@/lib/pm-subtasks";

function notifyIfNewParticipant(params: {
  targetUserId: string | null;
  actorUserId: string;
  cardId: string;
  cardName: string;
  subtaskId: string;
  subtaskTitle: string;
  role: "assignee" | "lead";
}) {
  const uid = params.targetUserId?.trim();
  if (!uid || uid === params.actorUserId) return;
  createNotification({
    userId: uid,
    type: "subtask_assigned",
    payload: {
      cardId: params.cardId,
      cardName: params.cardName,
      subtaskId: params.subtaskId,
      subtaskTitle: params.subtaskTitle,
      role: params.role,
    },
  });
}

export function notifySubtaskCreated(params: {
  actorUserId: string;
  cardId: string;
  subtask: PmSubtask;
}): void {
  const card = getCard(params.cardId);
  if (!card) return;
  const title = params.subtask.title;
  notifyIfNewParticipant({
    targetUserId: params.subtask.assignee_user_id,
    actorUserId: params.actorUserId,
    cardId: params.cardId,
    cardName: card.name,
    subtaskId: params.subtask.id,
    subtaskTitle: title,
    role: "assignee",
  });
  const lead = params.subtask.lead_user_id;
  const assignee = params.subtask.assignee_user_id;
  if (lead && lead !== assignee) {
    notifyIfNewParticipant({
      targetUserId: lead,
      actorUserId: params.actorUserId,
      cardId: params.cardId,
      cardName: card.name,
      subtaskId: params.subtask.id,
      subtaskTitle: title,
      role: "lead",
    });
  }
}

export function notifySubtaskAssigneesChanged(params: {
  actorUserId: string;
  cardId: string;
  prev: PmSubtask;
  next: PmSubtask;
}): void {
  const card = getCard(params.cardId);
  if (!card) return;
  const title = params.next.title;
  const prevA = params.prev.assignee_user_id;
  const nextA = params.next.assignee_user_id;
  if (nextA && nextA !== prevA) {
    notifyIfNewParticipant({
      targetUserId: nextA,
      actorUserId: params.actorUserId,
      cardId: params.cardId,
      cardName: card.name,
      subtaskId: params.next.id,
      subtaskTitle: title,
      role: "assignee",
    });
  }
  const prevL = params.prev.lead_user_id;
  const nextL = params.next.lead_user_id;
  if (nextL && nextL !== prevL) {
    notifyIfNewParticipant({
      targetUserId: nextL,
      actorUserId: params.actorUserId,
      cardId: params.cardId,
      cardName: card.name,
      subtaskId: params.next.id,
      subtaskTitle: title,
      role: "lead",
    });
  }
}
