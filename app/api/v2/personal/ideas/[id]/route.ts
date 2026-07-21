import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import {
  deletePersonalIdea,
  PersonalIdeasValidationError,
  updatePersonalIdea,
} from "@/lib/v2/personal/personal-ideas-repo";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const body = await request.json();
    const idea = await updatePersonalIdea(auth.ctx, id, {
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
    console.error("personal ideas update:", e);
    return NextResponse.json({ error: "Failed to update idea" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    await deletePersonalIdea(auth.ctx, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PersonalIdeasValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("personal ideas delete:", e);
    return NextResponse.json({ error: "Failed to delete idea" }, { status: 500 });
  }
}
