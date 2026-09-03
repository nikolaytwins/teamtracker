import type { LoadStatus } from "@/lib/v2/agency/plan/plan-types";
import type { V2FinanceBusinessLine } from "@/lib/v2/finance/types";

const LOAD_LABELS: Record<LoadStatus, [string, string, string]> = {
  active: ["Активный", "Набираем проекты", "Есть свободные окна — можно брать новые заказы"],
  passive: ["Пассивный", "Берём только интересные", "Плановые часы почти заняты, соглашаемся выборочно"],
  pause: ["Пауза", "Не берём проекты", "Мощность занята, новые заказы не подтверждаем"],
};

export function loadStatusLabels(status: LoadStatus) {
  const [title, headline, detail] = LOAD_LABELS[status];
  return { title, headline, detail };
}

export function computeLoadStatus(
  reliableProfitRub: number,
  passiveMinRub = 170_000,
  pauseMinRub = 245_000
): LoadStatus {
  if (reliableProfitRub >= pauseMinRub) return "pause";
  if (reliableProfitRub >= passiveMinRub) return "passive";
  return "active";
}

export const BUSINESS_LINE_LABEL: Record<V2FinanceBusinessLine, string> = {
  agency: "Агентство",
  impulse: "Импульс",
  qmagic: "Другие проекты",
};

const PROJECT_COLORS = ["#2A56EB", "#E5604D", "#EAB308", "#0891B2", "#8B5CF6", "#0EA5E9", "#F59E0B", "#10B981"];

export function projectColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PROJECT_COLORS[h % PROJECT_COLORS.length]!;
}

export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseYmd(s: string): Date {
  return new Date(`${s}T00:00:00`);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  x.setHours(0, 0, 0, 0);
  return x;
}

const DW = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const ML = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];
const MN = [
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
];

export function fmtShort(d: Date): string {
  return `${d.getDate()} ${MS[d.getMonth()]}`;
}

export function fmtLong(d: Date): string {
  return `${d.getDate()} ${ML[d.getMonth()]}`;
}

export function fmtWeekday(d: Date): string {
  return `${DW[(d.getDay() + 6) % 7]}, ${fmtLong(d)}`;
}

export function monthName(d: Date): string {
  return MN[d.getMonth()]!;
}

/** Parses "2", "2ч", "1.5 ч", "90 мин", "45m" → minutes */
export function parseDurationInput(input: string): number | null {
  const s = input.trim().toLowerCase().replace(",", ".");
  if (!s) return null;
  const minMatch = s.match(/^(\d+(?:\.\d+)?)\s*(мин|m|min)$/);
  if (minMatch) return Math.max(1, Math.round(parseFloat(minMatch[1]!)));
  const hMatch = s.match(/^(\d+(?:\.\d+)?)\s*(ч|h|час|часа|часов)?$/);
  if (hMatch) return Math.max(1, Math.round(parseFloat(hMatch[1]!) * 60));
  return null;
}

export function minutesToPlanHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

export function planHoursToMinutes(hours: number): number {
  return Math.max(1, Math.round(hours * 60));
}

export function formatPlanDuration(minutes: number): string {
  if (minutes % 60 === 0) return `${minutes / 60} ч`;
  if (minutes > 60 && minutes % 30 === 0) {
    const h = minutes / 60;
    return `${Number.isInteger(h) ? h : h.toFixed(1).replace(".0", "")} ч`;
  }
  return `${minutes} мин`;
}

export function displayHoursFromMinutes(minutes: number): string {
  const h = minutes / 60;
  return Number.isInteger(h) ? String(h) : h.toFixed(1).replace(".0", "");
}
