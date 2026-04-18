import { NextRequest, NextResponse } from "next/server";
import { assertMemberCardAccess } from "@/lib/member-board-access";
import { createCardComment, listCommentsForCard } from "@/lib/pm-card-comments";
import { getServerSession } from "@/lib/get-session";
import { requireSessionRole } from "@/lib/require-role";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const auth = await requireSessionRole();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const cardId = typeof id === "string" ? id.trim() : "";
    if (!cardId) return NextResponse.json({ error: "id required" }, { status: 400 });
    const denied = assertMemberCardAccess(auth.role, cardId);
    if (denied) return denied;
    const comments = listCommentsForCard(cardId);
    return NextResponse.json({ comments });
  } catch (e) {
    console.error("GET /api/cards/[id]/comments", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireSessionRole();
    if (!auth.ok) return auth.response;
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const cardId = typeof id === "string" ? id.trim() : "";
    if (!cardId) return NextResponse.json({ error: "id required" }, { status: 400 });
    const denied = assertMemberCardAccess(auth.role, cardId);
    if (denied) return denied;
    const body = await request.json().catch(() => ({}));
    const text = typeof body.body === "string" ? body.body : "";
    if (!text.trim()) return NextResponse.json({ error: "body required" }, { status: 400 });
    const c = createCardComment({
      cardId,
      authorUserId: session.sub,
      authorDisplayName: session.name,
      body: text,
    });
    if (!c) return NextResponse.json({ error: "Не удалось сохранить" }, { status: 400 });
    return NextResponse.json({ comment: c });
  } catch (e) {
    console.error("POST /api/cards/[id]/comments", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
