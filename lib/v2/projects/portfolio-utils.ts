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

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#608DFA,#2A56EB)",
  "linear-gradient(135deg,#818CF8,#4F46E5)",
  "linear-gradient(135deg,#A78BFA,#7C3AED)",
  "linear-gradient(135deg,#F472B6,#DB2777)",
  "linear-gradient(135deg,#FB923C,#EA580C)",
  "linear-gradient(135deg,#F87171,#DC2626)",
  "linear-gradient(135deg,#FCA5A5,#E11D48)",
  "linear-gradient(135deg,#2DD4BF,#0D9488)",
  "linear-gradient(135deg,#FACC15,#CA8A04)",
  "linear-gradient(135deg,#34D399,#059669)",
  "linear-gradient(135deg,#94A3B8,#475569)",
  "linear-gradient(135deg,#67E8F9,#0891B2)",
];

export function pluralRu(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}

export function fmtRubShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 2 : 0).replace(/\.0+$/, "")}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}к`;
  return `${Math.round(n)}`;
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function gradientForUser(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h + userId.charCodeAt(i)) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[h]!;
}

export function formatDeadlineLabel(deadlineAt: string | null, now = new Date()): { label: string; days: number | null } {
  if (!deadlineAt) return { label: "не задан", days: null };
  const d = new Date(deadlineAt);
  if (Number.isNaN(d.getTime())) return { label: "не задан", days: null };

  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((target.getTime() - dayStart.getTime()) / 86400000);

  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  let label: string;
  if (diff === 0) label = hasTime ? `сегодня · ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}` : "сегодня";
  else if (diff === 1) label = "завтра";
  else if (diff > 1 && diff <= 14) label = `${d.getDate()} ${RU_MONTHS[d.getMonth()]}`;
  else if (diff < 0 && diff >= -14) label = `${d.getDate()} ${RU_MONTHS[d.getMonth()]}`;
  else label = `${d.getDate()} ${RU_MONTHS[d.getMonth()]}`;

  return { label, days: diff };
}

export function deadlineCopy(days: number | null, status: string): string {
  if (status === "done") return "сдан";
  if (days === null) return "—";
  if (days < 0) return `${-days} ${pluralRu(-days, ["день", "дня", "дней"])} назад`;
  if (days === 0) return "сегодня";
  return `через ${days} ${pluralRu(days, ["день", "дня", "дней"])}`;
}

export function formatRelativeActivity(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? "час назад" : `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "вчера";
  if (days < 7) return `${days} ${pluralRu(days, ["день", "дня", "дней"])}`;
  if (days < 14) return "на неделе";
  if (days < 30) return `${Math.floor(days / 7)} ${pluralRu(Math.floor(days / 7), ["неделю", "недели", "недель"])}`;
  return `${Math.floor(days / 30)} ${pluralRu(Math.floor(days / 30), ["месяц", "месяца", "месяцев"])}`;
}

export const DEFAULT_HOURLY_RATE = 3500;

const MONTHS_PREP = [
  "январе",
  "феврале",
  "марте",
  "апреле",
  "мае",
  "июне",
  "июле",
  "августе",
  "сентябре",
  "октябре",
  "ноябре",
  "декабре",
];

export function currentMonthLabelPrep(now = new Date()): string {
  return MONTHS_PREP[now.getMonth()]!;
}
