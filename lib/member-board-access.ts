import { NextResponse } from "next/server";
import type { PmCard } from "@/lib/db";
import { VIRTUAL_OTHER_CARD_ID } from "@/lib/pm-constants";
import type { TtUserRole } from "@/lib/roles";
import { isMemberRestrictedRole } from "@/lib/roles";

export function filterCardsForMemberRestrictedRole(role: TtUserRole, cards: PmCard[]): PmCard[] {
  if (!isMemberRestrictedRole(role)) return cards;
  return cards.filter((c) => c.id === VIRTUAL_OTHER_CARD_ID);
}

/** Для роли member — только виртуальная карточка «Другое» (таймер без командной доски). */
export function assertMemberCardAccess(role: TtUserRole, cardId: string): NextResponse | null {
  if (!isMemberRestrictedRole(role)) return null;
  if (cardId === VIRTUAL_OTHER_CARD_ID) return null;
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
