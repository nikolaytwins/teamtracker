import type { PersonalWish } from "@/lib/v2/personal/personal-wishes-repo";

/** Колонки как в Sophia goals: 3 / 2 / 1 по ширине viewport. */
export function wishMasonryColumnCount(width: number): number {
  if (width >= 960) return 3;
  if (width >= 560) return 2;
  return 1;
}

/** Грубая оценка высоты карточки для балансировки колонок (2-колоночная сетка фото). */
export function estimateWishMasonryHeight(w: PersonalWish): number {
  const n = w.images.length;
  const descExtra = w.description?.trim() ? 44 : 0;
  const header = 130 + descExtra;
  if (n === 0) return header;
  if (n === 1) return header + 200;
  const rows = Math.ceil(n / 2);
  const rowH = n >= 3 ? 148 : 168;
  return header + rows * rowH;
}

/** Pinterest-style: каждая карточка в колонку с наименьшей накопленной высотой. */
export function distributeWishesMasonryColumns(
  wishes: PersonalWish[],
  columnCount: number,
  gap: number
): PersonalWish[][] {
  if (wishes.length === 0) return [];
  const cols: PersonalWish[][] = Array.from({ length: Math.max(1, columnCount) }, () => []);
  const heights = Array(columnCount).fill(0);
  for (const w of wishes) {
    let j = 0;
    for (let i = 1; i < columnCount; i += 1) {
      if (heights[i]! < heights[j]!) j = i;
    }
    cols[j]!.push(w);
    heights[j]! += estimateWishMasonryHeight(w) + gap;
  }
  return cols;
}
