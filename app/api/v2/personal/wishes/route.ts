import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import {
  createPersonalWish,
  loadPersonalWishes,
  PersonalWishesValidationError,
} from "@/lib/v2/personal/personal-wishes-repo";

export async function GET() {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const wishes = await loadPersonalWishes(auth.ctx);
    return NextResponse.json({ wishes });
  } catch (e) {
    console.error("personal wishes list:", e);
    return NextResponse.json({ error: "Failed to load wishes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const wish = await createPersonalWish(auth.ctx, {
      title: body.title,
      description: body.description ?? body.desc,
      note: body.note,
      categories: body.categories ?? body.cats,
      grid_col: body.grid_col,
      grid_row: body.grid_row,
    });
    return NextResponse.json({ wish });
  } catch (e) {
    if (e instanceof PersonalWishesValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("personal wishes create:", e);
    return NextResponse.json({ error: "Failed to create wish" }, { status: 500 });
  }
}
