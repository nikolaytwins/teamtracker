export type BrandSignal = "very" | "strong" | "medium" | "weak" | "none";

export type BrandColumn = {
  id: string;
  label: string;
  on: boolean;
  fixed?: boolean;
};

export type BrandVideoMetrics = {
  impressions: number;
  ctr: number;
  v24: number;
  v7: number;
  v30: number;
  avd: string;
  avp: number;
  subs: number;
  comments: number;
};

export type BrandVideo = {
  id: string;
  title: string;
  sub: string;
  dir: string;
  status: string;
  date: string;
  hyp: string;
  want: string;
  m: BrandVideoMetrics | null;
  sig: BrandSignal;
  learn: string;
  next: string;
  quotes: { t: string; src: string }[];
};

export type BrandLabItem = {
  id: string;
  kind: "insight" | "hypothesis";
  text: string;
  /** Источник инсайта или «почему» гипотезы */
  note: string;
  power?: number;
  createdAt: string;
  status: "open" | "done";
};

export type BrandDoc = {
  hyp: {
    status: string;
    start: string;
    review: string;
    main: string;
    show: string[];
    role: string;
    avoid: string[];
  };
  core: {
    main: string;
    blocks: { t: string; lead?: string; items: string[] }[];
  };
  unknown: string[];
  dirs: {
    id: string;
    name: string;
    need: string;
    hyp: string;
    check: string;
    ex: string[];
    status: string;
    videos: number;
    avg: string;
  }[];
  videos: BrandVideo[];
  dirStats: { dir: string; videos: number; ctr: string; viewed: string; subs: number; sig: BrandSignal }[];
  insights: { t: string; src: string; power: number }[];
  /** Бэклог инсайтов и гипотез с шапки страницы. */
  labBacklog: BrandLabItem[];
  evolution: { period: string; text: string; why: string; data: string; now?: boolean }[];
  keep: string[];
  money: {
    now: { n: string; d: string }[];
    future: { n: string; d: string }[];
    key: string;
    courseNote: string[];
  };
  productHyp: { name: string; status: string; text: string; why: string }[];
  channels: { n: string; d: string }[];
  ui: {
    filter: "all" | "pub" | "plan";
    columns: BrandColumn[];
  };
};

export function normalizeBrandDoc(raw: unknown): BrandDoc {
  const seed = seedBrandDoc();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return seed;
  const d = raw as Partial<BrandDoc>;
  const labBacklog: BrandLabItem[] = Array.isArray(d.labBacklog)
    ? d.labBacklog
        .filter((x) => x && typeof x === "object")
        .map((x, i) => {
          const row = x as Partial<BrandLabItem>;
          const item: BrandLabItem = {
            id: String(row.id || `lab_${i}`),
            kind: row.kind === "hypothesis" ? "hypothesis" : "insight",
            text: String(row.text || ""),
            note: String(row.note || ""),
            power: typeof row.power === "number" ? row.power : undefined,
            createdAt: String(row.createdAt || new Date().toISOString()),
            status: row.status === "done" ? "done" : "open",
          };
          return item;
        })
        .filter((x) => x.text.trim())
    : [];
  const normalized: BrandDoc = {
    ...seed,
    ...d,
    hyp: { ...seed.hyp, ...(d.hyp || {}) },
    core: { ...seed.core, ...(d.core || {}) },
    money: { ...seed.money, ...(d.money || {}) },
    ui: { ...seed.ui, ...(d.ui || {}), columns: d.ui?.columns?.length ? d.ui.columns : seed.ui.columns },
    insights: Array.isArray(d.insights) ? d.insights : seed.insights,
    labBacklog,
    evolution: Array.isArray(d.evolution) ? d.evolution : seed.evolution,
    dirs: Array.isArray(d.dirs) ? d.dirs : seed.dirs,
    videos: Array.isArray(d.videos) ? d.videos : seed.videos,
    dirStats: Array.isArray(d.dirStats) ? d.dirStats : seed.dirStats,
    unknown: Array.isArray(d.unknown) ? d.unknown : seed.unknown,
    keep: Array.isArray(d.keep) ? d.keep : seed.keep,
    productHyp: Array.isArray(d.productHyp) ? d.productHyp : seed.productHyp,
    channels: Array.isArray(d.channels) ? d.channels : seed.channels,
  };
  // Drop removed fields if they still exist in stored docs.
  const legacy = normalized as BrandDoc & {
    phrases?: unknown;
    nextHyp?: unknown;
    backlog?: unknown;
  };
  delete legacy.phrases;
  delete legacy.nextHyp;
  delete legacy.backlog;
  return normalized;
}

export function seedBrandDoc(): BrandDoc {
  return {
    hyp: {
      status: "Проверяем",
      start: "01.09.2026",
      review: "30.11.2026",
      main: "Автор, который на глазах строит более крупную версию собственной жизни и создаёт инструменты, системы и миры для других создателей.",
      show: [
        "собственную пересборку жизни;",
        "путь в новую реализацию;",
        "бизнес- и продуктовые эксперименты;",
        "использование AI;",
        "создание проектов;",
        "реальные проблемы, ошибки и выводы;",
        "деньги, здоровье, работу, свободу;",
        "красивую и большую жизнь как направление.",
      ],
      role: "Не наставник сверху.\nУмный экспериментатор / создатель / человек в пути.",
      avoid: [
        "инфогуру;",
        "мотивационным коучем;",
        "чистым AI-news блогером;",
        "только дизайнерским образовательным каналом;",
        "человеком, у которого каждый пост заканчивается продажей курса.",
      ],
    },
    core: {
      main: "Я способен на большее, но не понимаю, как выйти из нынешней жизни.",
      blocks: [
        {
          t: "Сейчас он",
          items: [
            "работает не там, где хочет;",
            "устал;",
            "потерял ясный путь;",
            "интересуется AI и новыми возможностями;",
            "чувствует потенциал, но не понимает, куда его приложить;",
            "хочет больше свободы;",
            "боится остаться в нынешней жизни.",
          ],
        },
        {
          t: "Он хочет",
          items: [
            "новую траекторию;",
            "интересную работу;",
            "больше денег;",
            "свободу;",
            "почувствовать движение;",
            "создавать что-то своё;",
            "увидеть примеры других способов жить.",
          ],
        },
        {
          t: "Зачем он может следить за мной",
          lead: "Не просто за советами. А за:",
          items: [
            "«Получится ли у него самому пересобрать эту жизнь?»",
            "«Что он попробует следующим?»",
            "«Какие инструменты найдёт?»",
            "«Какие ошибки совершит?»",
            "«Что реально сработает?»",
          ],
        },
        {
          t: "Какую ценность получает",
          items: [
            "новую рамку мышления;",
            "направление;",
            "язык для своих ощущений;",
            "идеи;",
            "инструменты;",
            "конкретные способы движения.",
          ],
        },
      ],
    },
    unknown: [
      "Действительно ли тема «пересборки жизни» сильнее экспертного AI/design контента?",
      "За человеком идут ради его пути или ради практической пользы?",
      "Насколько широкой должна быть тема канала?",
      "Готова ли эта аудитория покупать образовательный продукт?",
      "Какую часть аудитории реально интересует дизайн?",
      "Что является сильнейшим крючком: усталость / деньги / реализация / AI / личная история / свобода?",
    ],
    dirs: [
      {
        id: "crisis",
        name: "Кризис / усталость",
        need: "Узнать себя в состоянии, которому пока нет названия.",
        hyp: "Люди узнают себя в состоянии потери желания и направления.",
        check: "даёт ли узнавание сильный эмоциональный отклик.",
        ex: ["«Эпоха великой усталости — почему ты ничего не хочешь?»", "«Старался / стало пофиг»"],
        status: "Testing",
        videos: 3,
        avg: "Сильный сигнал",
      },
      {
        id: "reality",
        name: "Реалити / пересборка жизни",
        need: "Видеть живой пример перехода, а не готовый результат.",
        hyp: "Людям интересно следить за человеком, который сам находится внутри перехода, а не рассказывает с вершины.",
        check: "держится ли внимание между эпизодами.",
        ex: ["«Реалити-манифест»", "«Мне 27, у меня нет квартиры и машины»"],
        status: "Первый тест",
        videos: 1,
        avg: "Средний сигнал",
      },
      {
        id: "ai",
        name: "AI / создание",
        need: "Практические способы делать больше своими руками.",
        hyp: "Практическая демонстрация создания связывает личную историю с реальной профессиональной компетенцией.",
        check: "приходит ли через практику правильная аудитория.",
        ex: ["«Как я создаю проекты с помощью ИИ: курс, сервис, контент и дизайн»"],
        status: "Testing",
        videos: 2,
        avg: "Средний сигнал",
      },
      {
        id: "health",
        name: "Здоровье / изменение жизни",
        need: "Доказательство, что изменения дают измеримый эффект.",
        hyp: "Личные эксперименты с измеримым результатом усиливают реалити-формат.",
        check: "работает ли измеримость как крючок.",
        ex: ["«Устал так жить. 60 дней без сахара и кофе — что показали анализы»"],
        status: "Запланировано",
        videos: 1,
        avg: "Нет данных",
      },
      {
        id: "money",
        name: "Деньги / реализация",
        need: "Понять, как сейчас вообще зарабатывают такие как он.",
        hyp: "Честные деньги и неопределённость профессии притягивают ядро сильнее, чем success story.",
        check: "какой угол — просадка рынка, найм, SaaS — вызывает отклик.",
        ex: ["просадка рынка", "поиск новой модели", "агентство", "найм", "SaaS", "неопределённость профессии"],
        status: "Backlog",
        videos: 1,
        avg: "Нет данных",
      },
    ],
    videos: [
      {
        id: "v1",
        title: "Эпоха великой усталости",
        sub: "Почему ты ничего не хочешь?",
        dir: "crisis",
        status: "Опубликован",
        date: "04.09.2026",
        hyp: "Большое количество амбициозных людей чувствуют не классическую лень, а потерю смысла и направления. Если сформулировать это точно, они узнают себя.",
        want: "Насколько эта боль является сильным входом в мою аудиторию.",
        m: { impressions: 48200, ctr: 6.4, v24: 5100, v7: 14800, v30: 22400, avd: "7:12", avp: 48, subs: 412, comments: 186 },
        sig: "very",
        learn: "Аудитория откликается не на «как стать успешным», а на точную формулировку того, что старая траектория перестала быть живой.",
        next: "Проверить ту же боль через более личный формат.",
        quotes: [
          { t: "Это буквально я.", src: "YouTube" },
          { t: "Я думал, со мной одним такое происходит.", src: "YouTube" },
          { t: "Наконец кто-то это нормально сформулировал.", src: "Telegram" },
        ],
      },
      {
        id: "v2",
        title: "Старался / стало пофиг",
        sub: "Что происходит с мотивацией",
        dir: "crisis",
        status: "Опубликован",
        date: "11.09.2026",
        hyp: "Та же боль, рассказанная через личную историю, работает не слабее концептуальной формулировки.",
        want: "Личное или концептуальное заходит сильнее.",
        m: { impressions: 31500, ctr: 5.2, v24: 3200, v7: 9100, v30: 12600, avd: "6:04", avp: 44, subs: 198, comments: 97 },
        sig: "strong",
        learn: "Личный угол даёт меньше охвата, но более тёплые комментарии и больше сообщений в личку.",
        next: "Попробовать тот же приём в реалити-серии.",
        quotes: [{ t: "Как будто мою переписку с собой прочитали.", src: "YouTube" }],
      },
      {
        id: "v3",
        title: "Как я создаю проекты с помощью ИИ",
        sub: "Курс, сервис, контент и дизайн",
        dir: "ai",
        status: "Опубликован",
        date: "18.09.2026",
        hyp: "Практическая демонстрация создания связывает личную историю с профессиональной компетенцией.",
        want: "Приходит ли через практику та же аудитория, что и через кризис.",
        m: { impressions: 26800, ctr: 4.6, v24: 2400, v7: 7300, v30: 10900, avd: "8:41", avp: 51, subs: 76, comments: 54 },
        sig: "medium",
        learn: "Тема AI интересна сильнее, когда встроена в создание реального проекта, а не существует как новости об AI.",
        next: "Показать один инструмент от нуля до результата.",
        quotes: [{ t: "Больше такого, где видно процесс целиком.", src: "YouTube" }],
      },
      {
        id: "v4",
        title: "Реалити-манифест",
        sub: "Зачем я всё это показываю",
        dir: "reality",
        status: "Опубликован",
        date: "25.09.2026",
        hyp: "Заявленное реалити создаёт причину подписаться, а не просто посмотреть.",
        want: "Конвертирует ли обещание пути в подписку.",
        m: { impressions: 18400, ctr: 5.9, v24: 2100, v7: 5600, v30: 7800, avd: "5:38", avp: 46, subs: 184, comments: 71 },
        sig: "strong",
        learn: "Людям интересно не только чему я могу научить, но и что произойдёт со мной дальше.",
        next: "Первый эпизод с конкретным шагом и цифрами.",
        quotes: [{ t: "Подписался ради того, чем это закончится.", src: "YouTube" }],
      },
      {
        id: "v5",
        title: "Мне 27, у меня нет квартиры и машины",
        sub: "",
        dir: "reality",
        status: "Ready",
        date: "—",
        hyp: "Социальное сравнение — сильный вход в тему пересборки жизни.",
        want: "Работает ли болезненное сравнение без обесценивания аудитории.",
        m: null,
        sig: "none",
        learn: "",
        next: "",
        quotes: [],
      },
      {
        id: "v6",
        title: "Устал так жить. 60 дней без сахара и кофе",
        sub: "Что показали анализы",
        dir: "health",
        status: "Script",
        date: "—",
        hyp: "Личные эксперименты с измеримым результатом усиливают реалити-формат.",
        want: "Работает ли измеримость как крючок.",
        m: null,
        sig: "none",
        learn: "",
        next: "",
        quotes: [],
      },
      {
        id: "v7",
        title: "Рынок просел. Что я делаю с деньгами",
        sub: "",
        dir: "money",
        status: "Idea",
        date: "—",
        hyp: "Честный разговор про деньги в неопределённости притягивает ядро.",
        want: "Какой угол денег вызывает отклик.",
        m: null,
        sig: "none",
        learn: "",
        next: "",
        quotes: [],
      },
    ],
    dirStats: [
      { dir: "crisis", videos: 2, ctr: "5.8%", viewed: "46%", subs: 18, sig: "strong" },
      { dir: "reality", videos: 1, ctr: "5.9%", viewed: "46%", subs: 24, sig: "strong" },
      { dir: "ai", videos: 1, ctr: "4.6%", viewed: "51%", subs: 7, sig: "medium" },
    ],
    insights: [
      {
        t: "Люди реагируют не на «как стать успешным», а на точную формулировку ощущения, что старая траектория перестала работать.",
        src: "Ролики 01, 04",
        power: 3,
      },
      {
        t: "Тема AI интересна сильнее, когда встроена в создание реального проекта, а не существует как новости об AI.",
        src: "Ролик 03, комментарии",
        power: 3,
      },
      {
        t: "Большой пласт аудитории не считает себя дизайнером, но хочет перейти из нынешней работы в более творческую цифровую среду.",
        src: "Личные сообщения",
        power: 2,
      },
      {
        t: "Людям интересно не только чему я могу научить, но и что произойдёт со мной дальше.",
        src: "Ролик 04",
        power: 3,
      },
      {
        t: "Комментарии с «это буквально я» приходят на формулировки состояния, а не на советы.",
        src: "Ролики 01, 02",
        power: 4,
      },
    ],
    labBacklog: [],
    evolution: [
      {
        period: "Август 2026",
        text: "Дизайн + AI + обучение",
        why: "Начальная гипотеза от существующего продукта.",
        data: "Курс и агентство как основа контента.",
      },
      {
        period: "Сентябрь 2026",
        text: "Создание проектов через AI + личный путь",
        why: "Экспертный контент собирал зрителей, но не привязывал к автору.",
        data: "Низкая конверсия в подписку на чисто обучающих роликах.",
      },
      {
        period: "Текущая гипотеза",
        text: "Автор, который публично строит более крупную жизнь и показывает инструменты её создания.",
        why: "Ролики про состояние дали в 3 раза больше подписок на 1000 просмотров.",
        data: "Ролики 01, 02, 04 + повторяющиеся комментарии.",
        now: true,
      },
    ],
    keep: [
      "создание;",
      "собственный взгляд;",
      "интеллект;",
      "эстетическую составляющую;",
      "реальные проекты;",
      "честность текущей точки;",
      "право менять интересы;",
      "отсутствие образа всезнающего гуру.",
    ],
    money: {
      now: [
        { n: "Курс", d: "существующий продукт" },
        { n: "Агентство", d: "возможные входящие клиенты" },
        { n: "Проекты / найм", d: "репутационный эффект" },
      ],
      future: [
        { n: "SaaS", d: "дистрибуция продуктов" },
        { n: "Партнёрства", d: "коллаборации" },
        { n: "Новые продукты", d: "только после повторяющегося запроса аудитории" },
      ],
      key: "Медийность не принадлежит курсу. Курс арендует часть медийности, когда релевантен.",
      courseNote: [
        "Контент «как войти в дизайн / AI / профессию» → может напрямую вести на курс.",
        "Контент «как пересобрать жизнь / усталость / деньги / путь / кризис профессии» → сначала строит широкое поле бренда.",
      ],
    },
    productHyp: [
      {
        name: "AI Career Lab",
        status: "Backlog",
        text: "Программа / AI-система, помогающая человеку распаковать навыки, увидеть возможные траектории и провести несколько дешёвых карьерных экспериментов.",
        why: "повторяющаяся боль аудитории «не понимаю, куда идти».",
      },
      {
        name: "Набор шаблонов пересборки",
        status: "Observation",
        text: "Рабочие документы, которыми я сам пользуюсь: стратегия сезона, правила, эксперименты.",
        why: "просят «дай тот шаблон, который у тебя на экране».",
      },
    ],
    channels: [
      { n: "YouTube", d: "Главная лаборатория гипотез." },
      { n: "Telegram", d: "Глубокие мысли / наблюдения / контакт с ядром." },
      { n: "Instagram", d: "Производные форматы: Reels, карусели, визуальная упаковка уже существующих мыслей." },
    ],
    ui: {
      filter: "all",
      columns: [
        { id: "title", label: "Название", on: true, fixed: true },
        { id: "dir", label: "Направление", on: true },
        { id: "hyp", label: "Гипотеза", on: false },
        { id: "date", label: "Дата", on: true },
        { id: "v24", label: "Views 24h", on: false },
        { id: "v7", label: "Views 7d", on: false },
        { id: "v30", label: "Views", on: true },
        { id: "impressions", label: "Impressions", on: false },
        { id: "ctr", label: "CTR", on: true },
        { id: "avd", label: "AVD", on: false },
        { id: "avp", label: "Avg %", on: true },
        { id: "subs", label: "Subs", on: true },
        { id: "comments", label: "Комментарии", on: false },
        { id: "sig", label: "Сигнал", on: true },
        { id: "learn", label: "Вывод", on: true },
      ],
    },
  };
}
