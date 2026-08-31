/** Стабильный порядок карточек счетов/капитала: sort_order, затем id. */
export function compareFinanceCardOrder(
  a: { sort_order: number; id: string },
  b: { sort_order: number; id: string }
): number {
  const bySort = (a.sort_order || 0) - (b.sort_order || 0);
  if (bySort !== 0) return bySort;
  return a.id.localeCompare(b.id);
}

export function sortFinanceCards<T extends { sort_order: number; id: string }>(rows: T[]): T[] {
  return [...rows].sort(compareFinanceCardOrder);
}
