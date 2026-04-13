import { NextResponse } from "next/server";
import { listCards } from "@/lib/db";
import { filterCardsForMemberRestrictedRole } from "@/lib/member-board-access";
import { VIRTUAL_OTHER_CARD_ID } from "@/lib/pm-constants";
import { requireSessionRole } from "@/lib/require-role";
import type { PmStatusKey } from "@/lib/statuses";

const INACTIVE = new Set<PmStatusKey>(["done", "pause"]);

/** Активные карточки для таймера + виртуальная «Другое». */
export async function GET() {
  try {
    const auth = await requireSessionRole();
    if (!auth.ok) return auth.response;
    const scoped = filterCardsForMemberRestrictedRole(auth.role, listCards());
    const cards = scoped.filter((c) => c.id === VIRTUAL_OTHER_CARD_ID || !INACTIVE.has(c.status));
    return NextResponse.json(cards);
  } catch (e) {
    console.error("GET /api/cards/active", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
