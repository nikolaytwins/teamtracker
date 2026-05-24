/** Форматирует целое число рублей с пробелами: 100000 → "100 000". */
export function formatRubWithSpaces(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Парсит ввод с пробелами в число рублей. */
export function parseRubInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

/** Нормализует строку ввода: только цифры и пробелы-разделители тысяч. */
export function normalizeRubInput(raw: string): string {
  const n = parseRubInput(raw);
  if (n == null) return "";
  return formatRubWithSpaces(n);
}
