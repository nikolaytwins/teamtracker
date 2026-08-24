export type DiaryTagOption = {
  name: string;
  count: number;
};

export type ResolveDiaryTagsResult = {
  resolved: string[];
  ambiguous: Array<{ hint: string; candidates: string[] }>;
  unmatched: string[];
};

/** Буквы/цифры для сопоставления; эмодzi и пунктуация отбрасываются. */
export function diaryTagMatchKey(raw: string): string {
  return raw
    .trim()
    .replace(/^#/, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function scoreHintAgainstTag(hintKey: string, tagKey: string, count: number): number {
  if (!hintKey || !tagKey) return 0;
  if (hintKey === tagKey) return 100 + count;
  if (tagKey.includes(hintKey) && hintKey.length >= 3) return 70 + hintKey.length + count * 0.01;
  if (hintKey.includes(tagKey) && tagKey.length >= 3) return 60 + tagKey.length + count * 0.01;
  const hintTokens = hintKey.split(" ").filter(Boolean);
  const tagTokens = tagKey.split(" ").filter(Boolean);
  const overlap = hintTokens.filter((t) => tagTokens.includes(t)).length;
  if (overlap > 0) return 40 + overlap * 10 + count * 0.01;
  return 0;
}

/**
 * Сопоставляет подсказки с существующими тегами дневника (в т.ч. с эмодzi в названии).
 * Не создаёт новые теги — только canonical name из каталога или unmatched/ambiguous.
 */
export function resolveDiaryTagNames(
  hints: string[],
  existing: DiaryTagOption[],
  options?: { minScore?: number }
): ResolveDiaryTagsResult {
  const minScore = options?.minScore ?? 55;
  const uniqueHints = [...new Set(hints.map((h) => h.trim()).filter(Boolean))];
  const resolved: string[] = [];
  const ambiguous: ResolveDiaryTagsResult["ambiguous"] = [];
  const unmatched: string[] = [];

  for (const hint of uniqueHints) {
    const hintKey = diaryTagMatchKey(hint);
    if (!hintKey) continue;

    const exact = existing.find((t) => diaryTagMatchKey(t.name) === hintKey);
    if (exact) {
      if (!resolved.includes(exact.name)) resolved.push(exact.name);
      continue;
    }

    const scored = existing
      .map((t) => ({
        name: t.name,
        score: scoreHintAgainstTag(hintKey, diaryTagMatchKey(t.name), t.count),
      }))
      .filter((x) => x.score >= minScore)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      unmatched.push(hint);
      continue;
    }

    const top = scored[0]!;
    const runners = scored.filter((s) => s.score >= top.score * 0.92);
    if (runners.length > 1) {
      ambiguous.push({ hint, candidates: runners.map((r) => r.name) });
      continue;
    }

    if (!resolved.includes(top.name)) resolved.push(top.name);
  }

  return { resolved, ambiguous, unmatched };
}

export function mergeResolvedDiaryTags(
  explicit: string[],
  resolvedFromHints: string[]
): string[] {
  return [...new Set([...explicit, ...resolvedFromHints].filter(Boolean))];
}
