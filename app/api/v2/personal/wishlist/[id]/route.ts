import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { deleteWish, updateWish } from "@/lib/v2/personal/personal-wishlist-repo";
import { wishlistFail } from "@/lib/v2/personal/wishlist-http";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  try {
    const body = await request.json();
    const wish = await updateWish(auth.ctx, id, {
      title: body.title,
      priceRub: body.priceRub ?? body.price_rub,
      savedRub: body.savedRub ?? body.saved_rub,
      status: body.status,
      note: body.note,
    });
    return NextResponse.json({ wish });
  } catch (error) {
    return wishlistFail(error, "Не удалось сохранить хотелку");
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  try {
    await deleteWish(auth.ctx, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return wishlistFail(error, "Не удалось удалить хотелку");
  }
}
