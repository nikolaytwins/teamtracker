import { labelForWorkPreset } from "@/lib/work-presets";

/** Тип задачи для таймтрекинга (хранится в pm_time_entries.task_type). */
export const TIME_TASK_TYPE_OPTIONS = [
  { key: "site", label: "Сайт" },
  { key: "presentation", label: "Презентация" },
  { key: "design", label: "Дизайн" },
  { key: "layout", label: "Вёрстка" },
  { key: "copy", label: "Тексты / копирайт" },
  { key: "pm", label: "ПМ / координация" },
  { key: "other", label: "Другое" },
] as const;

export function labelForTaskType(key: string | null | undefined): string {
  if (!key || !String(key).trim()) return "не указан";
  const o = TIME_TASK_TYPE_OPTIONS.find((x) => x.key === key);
  if (o) return o.label;
  return labelForWorkPreset(key);
}
