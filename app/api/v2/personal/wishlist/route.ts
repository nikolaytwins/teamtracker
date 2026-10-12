import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { createWish, loadWishlist } from "@/lib/v2/personal/personal-wishlist-repo";
import { wishlistFail } from "@/lib/v2/personal/wishlist-http";

export async function GET() {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const wishes = await loadWishlist(auth.ctx);
    return NextResponse.json({ wishes });
  } catch (error) {
    return wishlistFail(error, "Не удалось загрузить хотелки");
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json().catch(() => ({}));
    const wish = await createWish(auth.ctx, {
      title: body.title,
      priceRub: body.priceRub ?? body.price_rub,
      status: body.status,
    });
    return NextResponse.json({ wish });
  } catch (error) {
    return wishlistFail(error, "Не удалось добавить хотелку");
  }
}
