/** Пресеты задач для быстрого старта (ключ → хранится в pm_time_entries.task_type). */

export const SALES_TASK = {
  key: "sales",
  label: "Продажи",
  description: "Звонки, переписки, сделки",
} as const;

export const SITE_TASK_PRESETS = [
  { key: "site:copy", label: "Написание текстов" },
  { key: "site:concept_first", label: "Подготовка концепта первого экрана" },
  { key: "site:design_desktop", label: "Дизайн ПК версии" },
  { key: "site:layout_mobile", label: "Вёрстка и мобильная версия" },
  { key: "site:revisions", label: "Внесение правок" },
] as const;

export const PRESENTATION_TASK_PRESETS = [
  { key: "pres:concept_first", label: "Подготовка концепта первого слайда" },
  { key: "pres:design", label: "Дизайн презентации" },
  { key: "pres:revisions", label: "Внесение правок" },
] as const;

/** Категории для месячной сводки (секунды по task_type могут попасть в несколько строк, если префиксы совпали). */
export const ANALYTICS_BUCKETS = [
  { id: "sales", label: "Продажи", match: (k: string) => k === "sales" || k.startsWith("sales:") },
  { id: "site_copy", label: "Сайт: тексты", match: (k: string) => k === "site:copy" },
  {
    id: "site_concept",
    label: "Сайт: концепт первого экрана",
    match: (k: string) => k === "site:concept_first",
  },
  {
    id: "site_design",
    label: "Сайт: дизайн ПК",
    match: (k: string) => k === "site:design_desktop",
  },
  {
    id: "site_layout",
    label: "Сайт: вёрстка и моб.",
    match: (k: string) => k === "site:layout_mobile",
  },
  { id: "site_rev", label: "Сайт: правки", match: (k: string) => k === "site:revisions" },
  { id: "pres_all", label: "Презентация (все этапы)", match: (k: string) => k.startsWith("pres:") },
  {
    id: "unified_design",
    label: "Проект: дизайн / вёрстка / правки",
    match: (k: string) =>
      k === "design_concept" || k === "design" || k === "layout" || k === "revisions",
  },
  { id: "ai", label: "ИИ", match: (k: string) => k === "ai" || k.startsWith("ai:") },
  { id: "sales_unified", label: "Продажи", match: (k: string) => k === "sales" || k.startsWith("sales:") },
  { id: "custom", label: "Своя задача", match: (k: string) => k.startsWith("custom:") },
] as const;

const LABEL_MAP: Record<string, string> = {
  [SALES_TASK.key]: SALES_TASK.label,
  ...Object.fromEntries(SITE_TASK_PRESETS.map((x) => [x.key, x.label])),
  ...Object.fromEntries(PRESENTATION_TASK_PRESETS.map((x) => [x.key, x.label])),
};

export function labelForWorkPreset(key: string | null | undefined): string {
  if (!key || !String(key).trim()) return "не указано";
  const k = String(key).trim();
  if (k.startsWith("custom:")) return k.slice("custom:".length) || "Своя задача";
  return LABEL_MAP[k] ?? k;
}

export function parseCardProjectType(extra: string | null | undefined): "site" | "presentation" | "other" | null {
  if (!extra) return null;
  try {
    const j = JSON.parse(extra) as { projectType?: string };
    const p = j.projectType;
    if (p === "site" || p === "presentation") return p;
    if (p === "other") return "other";
  } catch {
    /* ignore */
  }
  return null;
}
