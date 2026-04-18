/** Только чистые утилиты — без SQLite; безопасно импортировать из `"use client"`. */

export function parseExecutionDatesFromJson(raw: string | null | undefined): string[] {
  if (raw == null || !String(raw).trim()) return [];
  try {
    const a = JSON.parse(String(raw)) as unknown;
    if (!Array.isArray(a)) return [];
    return a
      .filter((x): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}/.test(x.trim()))
      .map((x) => x.trim().slice(0, 10));
  } catch {
    return [];
  }
}

export function serializeExecutionDates(dates: string[]): string | null {
  const norm = [...new Set(dates.map((d) => d.trim().slice(0, 10)).filter(Boolean))].sort();
  if (norm.length === 0) return null;
  return JSON.stringify(norm);
}
