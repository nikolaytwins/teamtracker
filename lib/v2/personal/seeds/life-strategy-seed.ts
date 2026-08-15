export type LifeStrategySeason = {
  kicker: string;
  dates: string;
  startDate: string;
  lead: string;
  pull: string;
  review: string;
};

export type LifeStrategyDirection = {
  id: string;
  n: string;
  kicker: string;
  name: string;
  status: string;
  hypLabel: string;
  hyp: string;
  whyLabel?: string;
  why?: string;
  next?: string;
  cta: string;
};

export type LifeStrategyMaintain = { name: string; note: string };

export type LifeStrategyNotThis = { t: string; why: string; when: string };

export type LifeStrategyLila = {
  kicker: string;
  state: string;
  line: string;
  allowed: string[];
  not: string[];
  main: string;
};

export type LifeStrategyWeekRule = {
  id: string;
  n: string;
  text: string;
  why: string;
};

export type LifeStrategyRulePoolItem = {
  id: string;
  text: string;
  why: string;
};

export type LifeStrategyPrana = {
  id: string;
  label: string;
  kind: "count" | "bool";
  done: number | boolean;
  total?: number;
  tip?: string;
};

export type LifeStrategyOpenQ = { q: string; st: string; back: string };

export type LifeStrategySeasonQ = { area: string; q: string };

export type LifeStrategySeasonPayload = {
  season: LifeStrategySeason;
  directions: LifeStrategyDirection[];
  maintain: LifeStrategyMaintain[];
  notThis: LifeStrategyNotThis[];
  lila: LifeStrategyLila;
  weekRules: LifeStrategyWeekRule[];
  prana: LifeStrategyPrana[];
  openQ: LifeStrategyOpenQ[];
  game: string[];
  seasonQ: LifeStrategySeasonQ[];
};

export type LifeStrategyHistoryEntry = {
  id: string;
  name: string;
  dates: string;
  state: "Активный" | "Завершён";
  payload: LifeStrategySeasonPayload;
};

export type LifeStrategyDoc = LifeStrategySeasonPayload & {
  rulePool: LifeStrategyRulePoolItem[];
  history: LifeStrategyHistoryEntry[];
  activeHistoryId: string;
};

const ACTIVE_PAYLOAD: LifeStrategySeasonPayload = {
  season: {
    kicker: "Сезон разведки",
    dates: "Сентябрь — ноябрь 2026",
    startDate: "1 сентября 2026",
    lead: "Не угадать единственный правильный путь.\nСоздать финансовую опору, проверить несколько ограниченных ставок и позволить реальности показать, где появляется настоящий сигнал.",
    pull: "Цель сезона — не успех.\nЦель — понять то, чего я пока не знаю.",
    review: "30 ноября",
  },
  directions: [
    {
      id: "d1",
      n: "01",
      kicker: "Опора",
      name: "Найм / внешний контракт",
      status: "Проверяем рынком",
      hypLabel: "Главная гипотеза",
      hyp: "На рынке существует автономная AI / Product / Creative роль примерно на 250–300к, которая закрывает финансовый фундамент и при этом оставляет мне голову и жизнь.",
      whyLabel: "Почему это №1",
      why: "Если фундамент закрыт, мне больше не нужно требовать от агентства или нового бизнеса немедленно оплачивать всю жизнь.",
      next: "Подготовить позиционирование + выйти в целевые контакты.",
      cta: "Открыть гипотезу",
    },
    {
      id: "d2",
      n: "02",
      kicker: "Капитализация / магнит",
      name: "Личный бренд",
      status: "Эксперимент: YouTube",
      hypLabel: "Гипотеза",
      hyp: "Мне стоит строить публичность вокруг своей реальной трансформации, создания проектов, AI и поиска более свободной большой жизни — а не только вокруг обучения дизайну.",
      next: "Выпустить следующий контент-тест.",
      cta: "Личный бренд",
    },
    {
      id: "d3",
      n: "03",
      kicker: "Асимметрия",
      name: "SaaS / Qmagic",
      status: "Validation",
      hypLabel: "Гипотеза",
      hyp: "Я могу создавать ценность, которая масштабируется быстрее моего личного рабочего времени.",
      whyLabel: "Важно",
      why: "Сейчас проверяем Qmagic. Другие SaaS-идеи не становятся активными коммерческими ставками.",
      next: "Получить следующий реальный пользовательский сигнал.",
      cta: "Открыть Qmagic",
    },
    {
      id: "d4",
      n: "04",
      kicker: "Смысл",
      name: "Аркалиум",
      status: "Без KPI",
      hypLabel: "Описание",
      hyp: "Чистое авторство и большая творческая территория. Не обязан сейчас кормить меня и доказывать рынок.",
      whyLabel: "Текущий принцип",
      why: "Защищённое творческое пространство без KPI.",
      cta: "Открыть Аркалиум",
    },
  ],
  maintain: [
    { name: "Агентство", note: "существующий cashflow" },
    { name: "Курс", note: "закрытие обязательств / существующий актив" },
  ],
  notThis: [
    {
      t: "Не масштабирую агентство.",
      why: "Рост агентства требует моего личного времени именно там, где сейчас проверяется опора.",
      when: "Вернуться после закрытия финансового фундамента.",
    },
    {
      t: "Не запускаю одновременно второй коммерческий SaaS-test.",
      why: "Две ставки одновременно означают, что ни одна не получает достаточного сигнала.",
      when: "После итога по Qmagic.",
    },
    {
      t: "Не строю отдельную Instagram-машину.",
      why: "Один медийный канал за сезон, иначе тест превращается в производство контента.",
      when: "После выводов по YouTube.",
    },
    {
      t: "Не пытаюсь выбрать одну профессию на всю жизнь.",
      why: "Сезон существует ради данных, а не ради финального самоопределения.",
      when: "Вопрос остаётся открытым намеренно.",
    },
    {
      t: "Не принимаю финальное решение по сексуальной модели отношений.",
      why: "Решение требует реального опыта, а не ещё одного анализа.",
      when: "Наблюдаю динамику до конца сезона.",
    },
    {
      t: "Не начинаю новые большие Лилы / расклады про судьбу, карьеру и отношения.",
      why: "Следующий слой информации должен прийти из материального опыта.",
      when: "После окончания спринта.",
    },
    {
      t: "Не пытаюсь заранее решить, как должна выглядеть вся жизнь после переезда.",
      why: "Решение следующего шага дешевле, чем проектирование всей жизни.",
      when: "После реального опыта на месте.",
    },
  ],
  lila: {
    kicker: "Лила / большие расклады",
    state: "Пауза до конца спринта",
    line: "Следующий слой информации должен прийти из материального опыта.",
    allowed: [
      "коротко осмыслить уже произошедшее событие;",
      "посмотреть локальную ситуацию;",
      "использовать символический язык без открытия нового стратегического вопроса.",
    ],
    not: [
      "ещё одну игру про предназначение;",
      "новый большой расклад про отношения;",
      "бесконечное подтверждение уже принятого решения.",
    ],
    main: "Я уже достаточно понял, чтобы временно перестать понимать и начать жить.",
  },
  weekRules: [
    { id: "wr1", n: "01", text: "Если могу больше — не значит, что должен.", why: "Maximizer" },
    {
      id: "wr2",
      n: "02",
      text: "Новая идея идёт в backlog, а не автоматически становится новым проектом.",
      why: "Option Hoarder",
    },
    { id: "wr3", n: "03", text: "Не делать вывод крупнее данных.", why: "External Proof Dependency" },
    {
      id: "wr4",
      n: "04",
      text: "Если прилетает новая срочность — что-то другое сдвигается.",
      why: "Правило: срочный проект",
    },
    {
      id: "wr5",
      n: "05",
      text: "Не вся энергия должна возвращаться в производство.",
      why: "Fire Exploiter",
    },
  ],
  prana: [
    { id: "tr", label: "Тренировки", kind: "count", done: 1, total: 3 },
    { id: "wk", label: "Прогулки", kind: "count", done: 3, total: 7 },
    {
      id: "wh",
      label: "Белое окно",
      kind: "bool",
      done: false,
      tip: "Несколько часов без заранее заданного результата. Можно гулять, сидеть в кофейне, увидеться с человеком, ничего не делать или неожиданно захотеть творить.\n\nОно НЕ обязано закончиться:\n— работой;\n— Аркалиумом;\n— инсайтом;\n— полезным результатом.",
    },
    { id: "soc", label: "Социальное событие", kind: "bool", done: false },
    { id: "cr", label: "Творческое окно", kind: "bool", done: true },
  ],
  openQ: [
    { q: "Какой бизнес станет главным?", st: "сезон разведки собирает данные", back: "После итогов сезона, 30 ноября" },
    {
      q: "Каким будет мой окончательный формат отношений?",
      st: "наблюдаю реальную динамику",
      back: "Без срока — по реальному опыту",
    },
    { q: "Какая сексуальная модель мне нужна в долгую?", st: "решение сознательно отложено", back: "Не в этом сезоне" },
    {
      q: "Где я буду жить после следующего этапа?",
      st: "решаю следующий шаг после реального опыта",
      back: "После закрытия опоры",
    },
    { q: "Будет ли Qmagic большим проектом?", st: "сначала validation", back: "После пользовательского сигнала" },
  ],
  game: [
    "Я могу хотеть большую жизнь ещё до того, как знаю дорогу.",
    "Моя настоящая природа — создавать; формы могут меняться.",
    "Источник стабильности не обязан быть источником масштаба.",
    "Я перестаю компенсировать собой слабые места системы.",
    "Действию нужно дать достаточно времени стать опытом.",
    "Не жить медленно. Не жить внутренне торопясь.",
    "Следующий ответ должна дать реальность.",
  ],
  seasonQ: [
    { area: "Найм", q: "Существует ли реально подходящая мне внешняя роль?" },
    { area: "Агентство", q: "Сколько денег оно способно давать при низком founder-load?" },
    { area: "SaaS", q: "Есть ли реальный спрос хотя бы на одну мою продуктовую гипотезу?" },
    { area: "Медийность", q: "Какая тема и позиционирование реально притягивают правильную аудиторию?" },
    { area: "Энергия", q: "Становится ли меньше апатии, если я перестаю максимизировать результат?" },
    { area: "Жизнь", q: "Что продолжает возвращаться само без внешнего давления?" },
  ],
};

const PAST_AUG: LifeStrategySeasonPayload = {
  ...ACTIVE_PAYLOAD,
  season: {
    kicker: "Август — закрытие обязательств",
    dates: "Aug 2026",
    startDate: "1 августа 2026",
    lead: "Закрыть старые обязательства и освободить внимание для сезона разведки.",
    pull: "Не начинать новое, пока не закрыто старое.",
    review: "31 августа",
  },
  directions: [
    {
      id: "d1",
      n: "01",
      kicker: "Закрытие",
      name: "Старые обязательства",
      status: "Завершено",
      hypLabel: "Фокус",
      hyp: "Очистить backlog обязательств, чтобы сезон разведки начался без долга.",
      cta: "Итог",
    },
  ],
  weekRules: [],
};

const PAST_SPRING: LifeStrategySeasonPayload = {
  ...ACTIVE_PAYLOAD,
  season: {
    kicker: "Весна — агентство на потоке",
    dates: "Mar — Jun 2026",
    startDate: "1 марта 2026",
    lead: "Выстроить агентство так, чтобы оно давало cashflow при низком founder-load.",
    pull: "Система, а не героизм.",
    review: "30 июня",
  },
  directions: [
    {
      id: "d1",
      n: "01",
      kicker: "Cashflow",
      name: "Агентство",
      status: "Завершено",
      hypLabel: "Гипотеза",
      hyp: "Агентство может работать на потоке без постоянного участия основателя в каждой задаче.",
      cta: "Итог",
    },
  ],
  weekRules: [],
};

export function seedLifeStrategyDoc(): LifeStrategyDoc {
  return {
    ...ACTIVE_PAYLOAD,
    rulePool: [
      { id: "p1", text: "Если могу больше — не значит, что должен.", why: "Maximizer" },
      {
        id: "p2",
        text: "Новая идея идёт в backlog, а не автоматически становится новым проектом.",
        why: "Option Hoarder",
      },
      { id: "p3", text: "Не делать вывод крупнее данных.", why: "External Proof Dependency" },
      {
        id: "p4",
        text: "Если прилетает новая срочность — что-то другое сдвигается.",
        why: "Правило: срочный проект",
      },
      { id: "p5", text: "Не вся энергия должна возвращаться в производство.", why: "Fire Exploiter" },
      { id: "p6", text: "Сначала меняю систему, потом добавляю себя.", why: "Universal Compensator" },
      { id: "p7", text: "Не знаю → проверяю действием.", why: "Future Controller" },
      { id: "p8", text: "Не каждое внутреннее событие требует вывода.", why: "Inner Manager" },
      { id: "p9", text: "Источник стабильности не обязан быть источником масштаба.", why: "Убеждение 05" },
      { id: "p10", text: "Эмпатия не равна обязанности регулировать чужую реальность.", why: "Rescuer" },
      { id: "p11", text: "Ставка оценивается после заранее выбранного цикла.", why: "Speed Addict" },
      { id: "p12", text: "Не жить медленно. Не жить внутренне торопясь.", why: "Убеждение 12" },
    ],
    history: [
      {
        id: "h1",
        name: "Сезон разведки",
        dates: "Sep — Nov 2026",
        state: "Активный",
        payload: ACTIVE_PAYLOAD,
      },
      {
        id: "h2",
        name: "Август — закрытие обязательств",
        dates: "Aug 2026",
        state: "Завершён",
        payload: PAST_AUG,
      },
      {
        id: "h3",
        name: "Весна — агентство на потоке",
        dates: "Mar — Jun 2026",
        state: "Завершён",
        payload: PAST_SPRING,
      },
    ],
    activeHistoryId: "h1",
  };
}
