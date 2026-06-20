import type { V2FinancePaymentStatus, V2FinanceServiceType } from "@/lib/v2/finance/types";

export const FINANCE_MONTH_NAMES = [
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

export const FINANCE_SERVICE_META: Record<
  V2FinanceServiceType,
  { label: string; tint: string; bg: string }
> = {
  site: { label: "Сайт", tint: "#2A56EB", bg: "#E6EDFF" },
  presentation: { label: "Презентация", tint: "#7C3AED", bg: "#EFE8FF" },
  small_task: { label: "Мелкая задача", tint: "#0EA5A4", bg: "#DEF6F5" },
  subscription: { label: "Подписка", tint: "#F59E0B", bg: "#FEF3D1" },
};

export const FINANCE_STATUS_META: Record<
  V2FinancePaymentStatus,
  { label: string; tint: string; bg: string; dot: string }
> = {
  paid: { label: "Оплачен", tint: "#15803D", bg: "#E7F6EC", dot: "#22C55E" },
  prepaid: { label: "Частично", tint: "#92400E", bg: "#FEF3D1", dot: "#F59E0B" },
  not_paid: { label: "Не оплачен", tint: "#B42318", bg: "#FEECEC", dot: "#EF4444" },
};

export const FINANCE_CLIENT_TYPE_OPTIONS = [
  "Постоянный",
  "Реферал",
  "Profi.ru",
  "Нетворкинг",
] as const;

export const FINANCE_PAYMENT_METHOD_OPTIONS = [
  { value: "card", label: "Карта" },
  { value: "account", label: "Расчётный счёт" },
] as const;

export const FINANCE_EMPLOYEE_ROLES = [
  { value: "designer", label: "Дизайнер" },
  { value: "pm", label: "ПМ" },
  { value: "copywriter", label: "Копирайтер" },
  { value: "assistant", label: "Ассистент" },
] as const;

const NBSP = "\u202F";

export function formatRub(n: number): string {
  const sign = n < 0 ? "−" : "";
  const s = Math.round(Math.abs(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${sign}${s}${NBSP}₽`;
}

export const FINANCE_AVATAR_TINTS = [
  "#3B6FF7",
  "#7C3AED",
  "#0EA5A4",
  "#F59E0B",
  "#EF4444",
  "#10B981",
  "#FF335F",
  "#0098EA",
];

export function financeAvatarTint(name: string, index = 0): string {
  const code = name.charCodeAt(0) || 0;
  return FINANCE_AVATAR_TINTS[(code + index) % FINANCE_AVATAR_TINTS.length]!;
}

export function financeMonthRange(year: number, month: number) {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

export function isInFinanceMonth(iso: string, year: number, month: number): boolean {
  const d = new Date(iso);
  const { start, end } = financeMonthRange(year, month);
  return d >= start && d <= end;
}

export function adjacentFinanceMonth(year: number, month: number, delta: -1 | 1) {
  if (delta === 1) return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}
