import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import {
  deletePersonalObservation,
  PersonalObservationsValidationError,
  updatePersonalObservation,
} from "@/lib/v2/personal/personal-observations-repo";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  try {
    const body = await request.json();
    const observation = await updatePersonalObservation(auth.ctx, id, {
      type: body.type,
      title: body.title,
      body: body.body,
      why: body.why,
      linkKey: body.linkKey ?? body.link,
      tagNames: Array.isArray(body.tagNames)
        ? body.tagNames.map(String)
        : Array.isArray(body.tags)
          ? body.tags.map(String)
          : undefined,
      observedAt: body.observedAt,
    });
    return NextResponse.json({ observation });
  } catch (e) {
    if (e instanceof PersonalObservationsValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("personal observations update:", e);
    return NextResponse.json({ error: "Failed to update observation" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  try {
    await deletePersonalObservation(auth.ctx, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("personal observations delete:", e);
    return NextResponse.json({ error: "Failed to delete observation" }, { status: 500 });
  }
}
