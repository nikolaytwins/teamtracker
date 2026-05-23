export function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}с`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h && m) return `${h}ч ${m}м`;
  if (h) return `${h}ч`;
  return `${m}м`;
}

export function fmtTimer(seconds: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
}

export function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function todayDatetimeLocal(hours = 18, minutes = 0): string {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const RU_DAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const RU_DAYS_CAP = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
const RU_MONTHS = [
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
const RU_WEEKDAYS_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function daysBetween(a: Date, b: Date): number {
  const ms = startOfLocalDay(a).getTime() - startOfLocalDay(b).getTime();
  return Math.round(ms / 86400000);
}

export function formatDateLabel(now = new Date()): string {
  return `${RU_DAYS_CAP[now.getDay()]}, ${now.getDate()} ${RU_MONTHS[now.getMonth()]}`;
}

export function formatBucketSubtitle(bucket: string, now = new Date()): string | undefined {
  if (bucket === "today") return RU_DAYS[now.getDay()];
  if (bucket === "tomorrow") {
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    return RU_DAYS[t.getDay()];
  }
  if (bucket === "this_week") return "до воскресенья";
  if (bucket === "done_today") return "хорошее утро";
  if (bucket === "overdue") return "нужно перенести или закрыть";
  return undefined;
}

export function formatDueLabel(
  deadlineAt: string | null,
  bucket: string,
  now = new Date(),
  completedAt?: string | null
): string {
  if (bucket === "done_today" && completedAt) {
    const c = new Date(completedAt);
    if (!Number.isNaN(c.getTime())) {
      return c.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    }
  }

  if (!deadlineAt) {
    if (bucket === "later") return "без срока";
    return "без срока";
  }
  const d = new Date(deadlineAt);
  if (Number.isNaN(d.getTime())) return "без срока";

  const diff = daysBetween(d, now);
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;

  if (bucket === "overdue") {
    if (diff === -1) return "вчера";
    if (diff < -1) return `${Math.abs(diff)} дня назад`;
    return "просрочено";
  }
  if (bucket === "today") {
    if (hasTime) return `сегодня · ${time}`;
    return "сегодня · до конца дня";
  }
  if (bucket === "tomorrow") {
    if (hasTime) return `завтра · ${time}`;
    return "завтра";
  }
  if (bucket === "this_week") {
    return `${RU_WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${RU_MONTHS[d.getMonth()]}`;
  }
  return `${d.getDate()} ${RU_MONTHS[d.getMonth()]}`;
}

export function greetingForHour(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

export function userInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
