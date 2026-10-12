import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import {
  WISHLIST_SEED,
  isWishStatus,
  type WishItem,
  type WishStatus,
} from "@/lib/v2/personal/wishlist-meta";
import type { V2SessionContext } from "@/lib/v2/types";

export class WishlistValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WishlistValidationError";
  }
}

export class WishlistNotFoundError extends Error {
  constructor() {
    super("Хотелка не найдена");
    this.name = "WishlistNotFoundError";
  }
}

function uid(ctx: V2SessionContext) {
  return ctx.userId;
}

function clip(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function money(value: unknown) {
  const n = Math.round(Number(value) || 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 1_000_000_000);
}

function mapWish(row: Record<string, unknown>): WishItem {
  const status = String(row.status ?? "want");
  const prev = row.prev_status == null ? null : String(row.prev_status);
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    price_rub: Number(row.price_rub) || 0,
    saved_rub: Number(row.saved_rub) || 0,
    status: isWishStatus(status) ? status : "want",
    note: String(row.note ?? ""),
    prev_status: prev === "want" || prev === "saving" ? prev : null,
    done_at: row.done_at ? String(row.done_at) : null,
    sort_order: Number(row.sort_order) || 0,
  };
}

async function ensureSeed(userId: string) {
  const sb = getV2Supabase();
  const { data: settings, error: settingsError } = await sb
    .from("v2_personal_wishlist_settings")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (settingsError) throw settingsError;
  if (settings) return;

  const { count, error: countError } = await sb
    .from("v2_personal_wishlist")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (countError) throw countError;

  if (!count) {
    const now = nowIso();
    const rows = WISHLIST_SEED.map((item, index) => ({
      id: newV2Id(),
      user_id: userId,
      title: item.title,
      price_rub: item.price_rub,
      saved_rub: item.saved_rub ?? 0,
      status: item.status,
      note: "",
      prev_status: item.status === "done" ? "want" : null,
      done_at: item.status === "done" ? now : null,
      sort_order: index,
      created_at: now,
      updated_at: now,
    }));
    const { error } = await sb.from("v2_personal_wishlist").insert(rows);
    if (error) throw error;
  }

  const { error: markError } = await sb.from("v2_personal_wishlist_settings").insert({
    user_id: userId,
    seeded_at: nowIso(),
  });
  if (markError && markError.code !== "23505") throw markError;
}

export async function loadWishlist(ctx: V2SessionContext): Promise<WishItem[]> {
  const userId = uid(ctx);
  await ensureSeed(userId);
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_wishlist")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => mapWish(row as Record<string, unknown>));
}

async function requireOwned(ctx: V2SessionContext, id: string): Promise<WishItem> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_wishlist")
    .select("*")
    .eq("id", id)
    .eq("user_id", uid(ctx))
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new WishlistNotFoundError();
  return mapWish(data as Record<string, unknown>);
}

export async function createWish(
  ctx: V2SessionContext,
  input: { title?: string; priceRub?: number; status?: string },
): Promise<WishItem> {
  const userId = uid(ctx);
  const status: WishStatus = input.status && isWishStatus(input.status) && input.status !== "done" ? input.status : "want";
  const sb = getV2Supabase();
  const { data: existing, error: existingError } = await sb
    .from("v2_personal_wishlist")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (existingError) throw existingError;
  const now = nowIso();
  const row = {
    id: newV2Id(),
    user_id: userId,
    title: clip(input.title, 200),
    price_rub: money(input.priceRub),
    saved_rub: 0,
    status,
    note: "",
    prev_status: null,
    done_at: null,
    sort_order: existing?.[0] ? Number(existing[0].sort_order) + 1 : 0,
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await sb.from("v2_personal_wishlist").insert(row).select("*").single();
  if (error) throw error;
  return mapWish(data as Record<string, unknown>);
}

export async function updateWish(
  ctx: V2SessionContext,
  id: string,
  input: {
    title?: string;
    priceRub?: number;
    savedRub?: number;
    status?: string;
    note?: string;
  },
): Promise<WishItem> {
  const current = await requireOwned(ctx, id);
  const patch: Record<string, unknown> = { updated_at: nowIso() };
  if (input.title !== undefined) patch.title = clip(input.title, 200);
  if (input.priceRub !== undefined) patch.price_rub = money(input.priceRub);
  if (input.savedRub !== undefined) patch.saved_rub = money(input.savedRub);
  if (input.note !== undefined) patch.note = clip(input.note, 2000);
  if (input.status !== undefined) {
    if (!isWishStatus(input.status)) throw new WishlistValidationError("Неизвестный статус");
    patch.status = input.status;
    if (input.status === "done" && current.status !== "done") {
      patch.prev_status = current.status === "saving" ? "saving" : "want";
      patch.done_at = nowIso();
    } else if (input.status !== "done") {
      patch.done_at = null;
    }
  }
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_wishlist")
    .update(patch)
    .eq("id", id)
    .eq("user_id", uid(ctx))
    .select("*")
    .single();
  if (error) throw error;
  return mapWish(data as Record<string, unknown>);
}

export async function deleteWish(ctx: V2SessionContext, id: string) {
  await requireOwned(ctx, id);
  const sb = getV2Supabase();
  const { error } = await sb.from("v2_personal_wishlist").delete().eq("id", id).eq("user_id", uid(ctx));
  if (error) throw error;
}
