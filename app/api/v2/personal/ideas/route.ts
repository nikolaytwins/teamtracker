import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import {
  createPersonalIdea,
  loadPersonalIdeasBoard,
  PersonalIdeasValidationError,
} from "@/lib/v2/personal/personal-ideas-repo";

export async function GET() {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const board = await loadPersonalIdeasBoard(auth.ctx);
    return NextResponse.json(board);
  } catch (e) {
    console.error("personal ideas list:", e);
    return NextResponse.json({ error: "Failed to load ideas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const idea = await createPersonalIdea(auth.ctx, {
      title: body.title,
      body: body.body,
      accent: body.accent,
      pinned: body.pinned,
      tagNames: Array.isArray(body.tagNames)
        ? body.tagNames.map(String)
        : Array.isArray(body.tags)
          ? body.tags.map(String)
          : undefined,
    });
    return NextResponse.json({ idea });
  } catch (e) {
    if (e instanceof PersonalIdeasValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("personal ideas create:", e);
    return NextResponse.json({ error: "Failed to create idea" }, { status: 500 });
  }
}
