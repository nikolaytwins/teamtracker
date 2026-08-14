import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import {
  createPersonalWishCategory,
  PersonalWishesValidationError,
} from "@/lib/v2/personal/personal-wishes-repo";

export async function POST(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const category = await createPersonalWishCategory(auth.ctx, String(body.name ?? ""));
    return NextResponse.json({ category });
  } catch (e) {
    if (e instanceof PersonalWishesValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("personal wish category create:", e);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
