const NBSP = "\u202F";

export function formatPersonalRub(n: number): string {
  const sign = n < 0 ? "−" : "";
  const s = Math.round(Math.abs(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${sign}${s}${NBSP}₽`;
}

export function formatPersonalRubSigned(n: number): string {
  const prefix = n > 0 ? "+" : n < 0 ? "−" : "";
  return prefix + formatPersonalRub(Math.abs(n)).replace("−", "");
}

export function formatPersonalRubShort(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(2).replace(".", ",")}${NBSP}млн${NBSP}₽`;
  if (a >= 1e3) return `${sign}${Math.round(a / 1e3)}${NBSP}тыс${NBSP}₽`;
  return formatPersonalRub(n);
}

export function formatPersonalPct(n: number): string {
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1).replace(".", ",")}\u202F%`;
}

export const PERSONAL_MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
] as const;

export const PERSONAL_MONTH_SHORT = [
  "Янв",
  "Фев",
  "Мар",
  "Апр",
  "Май",
  "Июн",
  "Июл",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек",
] as const;

export function nextPersonalMonthAfter(rows: { year: number; month: number }[]): {
  year: number;
  month: number;
} {
  if (rows.length === 0) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const top = rows[0];
  let m = top.month + 1;
  let y = top.year;
  if (m > 12) {
    m = 1;
    y += 1;
  }
  return { year: y, month: m };
}

export const PERSONAL_BRANDS: Record<
  string,
  { name: string; short: string; tint: string; bg: string; ink?: string }
> = {
  alfa: { name: "Альфа-Банк", short: "А", tint: "#E40521", bg: "#FEEFF0" },
  tinkoff: { name: "Т-Банк", short: "Т", tint: "#FFDD2D", bg: "#FFF7CC", ink: "#7A5C00" },
  ozon: { name: "Ozon", short: "О", tint: "#005BFF", bg: "#E5EEFF" },
  samokat: { name: "Самокат", short: "С", tint: "#FF335F", bg: "#FFE3EA" },
  avito: { name: "Авито", short: "A", tint: "#00A046", bg: "#E2F5E9" },
  vk: { name: "VK", short: "В", tint: "#0077FF", bg: "#E2EDFF" },
  studio: { name: "Личный", short: "·", tint: "#0A0A0B", bg: "#EEEEF1" },
};

export const DEFAULT_BUDGET_CATEGORIES = [
  { name: "Жильё и коммуналка", limit: 55000, tint: "#3B6FF7" },
  { name: "Еда и продукты", limit: 38000, tint: "#10B981" },
  { name: "Транспорт", limit: 12000, tint: "#F59E0B" },
  { name: "Подписки и сервисы", limit: 8000, tint: "#9A8CFF" },
  { name: "Кафе и развлечения", limit: 15000, tint: "#FF335F" },
  { name: "Прочее", limit: 12000, tint: "#A1A1AA" },
] as const;
