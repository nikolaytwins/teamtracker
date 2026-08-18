import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import {
  deletePersonalWish,
  PersonalWishesValidationError,
  updatePersonalWish,
} from "@/lib/v2/personal/personal-wishes-repo";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const body = await request.json();
    const wish = await updatePersonalWish(auth.ctx, id, {
      title: body.title,
      description: body.description ?? body.desc,
      note: body.note,
      categories: body.categories ?? body.cats,
      scale: body.scale,
      is_near: body.is_near ?? body.isNear,
      grid_col: body.grid_col,
      grid_row: body.grid_row,
    });
    return NextResponse.json({ wish });
  } catch (e) {
    if (e instanceof PersonalWishesValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("personal wishes update:", e);
    return NextResponse.json({ error: "Failed to update wish" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    await deletePersonalWish(auth.ctx, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PersonalWishesValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("personal wishes delete:", e);
    return NextResponse.json({ error: "Failed to delete wish" }, { status: 500 });
  }
}
