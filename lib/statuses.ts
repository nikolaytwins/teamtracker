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

/** Статусы «ждём согласования клиента» — для таймера простоя и уведомлений. */
export const APPROVAL_WAITING_STATUSES: PmStatusKey[] = [
  "copy_approval",
  "approval_first_screen",
  "design_approval",
  "layout_approval",
];

export const APPROVAL_WAITING_STATUS_SET = new Set<PmStatusKey>(APPROVAL_WAITING_STATUSES);

/** Активная работа (без этапов «ждём согласования клиента») — колонка «В работе» в простом виде */
export const ACTIVE_WORK_STAGE_KEYS: PmStatusKey[] = [
  "copywriting",
  "design_first_screen",
  "design",
  "layout",
];

export const ACTIVE_WORK_STAGE_SET = new Set<PmStatusKey>(ACTIVE_WORK_STAGE_KEYS);

/** Все рабочие этапы: активные + согласования (для детального канбана и сортировок) */
export const WORK_STAGE_KEYS: PmStatusKey[] = [...ACTIVE_WORK_STAGE_KEYS, ...APPROVAL_WAITING_STATUSES];

/** Простой вид: колонки канбана */
export const SIMPLE_VIEW_GROUPS = [
  { key: "not_started" as const, label: "Не начато" },
  { key: "in_progress" as const, label: "В работе" },
  { key: "awaiting_approval" as const, label: "На согласовании" },
  { key: "done" as const, label: "Закончен" },
  { key: "pause" as const, label: "На паузе" },
] as const;

export type SimpleViewGroupKey = (typeof SIMPLE_VIEW_GROUPS)[number]["key"];

/** Сводная колонка простого вида по фактическому статусу карточки */
export function statusToSimpleViewGroup(status: PmStatusKey): SimpleViewGroupKey {
  if (status === "not_started") return "not_started";
  if (status === "done") return "done";
  if (status === "pause") return "pause";
  if (APPROVAL_WAITING_STATUS_SET.has(status)) return "awaiting_approval";
  return "in_progress";
}

/** Статус новой карточки при добавлении в сводную колонку */
export function defaultStatusForSimpleViewGroup(group: SimpleViewGroupKey): PmStatusKey {
  if (group === "not_started") return "not_started";
  if (group === "done") return "done";
  if (group === "pause") return "pause";
  if (group === "awaiting_approval") return "copy_approval";
  return "copywriting";
}

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
