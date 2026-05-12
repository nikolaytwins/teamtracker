/** Сдвиг календарного месяца `YYYY-MM` на `deltaMonths` (может быть отрицательным). */
export function shiftMonthYm(ym: string, deltaMonths: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1 + deltaMonths;
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
