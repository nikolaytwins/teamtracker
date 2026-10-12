import { NextResponse } from "next/server";
import { WishlistNotFoundError, WishlistValidationError } from "@/lib/v2/personal/personal-wishlist-repo";

export function wishlistFail(error: unknown, fallback: string) {
  if (error instanceof WishlistValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof WishlistNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  const message =
    error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : "";
  const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "";
  console.error(fallback, error);
  if (code === "42P01" || code === "PGRST205" || /does not exist|schema cache|v2_personal_wishlist/i.test(message)) {
    return NextResponse.json(
      { error: "Список хотелок ещё не создан в базе. Примени миграцию 091_v2_personal_wishlist.sql в Supabase." },
      { status: 500 },
    );
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}
