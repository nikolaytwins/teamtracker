import { VIRTUAL_OTHER_CARD_ID } from "@/lib/pm-constants";
import {
  labelForWorkPreset,
  PRESENTATION_TASK_PRESETS,
  SITE_TASK_PRESETS,
  parseCardProjectType,
} from "@/lib/work-presets";

/** Тип задачи для таймтрекинга (хранится в pm_time_entries.task_type). */
export const TIME_TASK_TYPE_OPTIONS = [
  { key: "design_concept", label: "Дизайн-концепт" },
  { key: "design", label: "Дизайн" },
  { key: "layout", label: "Вёрстка" },
  { key: "revisions", label: "Правки" },
  { key: "sales", label: "Продажи" },
  { key: "site", label: "Сайт" },
  { key: "presentation", label: "Презентация" },
  { key: "copy", label: "Тексты / копирайт" },
  { key: "pm", label: "ПМ / координация" },
  { key: "other", label: "Другое" },
] as const;

/** Селект типа для обычного проекта (не «Другое»). */
export const TIMER_TASK_OPTIONS_PROJECT = [
  { key: "design_concept", label: "Дизайн-концепт" },
  { key: "design", label: "Дизайн" },
  { key: "layout", label: "Вёрстка" },
  { key: "revisions", label: "Правки" },
] as const;

/** Селект для виртуальной карточки «Другое». */
export const TIMER_TASK_OPTIONS_OTHER = [{ key: "sales", label: "Продажи" }] as const;

/** Первый пресет типа задачи для карточки (быстрый старт с канбана / «Мои подзадачи»). */
export function defaultTimerTaskTypeForCard(cardId: string, cardExtra: string | null): string {
  if (cardId === VIRTUAL_OTHER_CARD_ID) return TIMER_TASK_OPTIONS_OTHER[0]?.key ?? "sales";
  const pt = parseCardProjectType(cardExtra);
  if (pt === "presentation") return PRESENTATION_TASK_PRESETS[0]?.key ?? "design_concept";
  if (pt === "site") return SITE_TASK_PRESETS[0]?.key ?? "design_concept";
  if (pt === "other") return TIMER_TASK_OPTIONS_OTHER[0]?.key ?? "sales";
  return TIMER_TASK_OPTIONS_PROJECT[0]?.key ?? "design_concept";
}

export function labelForTaskType(key: string | null | undefined): string {
  if (!key || !String(key).trim()) return "не указан";
  const o = TIME_TASK_TYPE_OPTIONS.find((x) => x.key === key);
  if (o) return o.label;
  return labelForWorkPreset(key);
}
