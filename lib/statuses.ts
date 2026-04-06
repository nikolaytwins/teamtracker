export const PM_STATUSES = [
  { key: "not_started", label: "не начато" },
  { key: "copywriting", label: "написание текстов" },
  { key: "copy_approval", label: "согласование текстов" },
  { key: "design_first_screen", label: "дизайн первого экрана/слайда" },
  { key: "approval_first_screen", label: "согласование первого экрана/слайда" },
  { key: "design", label: "дизайн" },
  { key: "design_approval", label: "согласование дизайна" },
  { key: "layout", label: "верстка" },
  { key: "layout_approval", label: "согласование верстки" },
  { key: "done", label: "готов" },
  { key: "pause", label: "пауза" },
] as const;

export type PmStatusKey = (typeof PM_STATUSES)[number]["key"];

export const DEFAULT_STATUS: PmStatusKey = "not_started";

/** Ключи «рабочих» этапов (в работе) для простого вида */
export const WORK_STAGE_KEYS: PmStatusKey[] = [
  "copywriting",
  "copy_approval",
  "design_first_screen",
  "approval_first_screen",
  "design",
  "design_approval",
  "layout",
  "layout_approval",
];

/** Простой вид: 4 группы */
export const SIMPLE_VIEW_GROUPS = [
  { key: "not_started" as const, label: "Не начато" },
  { key: "in_progress" as const, label: "В работе" },
  { key: "done" as const, label: "Закончен" },
  { key: "pause" as const, label: "На паузе" },
] as const;

export function isValidStatus(s: string): s is PmStatusKey {
  return PM_STATUSES.some(({ key }) => key === s);
}

export function statusLabel(key: PmStatusKey): string {
  return PM_STATUSES.find((s) => s.key === key)?.label ?? key;
}

/** Важность проекта — для тегов на карточках */
export const IMPORTANCE_OPTIONS = [
  { key: "high", label: "важно", className: "bg-red-500/90 text-white" },
  { key: "medium", label: "средне", className: "bg-sky-400/80 text-white" },
  { key: "low", label: "не важно", className: "bg-slate-300/70 text-slate-600" },
] as const;

export type ImportanceKey = (typeof IMPORTANCE_OPTIONS)[number]["key"];

/** Этапы, для которых настраиваются дедлайны и оценки (без не начато / готов / пауза) */
export const STAGES_FOR_ESTIMATES: PmStatusKey[] = [
  "copywriting",
  "copy_approval",
  "design_first_screen",
  "approval_first_screen",
  "design",
  "design_approval",
  "layout",
  "layout_approval",
];
