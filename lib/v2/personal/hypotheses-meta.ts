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

export type HypothesisBoardTier = "must" | "want" | "queue" | "backlog";

export type HypothesisSeed = {
  project: string;
  sprint?: string;
  stage: HypothesisStage;
  title: string;
  /** Старые названия для матча при синхронизации доски. */
  aliases?: string[];
  body: string;
  metric: string;
  tier: HypothesisBoardTier;
  verdict?: HypothesisVerdict;
  result_text?: string;
};

export const DESIGN_HYPOTHESES: HypothesisSeed[] = [
  {
    project: "tw",
    stage: "active",
    sprint: "s1",
    tier: "must",
    title: "Холодные сайты",
    aliases: ["Холодные предложения сайтов"],
    body: "Попробовать запустить холодную рассылку по компаниям, у которых нет сайта или он плохой. Полностью автоматизированно, через вайбкодинг.",
    metric: "",
  },
  {
    project: "tw",
    stage: "active",
    sprint: "s1",
    tier: "must",
    title: "ИИ субподряд",
    aliases: ["AI-субподряд для студий", "ИИ-субподряд", "AI субподряд"],
    body: "Студиям выгодно отдавать часть AI/дизайн-производства на субподряд TwinLabs.",
    metric: "",
  },
  {
    project: "tw",
    stage: "active",
    sprint: "s1",
    tier: "must",
    title: "Продажа ИИ-курсов",
    aliases: ["Продажа AI-курсов", "ИИ курсы", "AI courses"],
    body: "Научиться самостоятельно создавать сайты, рабочие сервисы и ИИ-сотрудников для бизнеса — и продавать это как курс / внедрение.",
    metric: "Первые продажи тарифа 49 990 ₽ или 149 000 ₽",
  },
  {
    project: "ft",
    stage: "active",
    sprint: "s1",
    tier: "must",
    title: "Ростовские колбасы",
    aliases: [
      "Колбаса через контент",
      "Запуск Ростовских колбас через контент",
      "Ростовские колбасы через контент",
    ],
    body: "Если проверить рилсы, UGC и партнерскую программу, то хотя бы один канал даст первый доход.",
    metric: "Первый доход или ≥ 1 партнёр",
  },
  {
    project: "tw",
    stage: "active",
    sprint: "s1",
    tier: "must",
    title: "Коперник",
    aliases: ["ИИ-астролог", "ИИ астролог", "Коперник астрология"],
    body: "Астрологический сервис с ИИ-расшифровками: контент-ферма, рилсы, YouTube-прогнозы и инструмент, который астрологи заводят клиентам.",
    metric: "",
  },
  {
    project: "tw",
    stage: "active",
    sprint: "s1",
    tier: "want",
    title: "Личные кабинеты онлайн-школ",
    body: "Онлайн-школам нужен личный кабинет / обучение как продукт, который можно быстро собрать и продать.",
    metric: "",
  },
  {
    project: "qm",
    stage: "active",
    sprint: "s1",
    tier: "want",
    title: "Qmagic",
    aliases: ["Qmagic — проверить одну продуктовую гипотезу", "Мини-запуск Qmagic"],
    body: "Пользователям нужен инструмент, который позволяет быстро создавать или редактировать дизайн через ИИ, в том числе внутри Figma.\n\nОбязательно: в агенте должен быть доступ совместной работы команды — чтобы маркетологи, продуктологи и другие роли генерировали в едином стиле.",
    metric: "",
  },
  {
    project: "tw",
    stage: "queue",
    tier: "queue",
    title: "Рилс + карусели",
    aliases: ["Услуги продвижения через рилсы"],
    body: "",
    metric: "",
  },
  {
    project: "tw",
    stage: "queue",
    tier: "queue",
    title: "Тендеры",
    body: "",
    metric: "",
  },
  {
    project: "tw",
    stage: "queue",
    tier: "queue",
    title: "Холодные ИИ-КП блогерам",
    aliases: ["ИИ-сервисы для блогеров"],
    body: "Зайти с КП для блогеров по разработке сервисов (например, ИИ-астролог), либо с кабинетом обучения.",
    metric: "",
  },
  {
    project: "tw",
    stage: "queue",
    tier: "queue",
    title: "Аудит сайта через рилс",
    body: "Рилс: «Проверьте, насколько ваш сайт понятен и продающий». Кто напишет кодовое слово — получает ссылку на сервис.\n\nСервис прогоняет сайт через исследование ЦА и Jobs to Be Done и выдаёт, что исправить и что изменить.\n\nВ конце — предложение исправить: оставить контактные данные, и мы сделаем коммерческое предложение по этим правкам.",
    metric: "Заявка с контактами после аудита",
  },
  {
    project: "br",
    stage: "backlog",
    tier: "backlog",
    title: "Клипс",
    aliases: ["Clips", "Клипс сериалы", "Клипс драмы"],
    body: "Платформа коротких драм / сериалов с рилс-лентой, spicy-подпиской и инструментами для креаторов.",
    metric: "",
  },
  {
    project: "tw",
    stage: "backlog",
    tier: "backlog",
    title: "ИИ-репетитор",
    aliases: ["ИИ репетитор", "ЕГЭ репетитор", "ЕГЭ РЕПЕТИТОР"],
    body: "ИИ-репетитор для ЕГЭ: статьи, личные зумы, персональная программа и решатор домашек. Рост через UGC школьников.",
    metric: "",
  },
  {
    project: "tw",
    stage: "backlog",
    tier: "backlog",
    title: "Курс по ИИ креатору",
    aliases: ["Импульс", "Импульс школа креаторов", "Импульс · школа креаторов", "Школа креаторов"],
    body: "«Импульс» — академия ИИ, а NEXUS — её флагманская программа: учим человека самостоятельно создавать и запускать проекты с помощью ИИ, а не зависеть от чужих навыков.\n\nПодробнее — в статье.",
    metric: "",
  },
  {
    project: "br",
    stage: "active",
    sprint: "s2",
    tier: "must",
    title: "Медийка тест Instagram",
    aliases: [
      "медийка тест инстаграм",
      "Медийка тест инстаграм",
      "Медийка · тест Instagram",
      "Тест Instagram",
      "Медийка Instagram",
    ],
    body: "Проверить гипотезу медийки через тест в Instagram: контент, отклик аудитории и первый сигнал спроса.",
    metric: PRIMARY_HYPOTHESIS_TAG,
  },
];

export function hypothesisCatalogNames(seed: HypothesisSeed): string[] {
  return [seed.title, ...(seed.aliases ?? [])];
}

function catalogNameMatch(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function findHypothesisCatalogSeed(title: string): HypothesisSeed | null {
  const value = title.trim();
  return (
    DESIGN_HYPOTHESES.find((seed) =>
      hypothesisCatalogNames(seed).some((name) => catalogNameMatch(name, value))
    ) ?? null
  );
}

export function hypothesisCatalogOrder(title: string): number {
  const seed = findHypothesisCatalogSeed(title);
  if (!seed) return 10_000;
  return DESIGN_HYPOTHESES.findIndex((item) => item.title === seed.title);
}

export type NearestPlanWave = "now" | "next";

export type NearestPlanItem = {
  n: number;
  title: string;
  wave: NearestPlanWave;
};

/** Ближайший план задач под блоком «В работе» на странице гипотез. */
export const NEAREST_TASK_PLAN: NearestPlanItem[] = [
  { n: 1, title: "Холодные сайты", wave: "now" },
  { n: 2, title: "ИИ субподряд", wave: "now" },
  { n: 3, title: "Продажа ИИ-курсов", wave: "now" },
  { n: 4, title: "Ростовские колбасы", wave: "next" },
  { n: 5, title: "Коперник", wave: "next" },
];

export type ProspectiveDirection = {
  n: number;
  title: string;
  hint: string;
  /** Titles/aliases to deep-link into an existing hypothesis card when present. */
  match: string[];
};

/** Перспективные направления и очередность их теста — от самого сильного к менее. */
export const PROSPECTIVE_TEST_ORDER: ProspectiveDirection[] = [
  {
    n: 1,
    title: "Клипс",
    hint: "Короткие драмы, рилс-лента и креаторы",
    match: ["Клипс", "Clips", "Клипс сериалы", "Клипс драмы"],
  },
  {
    n: 2,
    title: "Импульс · школа креаторов",
    hint: "Первый тест — аудитория и спрос на обучение",
    match: ["Курс по ИИ креатору", "Импульс", "Импульс школа креаторов", "Школа креаторов"],
  },
  {
    n: 3,
    title: "ИИ-астролог",
    hint: "Сервис с повторяемым спросом и простой упаковкой",
    match: ["Коперник", "ИИ астролог", "ИИ-астролог", "Холодные ИИ-КП блогерам", "ИИ-сервисы для блогеров"],
  },
  {
    n: 4,
    title: "ИИ-репетитор",
    hint: "ЕГЭ, UGC школьников и решатор домашек",
    match: ["ИИ репетитор", "ИИ-репетитор", "ЕГЭ репетитор", "ЕГЭ РЕПЕТИТОР"],
  },
  {
    n: 5,
    title: "Qmagic",
    hint: "Платформа — после коротких коммерческих тестов",
    match: ["Qmagic", "Qmagic — проверить одну продуктовую гипотезу", "Мини-запуск Qmagic"],
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
  const sprint_id = stage === "active" || stage === "done" ? targetSprint : null;
  return { ok: true, item: { ...current, stage, sprint_id } };
}
