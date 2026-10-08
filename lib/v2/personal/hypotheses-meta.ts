export const HYPOTHESIS_PRIORITIES = ["high", "medium", "low"] as const;
export type HypothesisPriority = (typeof HYPOTHESIS_PRIORITIES)[number];

export const HYPOTHESIS_STATUSES = ["testing", "confirmed", "rejected", "paused"] as const;
export type HypothesisStatus = (typeof HYPOTHESIS_STATUSES)[number];

export const HYPOTHESIS_OUTCOMES = ["worked", "missed", "mixed", "note"] as const;
export type HypothesisOutcome = (typeof HYPOTHESIS_OUTCOMES)[number];

export type HypothesisNote = {
  id: string;
  hypothesis_id: string;
  body: string;
  outcome: HypothesisOutcome;
  happened_on: string;
  created_at: string;
  updated_at: string;
};

export type Hypothesis = {
  id: string;
  direction: string;
  title: string;
  check_text: string;
  success_text: string;
  priority: HypothesisPriority;
  status: HypothesisStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type HypothesisWithNotes = Hypothesis & {
  notes: HypothesisNote[];
};

export const HYPOTHESIS_STATUS_META: Record<
  HypothesisStatus,
  { label: string; dot: string; soft: string; ink: string }
> = {
  testing: { label: "Проверяем", dot: "#3B6FF7", soft: "#E6EDFF", ink: "#1F3AAF" },
  confirmed: { label: "Подтвердилась", dot: "#059669", soft: "#ECFDF3", ink: "#047857" },
  rejected: { label: "Не подтвердилась", dot: "#E11D48", soft: "#FFF1F2", ink: "#BE123C" },
  paused: { label: "Пауза", dot: "#A1A1AA", soft: "#F4F4F5", ink: "#52525B" },
};

export const HYPOTHESIS_OUTCOME_META: Record<
  HypothesisOutcome,
  { label: string; soft: string; ink: string }
> = {
  worked: { label: "Зашло", soft: "#ECFDF3", ink: "#047857" },
  missed: { label: "Не зашло", soft: "#FFF1F2", ink: "#BE123C" },
  mixed: { label: "Смешанно", soft: "#FEF3D1", ink: "#915E0B" },
  note: { label: "Заметка", soft: "#F4F4F5", ink: "#52525B" },
};

export type HypothesisSeed = {
  direction: string;
  title: string;
  check_text: string;
  success_text: string;
  priority: HypothesisPriority;
};

/** Первые гипотезы сезона. Стартуют в высоком приоритете, порядок — как в исходном списке. */
export const HYPOTHESIS_SEEDS: HypothesisSeed[] = [
  {
    direction: "TwinLabs / AI-разработка",
    title:
      "Компании готовы покупать у тебя AI-native внутренние продукты / кабинеты / платформы / автоматизацию за высокий чек, потому что ты делаешь быстрее классической разработки и без AI-slop",
    check_text:
      "Выбрать 1 оффер, сделать 20–30 точечных касаний, провести созвоны, отправить коммерческие предложения",
    success_text: "Минимум 3–5 предметных диалогов, 2 КП, 1 оплаченный проект от ~150–200к",
    priority: "high",
  },
  {
    direction: "TwinLabs Plus / подписка",
    title:
      "Бизнесы с постоянным потоком запусков готовы платить тебе 80–150к/мес за AI-native дизайн/продакт-поддержку",
    check_text: "",
    success_text: "2–3 серьёзных интереса, хотя бы 1 оплаченный ретейнер",
    priority: "high",
  },
  {
    direction: "Qmagic",
    title:
      "Дизайнеры/создатели реально хотят не «ещё один AI», а инструмент, который ускоряет создание дизайна в едином дизайн-коде",
    check_text: "Не строить всё. Сделать один killer use case и дать 10–15 людям",
    success_text:
      "5+ реально попробовали, 3+ вернулись второй раз, хотя бы 1 готов платить / просит доступ / хочет использовать в работе",
    priority: "high",
  },
  {
    direction: "Курс / ИИ-Креатор",
    title:
      "Люди готовы платить не за «курс по нейронкам», а за переход executor → creator, где они реально начинают делать рыночные проекты быстрее с AI",
    check_text: "Продавать одну понятную программу, без новых факультетов. Проверить оффер через контент + прямую продажу",
    success_text: "5+ оплат или сильный предзапрос, понятная конверсия из аудитории в деньги",
    priority: "high",
  },
  {
    direction: "Медийка / YouTube",
    title: "Тема «строю AI-native бизнес / продукты в реальном времени» интереснее рынку, чем просто «обучаю AI-дизайну»",
    check_text:
      "1–2 больших ролика + короткий контент вокруг реальных экспериментов: Qmagic, TwinLabs, деньги, AI вместо команды",
    success_text:
      "Не только просмотры. Релевантные подписчики, входящие заявки, люди спрашивают про продукты/курс, возвращаемость аудитории",
    priority: "high",
  },
  {
    direction: "Найм part-time",
    title:
      "Можно найти роль на 150–180к+, где от тебя покупают высокий уровень мышления/дизайна/AI, а не 40 часов ручного исполнения",
    check_text: "20 целевых компаний/вакансий, только роли с автономией и результатом вместо присутствия",
    success_text: "3+ интервью, 1–2 финальных процесса, оффер или чёткое подтверждение рынка",
    priority: "high",
  },
  {
    direction: "Отказ от бирж",
    title: "Без бирж ты начнёшь строить более дорогой и устойчивый канал продаж вместо возврата к старой модели",
    check_text: "Полный запрет на отклики + замена их на прямые продажи, партнёрства, контент, рекомендации",
    success_text: "Не «я выжил без бирж», а новый канал дал лиды / созвоны / деньги",
    priority: "high",
  },
];

export function isHypothesisPriority(value: string): value is HypothesisPriority {
  return (HYPOTHESIS_PRIORITIES as readonly string[]).includes(value);
}

export function isHypothesisStatus(value: string): value is HypothesisStatus {
  return (HYPOTHESIS_STATUSES as readonly string[]).includes(value);
}

export function isHypothesisOutcome(value: string): value is HypothesisOutcome {
  return (HYPOTHESIS_OUTCOMES as readonly string[]).includes(value);
}

export function priorityLaneId(priority: HypothesisPriority): string {
  return `prio:${priority}`;
}

export function parseQuickHypothesis(raw: string): { direction: string; title: string } | null {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text) return null;
  const match = text.match(/^(.{1,80}?)\s+(?:—|–|\|)\s+(.+)$/);
  if (match) {
    const direction = match[1].trim();
    const title = match[2].trim();
    if (direction && title) {
      return { direction: direction.slice(0, 160), title: title.slice(0, 500) };
    }
  }
  return { direction: "", title: text.slice(0, 500) };
}

type Ordered = { id: string; priority: HypothesisPriority; sort_order: number };

function byOrder(a: Ordered, b: Ordered) {
  return a.sort_order - b.sort_order || a.id.localeCompare(b.id);
}

function arrayMove<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  if (!item) return list;
  next.splice(to, 0, item);
  return next;
}

function visualKey(items: Ordered[]): string {
  return HYPOTHESIS_PRIORITIES.map((priority) =>
    items
      .filter((item) => item.priority === priority)
      .sort(byOrder)
      .map((item) => item.id)
      .join(","),
  ).join("|");
}

/** Перенос карточки внутри приоритета или в другую группу. null — порядок не изменился. */
export function applyHypothesisMove<T extends Ordered>(items: T[], activeId: string, overId: string): T[] | null {
  if (!overId || overId === activeId) return null;
  const active = items.find((item) => item.id === activeId);
  if (!active) return null;

  const groups: Record<HypothesisPriority, T[]> = { high: [], medium: [], low: [] };
  for (const item of items) groups[item.priority].push(item);
  for (const priority of HYPOTHESIS_PRIORITIES) groups[priority].sort(byOrder);

  if (overId.startsWith("prio:")) {
    const priority = overId.slice(5);
    if (!isHypothesisPriority(priority)) return null;
    const from = groups[active.priority];
    const index = from.findIndex((item) => item.id === activeId);
    if (index < 0) return null;
    const [moved] = from.splice(index, 1);
    if (!moved) return null;
    groups[priority].push({ ...moved, priority });
  } else {
    const over = items.find((item) => item.id === overId);
    if (!over) return null;
    if (over.priority === active.priority) {
      const group = groups[active.priority];
      const oldIndex = group.findIndex((item) => item.id === activeId);
      const newIndex = group.findIndex((item) => item.id === overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return null;
      groups[active.priority] = arrayMove(group, oldIndex, newIndex);
    } else {
      const from = groups[active.priority];
      const index = from.findIndex((item) => item.id === activeId);
      if (index < 0) return null;
      const [moved] = from.splice(index, 1);
      if (!moved) return null;
      const target = groups[over.priority];
      const at = target.findIndex((item) => item.id === overId);
      target.splice(at < 0 ? target.length : at, 0, { ...moved, priority: over.priority });
    }
  }

  const next = HYPOTHESIS_PRIORITIES.flatMap((priority) =>
    groups[priority].map((item, sort_order) =>
      item.priority === priority && item.sort_order === sort_order ? item : { ...item, priority, sort_order },
    ),
  );
  if (visualKey(items) === visualKey(next)) return null;
  return next;
}
