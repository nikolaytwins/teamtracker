/**
 * Данные главной страницы (Home).
 * Статичный seed — 1:1 перенос макета. БД и API не задействованы.
 */

export type HomeSeason = {
  kicker: string;
  dates: string;
  idea: string;
  review: string;
  progress: number;
  day: string;
};

export type HomeMonth = {
  id: string;
  label: string;
  tag: string;
  state: "сейчас" | "дальше";
  headline: string;
  lead: string;
  warn?: string;
  focus: string[];
};

export type HomeLilaBan = {
  mark: string;
  title: string;
  text: string;
  note: string;
};

export type HomeSprint = { label: string; dates: string };

export type HomeSprintGoal = {
  id: string;
  name: string;
  tint: string;
  bg: string;
  goal: string;
  items: string[];
};

export type HomeBet = {
  id: string;
  mark: string;
  kicker: string;
  name: string;
  tint: string;
  bg: string;
  hyp: string;
  horizon: string;
  href: string;
};

export type HomeTrack = {
  id: string;
  label: string;
  kind: "cash" | "bet";
  hours: number;
  money: number;
  note: string;
  tint: string;
};

export type HomeMoney = {
  capital: number;
  available: number;
  expected: number;
  paid: number;
  forecast: number;
  expenses: number;
  month: string;
};

export type HomeWeekFocus = { id: string; area: string; text: string; state: string };

export type HomeWeekKindId = "agency" | "course" | "qmagic" | "video" | "ritual";

export type HomeWeekKind = { label: string; tint: string; bg: string };

export type HomeWeekItem = { t: string; k: HomeWeekKindId };

export type HomeWeekDay = {
  id: string;
  d: string;
  n: string;
  past?: boolean;
  today?: boolean;
  items: HomeWeekItem[];
};

export type HomeWeek = {
  label: string;
  focusTitle: string;
  focus: HomeWeekFocus[];
  days: HomeWeekDay[];
  kinds: Record<HomeWeekKindId, HomeWeekKind>;
};

export type HomeCheck = { id: string; label: string; note: string; done: boolean };

export type HomeTrainings = { done: number; total: number; label: string };

export type HomeRuleContrast = { ok: string; no: string };

export type HomeVideoStatus = "опубликовано" | "монтаж" | "сценарий" | "идея";

export type HomeVideoItem = {
  n: string;
  t: string;
  st: HomeVideoStatus;
  date: string;
  views: string;
  react: string;
};

export type HomeVideo = {
  goal: number;
  yt: HomeVideoItem[];
  short: HomeVideoItem[];
  question: string;
};

/* -------------------------------- ССЫЛКИ --------------------------------- */

/** Страницы макета (`*.html`) в маршруты приложения. */
export const HOME_LINKS = {
  /** Стратегия.html */
  strategy: "/v2/personal/life-strategy",
  /** Проекты.html */
  projects: "/v2/agency/overview",
  /** Личный бренд.html */
  brand: "/v2/personal/brand",
  /** Финансы.html */
  finance: "/v2/personal/finance",
  /** Проекты и финансы.html */
  agencyFinance: "/v2/agency",
  /** Время и экономика.html */
  time: "/v2/personal/time",
  /** Мои задачи v2.html */
  tasks: "/v2/personal/tasks/inbox",
  /** Наблюдения.html */
  observations: "/v2/personal/observations",
} as const;

/* ------------------------------- СЕЗОН ----------------------------------- */

export const HOME_SEASON: HomeSeason = {
  kicker: "Season of Exploration",
  dates: "15 августа — 30 ноября 2026",
  idea: "Не выбрать путь на всю жизнь. Закрыть старую главу, создать опору и дать реальности показать, где появляется настоящий сигнал.",
  review: "30 ноября",
  progress: 0.14,
  day: "Воскресенье, 16 августа 2026",
};

export const HOME_MONTHS: HomeMonth[] = [
  {
    id: "aug",
    label: "15–31 августа",
    tag: "Прелюдия",
    state: "сейчас",
    headline: "Закрыть старую главу",
    lead: "Ещё даже не основной Season of Exploration. Задача — не открыть новую жизнь раньше времени.",
    focus: [
      "Закончить курс",
      "Закрыть текущие обязательства",
      "Подготовить переезд",
      "Обслуживать агентство",
      "Не запускать полноценную новую жизнь раньше времени",
    ],
  },
  {
    id: "sep",
    label: "Сентябрь",
    tag: "Земля",
    state: "дальше",
    headline: "Создать опору + выйти в реальность",
    lead: "Переезд и первый выход на рынок найма. Среда важнее скорости.",
    warn: "следить за расходами! не раздувать! даже на команду!",
    focus: [
      "Переехать",
      "Выйти на рынок найма",
      "Реактивировать базу",
      "Обслуживать существующее агентство",
      "Начать direct validation одного SaaS",
      "Обжить новую среду",
    ],
  },
  {
    id: "oct",
    label: "Октябрь",
    tag: "Сигнал",
    state: "дальше",
    headline: "Проверять магнит и асимметрию",
    lead: "После появления возможности нормально снимать.",
    warn: "следить за расходами! не раздувать! даже на команду!\n\nвсе договоренности фиксируем письменно\n20–29 октября не принимать важных решений (расставание, переезд, закрытие проекта). Поставить отдых",
    focus: ["YouTube", "Короткие форматы", "Qmagic", "Продолжение найма", "Новые люди и среды"],
  },
  {
    id: "nov",
    label: "Ноябрь",
    tag: "Схождение",
    state: "дальше",
    headline: "Накопить данные и сделать вывод",
    lead: "Новые ставки не открываются. Только два вопроса: что реально работает и что стало очевидным, чего я не знал в августе.",
    warn: "следить за расходами! не раздувать! даже на команду! может быть соблазн!",
    focus: [
      "Не открывать новые ставки",
      "Что реально работает?",
      "Что стало очевидным, чего я не знал в августе?",
      "30 ноября — Review",
    ],
  },
];

export const HOME_LILA_BAN: HomeLilaBan = {
  mark: "🜂",
  title: "Главный запрет периода",
  text: "Новых больших Лил / стратегических раскладов до Review нет.",
  note: "Следующий класс ответов должен прийти из прожитой реальности.",
};

/* ---------------------------- ЦЕЛИ СПРИНТА -------------------------------- */

export const HOME_SPRINT: HomeSprint = { label: "Цели сентября", dates: "Сентябрь · Земля" };

export const HOME_SPRINT_GOALS: HomeSprintGoal[] = [
  {
    id: "move",
    name: "Переезд",
    tint: "#0F766E",
    bg: "#E6F4F1",
    goal: "Переехать",
    items: [],
  },
  {
    id: "agency",
    name: "Агентство",
    tint: "#2A56EB",
    bg: "#EFF4FF",
    goal: "Работа над ошибками и база",
    items: [
      "Работа над ошибками модель Миши",
      "2 CV типа ноушен. поддержка / вайбкодинг",
      "Реактив постоянников",
    ],
  },
  {
    id: "qmagic",
    name: "Qmagic",
    tint: "#7C3AED",
    bg: "#F3EDFF",
    goal: "Допилить и запустить",
    items: [],
  },
  {
    id: "media",
    name: "Медийка",
    tint: "#C2410C",
    bg: "#FFF1E8",
    goal: "Выгорание и следующий ролик",
    items: [
      "Минимум сценарий ролика про выгорание + следующего",
      "Снять про выгорание",
    ],
  },
];

/* ---------------------------- СТАВКИ СЕЗОНА ------------------------------- */

export const HOME_BETS: HomeBet[] = [
  {
    id: "opora",
    mark: "🏛",
    kicker: "Опора",
    name: "Найм",
    tint: "#2A56EB",
    bg: "#EFF4FF",
    hyp: "Найти AI / Product / Creative роль на 250–300к, которая закроет фундамент и оставит мне жизнь.",
    horizon: "Сентябрь — выход на рынок",
    href: HOME_LINKS.strategy,
  },
  {
    id: "qmagic",
    mark: "⚡",
    kicker: "Асимметрия",
    name: "Qmagic validation",
    tint: "#7C3AED",
    bg: "#F3EDFF",
    hyp: "Дать доступ 10 людям, проверить, пользуются ли они и готовы ли платить.",
    horizon: "Сентябрь — direct validation",
    href: HOME_LINKS.projects,
  },
  {
    id: "brand",
    mark: "🧲",
    kicker: "Магнит",
    name: "Личный бренд",
    tint: "#C2410C",
    bg: "#FFF1E8",
    hyp: "Выпустить 6 роликов на YouTube и проверить отклик.",
    horizon: "Октябрь — когда есть где снимать",
    href: HOME_LINKS.brand,
  },
];

export const HOME_NOT_NOW: string[] = [
  "Масштабировать агентство",
  "Второй SaaS",
  "Искать дело на всю жизнь",
  "Решать отношения окончательно",
  "Решать сексуальную модель",
  "Большие Лилы / стратегические расклады",
];

/* --------------------------- ВРЕМЯ → ПРИБЫЛЬ ------------------------------ */

export const HOME_TRACKS: HomeTrack[] = [
  { id: "course", label: "Курс", kind: "cash", hours: 48, money: 180000, note: "записи и монтаж модулей", tint: "#0E7490" },
  { id: "agency", label: "Агентство", kind: "cash", hours: 62, money: 319000, note: "9 проектов · не оплачено", tint: "#2A56EB" },
  { id: "qmagic", label: "Qmagic", kind: "bet", hours: 26, money: 0, note: "ставка, выручки пока нет", tint: "#7C3AED" },
  { id: "video", label: "Ролики", kind: "bet", hours: 18, money: 0, note: "YouTube и съёмки", tint: "#C2410C" },
];

export const HOME_TIME_NOTE =
  "Считаем только то, что реально попало в день. Пустые часы не считаются потерянными.";

/* -------------------------------- ДЕНЬГИ --------------------------------- */

export const HOME_MONEY: HomeMoney = {
  capital: 509204,
  available: 438539,
  expected: 319000,
  paid: 0,
  forecast: 22084,
  expenses: 190000,
  month: "август",
};

/* -------------------------------- НЕДЕЛЯ --------------------------------- */

export const HOME_WEEK: HomeWeek = {
  label: "Неделя 10 — 16 августа",
  focusTitle: "Фокус недели",
  focus: [
    { id: "f1", area: "Курс", text: "Домонтировать и выложить модули 6 и 9.", state: "2 из 4 уроков" },
    { id: "f2", area: "Агентство", text: "Выставить счета и собрать оплату по девяти проектам.", state: "0 из 9" },
    { id: "f3", area: "Переезд", text: "Собрать список того, что нужно решить до сентября.", state: "начато" },
    { id: "f4", area: "Творчество", text: "Один день без обязательств — Вс.", state: "запланировано" },
  ],
  days: [
    {
      id: "mon",
      d: "Пн",
      n: "10",
      past: true,
      items: [
        { t: "Съёмка модуля 6", k: "course" },
        { t: "Правки по 2 сайтам", k: "agency" },
      ],
    },
    {
      id: "tue",
      d: "Вт",
      n: "11",
      past: true,
      items: [
        { t: "Творческий день", k: "ritual" },
        { t: "Qmagic: экспорт блока", k: "qmagic" },
      ],
    },
    {
      id: "wed",
      d: "Ср",
      n: "12",
      past: true,
      items: [
        { t: "Сайт мангалы — сдача", k: "agency" },
        { t: "Монтаж видео 3", k: "video" },
      ],
    },
    {
      id: "thu",
      d: "Чт",
      n: "13",
      past: true,
      items: [
        { t: "Ужин с Р. — соц. событие", k: "ritual" },
        { t: "Счета по 4 проектам", k: "agency" },
      ],
    },
    {
      id: "fri",
      d: "Пт",
      n: "14",
      past: true,
      items: [
        { t: "Съёмка урока по копирайтингу", k: "course" },
        { t: "Два шортс", k: "video" },
      ],
    },
    {
      id: "sat",
      d: "Сб",
      n: "15",
      past: true,
      items: [
        { t: "Договоры: курс + агентство", k: "agency" },
        { t: "Монтаж и загрузка модуля 9", k: "course" },
      ],
    },
    {
      id: "sun",
      d: "Вс",
      n: "16",
      today: true,
      items: [
        { t: "Белое окно", k: "ritual" },
        { t: "Творческий день", k: "ritual" },
      ],
    },
  ],
  kinds: {
    agency: { label: "Агентство", tint: "#2A56EB", bg: "#EFF4FF" },
    course: { label: "Курс", tint: "#0E7490", bg: "#E6F6FA" },
    qmagic: { label: "Qmagic", tint: "#7C3AED", bg: "#F3EDFF" },
    video: { label: "Ролики", tint: "#C2410C", bg: "#FFF1E8" },
    ritual: { label: "Правило", tint: "#047857", bg: "#E7F6F0" },
  },
};

/** Отметки, которые в макете уже стоят на прошедших днях недели. */
export const HOME_WEEK_DONE_SEED: string[] = [
  "mon0",
  "mon1",
  "tue0",
  "tue1",
  "wed0",
  "thu0",
  "thu1",
  "fri0",
  "sat0",
  "sat1",
];

/* -------------------------- ПРАВИЛА И МИНИМУМ ----------------------------- */

export const HOME_CHECKS: HomeCheck[] = [
  { id: "white", label: "Белое окно", note: "раз в неделю · Вс 16", done: false },
  { id: "social", label: "Социальное событие", note: "раз в неделю · Чт 13, ужин с Р.", done: true },
  { id: "create", label: "Творческий день", note: "раз в неделю · был во Вт 11", done: true },
  { id: "walk", label: "Прогулка после работы", note: "каждый рабочий день · 4 из 5", done: false },
];

export const HOME_TRAININGS: HomeTrainings = { done: 1, total: 3, label: "Тренировки" };

export const HOME_RULES: string[] = [
  "Минимум выполнен → могу отдыхать.",
  "Новая срочная задача → сдвигаю другие, а не делаю всё сразу.",
  "Новая идея → бэклог.",
  "Есть энергия — не обязательно направлять в работу. Минимум сделал и отдыхаю.",
  "Трудность допустима. Внутреннее насилие — нет.",
];

export const HOME_RULE_CONTRAST: HomeRuleContrast = {
  ok: "«Не хочется, но понимаю зачем и спокойно делаю» — нормально.",
  no: "«Мне плохо, но мне плевать на себя, пока результат не готов» — старый паттерн.",
};

/* -------------------------------- РОЛИКИ --------------------------------- */

export const HOME_VIDEO: HomeVideo = {
  goal: 6,
  yt: [
    {
      n: "01",
      t: "Как я собираю сервисы за вечер",
      st: "опубликовано",
      date: "28 июля",
      views: "4,2 тыс",
      react: "31 коммент · +86 подписчиков",
    },
    {
      n: "02",
      t: "Почему я поставил курс на паузу",
      st: "опубликовано",
      date: "8 августа",
      views: "2,7 тыс",
      react: "18 комментов · +40 подписчиков",
    },
    {
      n: "03",
      t: "Пересборка: месяц третий",
      st: "монтаж",
      date: "плановая 18 августа",
      views: "—",
      react: "снято, осталась сборка",
    },
    {
      n: "04",
      t: "Как выглядит мой трекер жизни",
      st: "сценарий",
      date: "конец августа",
      views: "—",
      react: "структура написана",
    },
    {
      n: "05",
      t: "Найм после своего агентства",
      st: "идея",
      date: "сентябрь",
      views: "—",
      react: "зависит от переезда",
    },
    { n: "06", t: "Итоги сезона разведки", st: "идея", date: "ноябрь", views: "—", react: "к Review" },
  ],
  short: [],
  question: "Проверяем отклик, а не количество. Сигнал — люди, которые пишут сами.",
};

export const HOME_VIDEO_ST: Record<HomeVideoStatus, { tint: string; bg: string }> = {
  опубликовано: { tint: "#047857", bg: "#E7F6F0" },
  монтаж: { tint: "#A16207", bg: "#FEF7E0" },
  сценарий: { tint: "#2A56EB", bg: "#EFF4FF" },
  идея: { tint: "#71717A", bg: "#F4F4F5" },
};

/* ------------------------------ ФОРМАТЫ ---------------------------------- */

/** 509204 → «509 204». Разряды разделяются обычным пробелом, как в макете. */
export function homeFmt(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** 190000 → «190 тыс» */
export function homeFmtK(n: number): string {
  return `${Math.round(n / 1000)} тыс`;
}
