import { NextResponse } from "next/server";
import { deleteAllCards } from "@/lib/db";

/** Очистить канбан: удалить все карточки. В Agency проекты остаются. */
export async function POST() {
  try {
    const deleted = deleteAllCards();
    return NextResponse.json({ success: true, deleted });
  } catch (e) {
    console.error("POST /api/cards/clear", e);
    return NextResponse.json({ error: "Не удалось очистить канбан" }, { status: 500 });
  }
}
