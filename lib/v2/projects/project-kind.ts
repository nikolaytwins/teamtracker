import type { V2ProjectEngagementType, V2ProjectKind } from "@/lib/v2/types";

export type { V2ProjectKind };

export const PROJECT_KIND_OPTIONS: { value: V2ProjectKind; label: string; hint: string }[] = [
  { value: "site", label: "Сайт", hint: "Лендинг, многостраничник, продуктовый сайт" },
  { value: "presentation", label: "Презентация", hint: "Pitch deck, отчёт, слайды" },
  { value: "small_task", label: "Мелкая задача", hint: "Баннер, правки, небольшой объём" },
];

export const PROJECT_KIND_LABELS: Record<V2ProjectKind, string> = {
  site: "Сайт",
  presentation: "Презентация",
  small_task: "Мелкая задача",
};

const LEGACY_CATEGORY_KEYWORDS: [RegExp, string][] = [
  [/лендинг/i, "Лендинг"],
  [/бренд/i, "Брендинг"],
  [/айдент/i, "Брендинг"],
  [/лого/i, "Брендинг"],
  [/моушн|анимац/i, "Моушн"],
  [/иллюстр/i, "Иллюстрации"],
  [/икон|ui.?кит|дизайн.?систем/i, "UI-кит"],
  [/мобил|mobile/i, "Мобайл"],
  [/кампан/i, "Кампания"],
  [/маркет/i, "Маркетинг"],
  [/студ/i, "Внутреннее"],
  [/onboarding|продукт|кабинет|чек.?аут/i, "Продукт"],
];

function inferLegacyCategory(name: string): string {
  for (const [re, label] of LEGACY_CATEGORY_KEYWORDS) {
    if (re.test(name)) return label;
  }
  return "Проект";
}

export function isV2ProjectKind(v: unknown): v is V2ProjectKind {
  return v === "site" || v === "presentation" || v === "small_task";
}

export function resolveProjectCategoryLabel(project: {
  project_kind: V2ProjectKind | null;
  engagement_type: V2ProjectEngagementType;
  name: string;
}): string {
  if (project.project_kind) return PROJECT_KIND_LABELS[project.project_kind];
  if (project.engagement_type === "retainer") return "Постоянный";
  return inferLegacyCategory(project.name);
}
