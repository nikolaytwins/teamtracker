/** Ширина / высота. */
export type PhotoOrientation = "portrait" | "landscape" | "square";

export type WishPhotoLayoutRow = {
  /** Индексы в исходном массиве images. */
  indices: number[];
};

const PORTRAIT_MAX = 0.92;
const LANDSCAPE_MIN = 1.08;

export function photoOrientation(aspectWoverH: number): PhotoOrientation {
  if (aspectWoverH < PORTRAIT_MAX) return "portrait";
  if (aspectWoverH > LANDSCAPE_MIN) return "landscape";
  return "square";
}

function pairIndices(indices: number[]): WishPhotoLayoutRow[] {
  const rows: WishPhotoLayoutRow[] = [];
  for (let i = 0; i < indices.length; i += 2) {
    rows.push({ indices: indices.slice(i, i + 2) });
  }
  return rows;
}

/**
 * Группирует фото по ориентации: в одном ряду — только портреты или только альбомные.
 * Порядок внутри группы сохраняется; между группами — портреты, затем альбомные, затем квадраты.
 */
export function buildWishPhotoLayout(
  aspects: ReadonlyArray<number | null | undefined>,
  defaultAspect = 4 / 3
): WishPhotoLayoutRow[] {
  const n = aspects.length;
  if (n === 0) return [];
  if (n === 1) return [{ indices: [0] }];

  const buckets: Record<PhotoOrientation, number[]> = {
    portrait: [],
    landscape: [],
    square: [],
  };

  for (let i = 0; i < n; i += 1) {
    const aspect = aspects[i] ?? defaultAspect;
    buckets[photoOrientation(aspect)].push(i);
  }

  return [
    ...pairIndices(buckets.portrait),
    ...pairIndices(buckets.landscape),
    ...pairIndices(buckets.square),
  ];
}
