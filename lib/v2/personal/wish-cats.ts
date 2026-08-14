export const WISH_CAT_ORDER = ["freedom", "create", "material", "intimacy", "life"] as const;

export type WishBuiltinCategoryId = (typeof WISH_CAT_ORDER)[number];

/** @deprecated use WishBuiltinCategoryId — categories may also be custom ids */
export type WishCategoryId = WishBuiltinCategoryId | string;

export const WISH_CATS: Record<WishBuiltinCategoryId, { label: string; tint: string; bg: string }> = {
  freedom: { label: "свобода", tint: "#3B6FF7", bg: "#EFF4FF" },
  create: { label: "творчество", tint: "#7C4DEF", bg: "#F3EEFF" },
  material: { label: "материальное", tint: "#B7791F", bg: "#FBF3E2" },
  intimacy: { label: "отношения и сексуальность", tint: "#DB2777", bg: "#FDEDF4" },
  life: { label: "жизнь", tint: "#0E9F6E", bg: "#E8F7F1" },
};

export const MAX_WISH_IMAGES = 10;

const CUSTOM_PALETTE = [
  { tint: "#0E7490", bg: "#E0F2FE" },
  { tint: "#C2410C", bg: "#FFEDD5" },
  { tint: "#4F46E5", bg: "#E0E7FF" },
  { tint: "#BE185D", bg: "#FCE7F3" },
  { tint: "#15803D", bg: "#DCFCE7" },
  { tint: "#B45309", bg: "#FEF3C7" },
];

export type WishCatMeta = { id: string; label: string; tint: string; bg: string; builtin: boolean };

export type WishCustomCategory = {
  id: string;
  name: string;
  tint: string;
  bg: string;
  sort_order: number;
};

export function isBuiltinWishCategory(v: string): v is WishBuiltinCategoryId {
  return (WISH_CAT_ORDER as readonly string[]).includes(v);
}

export function pickCustomCatColors(index: number): { tint: string; bg: string } {
  return CUSTOM_PALETTE[index % CUSTOM_PALETTE.length]!;
}

export function normalizeWishCategories(raw: unknown): string[] {
  if (!Array.isArray(raw)) return ["life"];
  const out: string[] = [];
  for (const item of raw) {
    const k = String(item).trim();
    if (!k || out.includes(k)) continue;
    out.push(k.slice(0, 64));
  }
  return out.length ? out : ["life"];
}

export function resolveWishCat(
  id: string,
  customById: Map<string, WishCustomCategory> | Record<string, WishCustomCategory>
): WishCatMeta {
  if (isBuiltinWishCategory(id)) {
    const c = WISH_CATS[id];
    return { id, label: c.label, tint: c.tint, bg: c.bg, builtin: true };
  }
  const custom =
    customById instanceof Map ? customById.get(id) : customById[id];
  if (custom) {
    return { id, label: custom.name, tint: custom.tint, bg: custom.bg, builtin: false };
  }
  return { id, label: id, tint: "#52525B", bg: "#F4F4F5", builtin: false };
}

export function allWishCatMetas(custom: WishCustomCategory[]): WishCatMeta[] {
  const builtins = WISH_CAT_ORDER.map((id) => resolveWishCat(id, {}));
  const customs = custom.map((c) => ({
    id: c.id,
    label: c.name,
    tint: c.tint,
    bg: c.bg,
    builtin: false,
  }));
  return [...builtins, ...customs];
}

export function gridSizeForWish(imageCount: number, hasDesc: boolean): { col: number; row: number } {
  const imgs = Math.min(MAX_WISH_IMAGES, Math.max(0, imageCount));
  return {
    col: imgs > 2 ? 2 : 1,
    row: hasDesc ? 7 : 6,
  };
}
