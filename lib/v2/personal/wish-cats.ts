export const WISH_CAT_ORDER = ["freedom", "create", "material", "intimacy", "life"] as const;

export type WishCategoryId = (typeof WISH_CAT_ORDER)[number];

export const WISH_CATS: Record<WishCategoryId, { label: string; tint: string; bg: string }> = {
  freedom: { label: "свобода", tint: "#3B6FF7", bg: "#EFF4FF" },
  create: { label: "творчество", tint: "#7C4DEF", bg: "#F3EEFF" },
  material: { label: "материальное", tint: "#B7791F", bg: "#FBF3E2" },
  intimacy: { label: "отношения и сексуальность", tint: "#DB2777", bg: "#FDEDF4" },
  life: { label: "жизнь", tint: "#0E9F6E", bg: "#E8F7F1" },
};

export function isWishCategoryId(v: string): v is WishCategoryId {
  return (WISH_CAT_ORDER as readonly string[]).includes(v);
}

export function normalizeWishCategories(raw: unknown): WishCategoryId[] {
  if (!Array.isArray(raw)) return ["life"];
  const out: WishCategoryId[] = [];
  for (const item of raw) {
    const k = String(item);
    if (isWishCategoryId(k) && !out.includes(k)) out.push(k);
  }
  return out.length ? out : ["life"];
}

export function gridSizeForWish(imageCount: number, hasDesc: boolean): { col: number; row: number } {
  const imgs = Math.min(3, Math.max(0, imageCount));
  return {
    col: imgs > 2 ? 2 : 1,
    row: hasDesc ? 7 : 6,
  };
}
