import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import type { V2SessionContext } from "@/lib/v2/types";
import {
  gridSizeForWish,
  MAX_WISH_IMAGES,
  normalizeWishCategories,
  normalizeWishScale,
  pickCustomCatColors,
  wishScaleRank,
  type WishCustomCategory,
  type WishScale,
} from "@/lib/v2/personal/wish-cats";

export class PersonalWishesValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersonalWishesValidationError";
  }
}

export type PersonalWishImage = {
  id: string;
  wish_id: string;
  url: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type PersonalWish = {
  id: string;
  title: string;
  description: string;
  note: string;
  categories: string[];
  scale: WishScale;
  is_near: boolean;
  grid_col: number;
  grid_row: number;
  sort_order: number;
  images: PersonalWishImage[];
  created_at: string;
  updated_at: string;
};

function uid(ctx: V2SessionContext) {
  return ctx.userId;
}

function mapImage(r: Record<string, unknown>): PersonalWishImage {
  return {
    id: String(r.id),
    wish_id: String(r.wish_id),
    url: String(r.url),
    name: String(r.name || ""),
    sort_order: Number(r.sort_order) || 0,
    created_at: String(r.created_at),
  };
}

function mapWish(r: Record<string, unknown>, images: PersonalWishImage[]): PersonalWish {
  return {
    id: String(r.id),
    title: String(r.title || ""),
    description: String(r.description || ""),
    note: String(r.note || ""),
    categories: normalizeWishCategories(r.categories),
    scale: normalizeWishScale(r.scale),
    is_near: Boolean(r.is_near),
    grid_col: Number(r.grid_col) || 1,
    grid_row: Number(r.grid_row) || 6,
    sort_order: Number(r.sort_order) || 0,
    images,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

async function ownWish(userId: string, id: string): Promise<boolean> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_wishes")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function loadPersonalWishes(ctx: V2SessionContext): Promise<PersonalWish[]> {
  const userId = uid(ctx);
  const sb = getV2Supabase();
  const { data: rows, error } = await sb
    .from("v2_personal_wishes")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const list = (rows ?? []) as Record<string, unknown>[];
  if (!list.length) return [];

  const ids = list.map((r) => String(r.id));
  const { data: imgRows, error: imgErr } = await sb
    .from("v2_personal_wish_images")
    .select("*")
    .in("wish_id", ids)
    .order("sort_order");
  if (imgErr) throw imgErr;

  const byWish = new Map<string, PersonalWishImage[]>();
  for (const raw of (imgRows ?? []) as Record<string, unknown>[]) {
    const img = mapImage(raw);
    const arr = byWish.get(img.wish_id) ?? [];
    arr.push(img);
    byWish.set(img.wish_id, arr);
  }

  return list
    .map((r) => mapWish(r, byWish.get(String(r.id)) ?? []))
    .sort(
      (a, b) =>
        wishScaleRank(a.scale) - wishScaleRank(b.scale) ||
        Number(b.is_near) - Number(a.is_near) ||
        a.sort_order - b.sort_order
    );
}

export async function createPersonalWish(
  ctx: V2SessionContext,
  input: {
    title?: string;
    description?: string;
    note?: string;
    categories?: unknown;
    scale?: unknown;
    is_near?: boolean;
    grid_col?: number;
    grid_row?: number;
  }
): Promise<PersonalWish> {
  const title = (input.title ?? "").trim();
  if (!title) throw new PersonalWishesValidationError("Укажите название желания");

  const description = (input.description ?? "").trim();
  const note = (input.note ?? "").trim();
  const categories = normalizeWishCategories(input.categories);
  const scale = normalizeWishScale(input.scale);
  const isNear = Boolean(input.is_near);
  const size = gridSizeForWish(0, Boolean(description));
  const userId = uid(ctx);
  const sb = getV2Supabase();
  const now = nowIso();

  const { data: existing } = await sb
    .from("v2_personal_wishes")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .limit(1);
  const nextSort = existing?.[0] ? Number(existing[0].sort_order) - 1 : 0;

  const row = {
    id: newV2Id(),
    user_id: userId,
    title,
    description,
    note,
    categories,
    scale,
    is_near: isNear,
    grid_col: input.grid_col ?? size.col,
    grid_row: input.grid_row ?? size.row,
    sort_order: nextSort,
    created_at: now,
    updated_at: now,
  };
  const { error } = await sb.from("v2_personal_wishes").insert(row);
  if (error) throw error;

  return mapWish(row, []);
}

export async function updatePersonalWish(
  ctx: V2SessionContext,
  id: string,
  input: {
    title?: string;
    description?: string;
    note?: string;
    categories?: unknown;
    scale?: unknown;
    is_near?: boolean;
    grid_col?: number;
    grid_row?: number;
  }
): Promise<PersonalWish> {
  const userId = uid(ctx);
  if (!(await ownWish(userId, id))) {
    throw new PersonalWishesValidationError("Желание не найдено");
  }

  const sb = getV2Supabase();
  const patch: Record<string, unknown> = { updated_at: nowIso() };
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new PersonalWishesValidationError("Укажите название желания");
    patch.title = title;
  }
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.note !== undefined) patch.note = input.note.trim();
  if (input.categories !== undefined) patch.categories = normalizeWishCategories(input.categories);
  if (input.scale !== undefined) patch.scale = normalizeWishScale(input.scale);
  if (input.is_near !== undefined) patch.is_near = Boolean(input.is_near);
  if (input.grid_col !== undefined) patch.grid_col = Math.min(2, Math.max(1, Math.round(input.grid_col)));
  if (input.grid_row !== undefined) patch.grid_row = Math.min(12, Math.max(3, Math.round(input.grid_row)));

  const { error } = await sb.from("v2_personal_wishes").update(patch).eq("id", id).eq("user_id", userId);
  if (error) throw error;

  const wishes = await loadPersonalWishes(ctx);
  const wish = wishes.find((w) => w.id === id);
  if (!wish) throw new PersonalWishesValidationError("Желание не найдено");
  return wish;
}

export async function deletePersonalWish(ctx: V2SessionContext, id: string): Promise<void> {
  const userId = uid(ctx);
  const sb = getV2Supabase();
  const { error } = await sb.from("v2_personal_wishes").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

async function syncWishGrid(userId: string, wishId: string): Promise<void> {
  const sb = getV2Supabase();
  const { data: wish, error } = await sb
    .from("v2_personal_wishes")
    .select("description")
    .eq("id", wishId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!wish) return;

  const { count, error: cErr } = await sb
    .from("v2_personal_wish_images")
    .select("id", { count: "exact", head: true })
    .eq("wish_id", wishId);
  if (cErr) throw cErr;

  const size = gridSizeForWish(count ?? 0, Boolean(String(wish.description || "").trim()));
  await sb
    .from("v2_personal_wishes")
    .update({ grid_col: size.col, grid_row: size.row, updated_at: nowIso() })
    .eq("id", wishId)
    .eq("user_id", userId);
}

export async function addPersonalWishImages(
  ctx: V2SessionContext,
  wishId: string,
  files: { url: string; name: string }[]
): Promise<PersonalWishImage[]> {
  const userId = uid(ctx);
  if (!(await ownWish(userId, wishId))) {
    throw new PersonalWishesValidationError("Желание не найдено");
  }
  if (!files.length) throw new PersonalWishesValidationError("Нет файлов");

  const sb = getV2Supabase();
  const { count, error: cErr } = await sb
    .from("v2_personal_wish_images")
    .select("id", { count: "exact", head: true })
    .eq("wish_id", wishId);
  if (cErr) throw cErr;

  const existing = count ?? 0;
  if (existing >= MAX_WISH_IMAGES) {
    throw new PersonalWishesValidationError(`Можно добавить не больше ${MAX_WISH_IMAGES} фото`);
  }
  const room = MAX_WISH_IMAGES - existing;
  const toAdd = files.slice(0, room);
  if (!toAdd.length) throw new PersonalWishesValidationError(`Можно добавить не больше ${MAX_WISH_IMAGES} фото`);

  const { data: last } = await sb
    .from("v2_personal_wish_images")
    .select("sort_order")
    .eq("wish_id", wishId)
    .order("sort_order", { ascending: false })
    .limit(1);
  let sort = last?.[0] ? Number(last[0].sort_order) + 1 : 0;
  const now = nowIso();
  const rows = toAdd.map((f) => ({
    id: newV2Id(),
    wish_id: wishId,
    url: f.url,
    name: f.name,
    sort_order: sort++,
    created_at: now,
  }));
  const { error } = await sb.from("v2_personal_wish_images").insert(rows);
  if (error) throw error;

  await syncWishGrid(userId, wishId);
  return rows.map((r) => mapImage(r));
}

export async function deletePersonalWishImage(
  ctx: V2SessionContext,
  wishId: string,
  imageId: string
): Promise<void> {
  const userId = uid(ctx);
  if (!(await ownWish(userId, wishId))) {
    throw new PersonalWishesValidationError("Желание не найдено");
  }
  const sb = getV2Supabase();
  const { error } = await sb
    .from("v2_personal_wish_images")
    .delete()
    .eq("id", imageId)
    .eq("wish_id", wishId);
  if (error) throw error;
  await syncWishGrid(userId, wishId);
}

function mapCustomCat(r: Record<string, unknown>): WishCustomCategory {
  return {
    id: String(r.id),
    name: String(r.name || ""),
    tint: String(r.tint || "#52525B"),
    bg: String(r.bg || "#F4F4F5"),
    sort_order: Number(r.sort_order) || 0,
  };
}

export async function loadPersonalWishCategories(ctx: V2SessionContext): Promise<WishCustomCategory[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_wish_categories")
    .select("*")
    .eq("user_id", uid(ctx))
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(mapCustomCat);
}

export async function loadPersonalWishesBoard(ctx: V2SessionContext): Promise<{
  wishes: PersonalWish[];
  categories: WishCustomCategory[];
}> {
  const [wishes, categories] = await Promise.all([
    loadPersonalWishes(ctx),
    loadPersonalWishCategories(ctx),
  ]);
  return { wishes, categories };
}

export async function createPersonalWishCategory(
  ctx: V2SessionContext,
  nameRaw: string
): Promise<WishCustomCategory> {
  const name = nameRaw.trim().replace(/\s+/g, " ").slice(0, 48);
  if (!name) throw new PersonalWishesValidationError("Укажите название категории");

  const userId = uid(ctx);
  const existing = await loadPersonalWishCategories(ctx);
  const found = existing.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (found) return found;

  const colors = pickCustomCatColors(existing.length);
  const now = nowIso();
  const row = {
    id: newV2Id(),
    user_id: userId,
    name,
    tint: colors.tint,
    bg: colors.bg,
    sort_order: existing.length,
    created_at: now,
    updated_at: now,
  };
  const sb = getV2Supabase();
  const { error } = await sb.from("v2_personal_wish_categories").insert(row);
  if (error) {
    if (String(error.message || "").toLowerCase().includes("unique")) {
      const again = await loadPersonalWishCategories(ctx);
      const hit = again.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (hit) return hit;
    }
    throw error;
  }
  return mapCustomCat(row);
}
