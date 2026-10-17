export const WIP_LIMIT = 6;

export const PRIMARY_HYPOTHESIS_TAG = "Главная гипотеза";

export const HYPOTHESIS_STAGES = ["backlog", "queue", "active", "done"] as const;
export type HypothesisStage = (typeof HYPOTHESIS_STAGES)[number];

export const HYPOTHESIS_VERDICTS = ["yes", "no", "unclear"] as const;
export type HypothesisVerdict = (typeof HYPOTHESIS_VERDICTS)[number];

export const STAGE_LABEL: Record<HypothesisStage, string> = {
  backlog: "Бэклог",
  queue: "Очередь",
  active: "В работе",
  done: "Проверено",
};

export const VERDICT_META: Record<HypothesisVerdict, { label: string; ink: string; soft: string }> = {
  yes: { label: "Подтверждена", ink: "#047857", soft: "#e7f6f0" },
  no: { label: "Опровергнута", ink: "#b42318", soft: "#fee4e2" },
  unclear: { label: "Неясно", ink: "#b54708", soft: "#fef0c7" },
};

export type HypothesisProject = {
  id: string;
  name: string;
  hue: number;
  sort_order: number;
};

export type HypothesisSprint = {
  id: string;
  name: string;
  range_label: string;
  is_current: boolean;
  sort_order: number;
};

export type Hypothesis = {
  id: string;
  project_id: string | null;
  sprint_id: string | null;
  title: string;
  body: string;
  metric: string;
  stage: HypothesisStage;
  verdict: HypothesisVerdict | null;
  result_text: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type HypothesisProjectSeed = { key: string; name: string; hue: number };

export const DESIGN_PROJECTS: HypothesisProjectSeed[] = [
  { key: "tw", name: "TwinLabs Plus", hue: 262 },
  { key: "br", name: "Личный бренд", hue: 300 },
  { key: "ft", name: "FoodTech", hue: 150 },
  { key: "pt", name: "Part-time / найм", hue: 60 },
  { key: "qm", name: "Qmagic", hue: 200 },
];

export const DESIGN_SPRINTS: Array<{ key: string; name: string; range_label: string; is_current: boolean }> = [
  { key: "s0", name: "Сезон исследований", range_label: "15 авг — 12 окт", is_current: false },
  { key: "s1", name: "Спринт Ноябрь", range_label: "13 окт — 30 ноя", is_current: true },
  { key: "s2", name: "Декабрь", range_label: "1 — 31 дек", is_current: false },
];

export type HypothesisSeed = {
  project: string;
  sprint?: string;
  stage: HypothesisStage;
  title: string;
  body: string;
  metric: string;
  verdict?: HypothesisVerdict;
  result_text?: string;
};

export const DESIGN_HYPOTHESES: HypothesisSeed[] = [
  {
    project: "ft",
    stage: "active",
    sprint: "s1",
    title: "Запуск Ростовских колбас через контент",
    body: "Если проверить рилсы, UGC и партнерскую программу, то хотя бы один канал даст первый доход.",
    metric: PRIMARY_HYPOTHESIS_TAG,
  },
  {
    project: "tw",
    stage: "active",
    sprint: "s1",
    title: "TwinLabs Plus — запустить продажи дизайн-поддержки",
    body: "Онлайн-школам, продюсерам и экспертам выгодно передать регулярные дизайн-задачи одной внешней команде вместо поиска отдельных исполнителей.",
    metric: "1–2 платных пилота",
  },
  {
    project: "br",
    stage: "active",
    sprint: "s1",
    title: "Запуск контента в соц.сетях",
    body: "",
    metric: "",
  },
  {
    project: "qm",
    stage: "active",
    sprint: "s1",
    title: "Мини-запуск Qmagic",
    body: "",
    metric: "",
  },
  {
    project: "tw",
    stage: "active",
    sprint: "s1",
    title: "Холодные предложения сайтов",
    body: "Попробовать запустить холодную рассылку по компаниям, у которых нет сайта или он плохой. Полностью автоматизированно, через вайбкодинг.",
    metric: "",
  },
  {
    project: "tw",
    stage: "active",
    sprint: "s1",
    title: "ИИ-сервисы для блогеров",
    body: "Зайти с КП для блогеров по разработке сервисов (например, ИИ-астролог), либо с кабинетом обучения.",
    metric: "",
  },
  {
    project: "tw",
    stage: "queue",
    title: "Курс по ИИ креатору",
    body: "",
    metric: "",
  },
];

export const LEGACY_EMPTY_PROJECTS = ["Импульс", "AI-сервисы"];

export function isHypothesisStage(value: string): value is HypothesisStage {
  return (HYPOTHESIS_STAGES as readonly string[]).includes(value);
}

export function isHypothesisVerdict(value: string): value is HypothesisVerdict {
  return (HYPOTHESIS_VERDICTS as readonly string[]).includes(value);
}

export function projectColors(hue: number) {
  return {
    c: `oklch(0.55 0.15 ${hue})`,
    s: `oklch(0.965 0.025 ${hue})`,
  };
}

export function currentSprintId(sprints: HypothesisSprint[]): string | null {
  return (sprints.find((sprint) => sprint.is_current) ?? sprints[0])?.id ?? null;
}

type Staged = { id: string; stage: HypothesisStage; sprint_id: string | null };

export function applyStageChange<T extends Staged>(
  items: T[],
  id: string,
  stage: HypothesisStage,
  sprintId: string | null,
): { ok: true; item: T } | { ok: false; error: string } {
  const current = items.find((item) => item.id === id);
  if (!current) return { ok: false, error: "Гипотеза не найдена" };
  const targetSprint = stage === "done" && current.sprint_id ? current.sprint_id : sprintId;
  const alreadyThere = current.stage === "active" && current.sprint_id === targetSprint;
  if (stage === "active") {
    const taken = items.filter(
      (item) => item.id !== id && item.stage === "active" && item.sprint_id === targetSprint,
    ).length;
    if (!alreadyThere && taken >= WIP_LIMIT) {
      return {
        ok: false,
        error: `В спринте уже ${WIP_LIMIT} гипотезы. Заверши одну или верни в очередь.`,
      };
    }
  }
  const sprint_id = stage === "active" || stage === "done" ? targetSprint : null;
  return { ok: true, item: { ...current, stage, sprint_id } };
}
