import { DESIGN_HYPOTHESES, findHypothesisCatalogSeed } from "@/lib/v2/personal/hypotheses-meta";

export const ROSTOV_HYPOTHESIS_TITLE = "Колбаса через контент";
export const ROSTOV_HYPOTHESIS_ALIASES = ["Запуск Ростовских колбас через контент"];
export const ROSTOV_HYPOTHESIS_BODY =
  "Если проверить рилсы, UGC и партнерскую программу, то хотя бы один канал даст первый доход.";
export const ROSTOV_HYPOTHESIS_CRITERION = "Первый доход или ≥ 1 партнёр";

export const ROSTOV_CONTENT_PLAN_HREF = "/v2/personal/articles/rostov-content-plan";
export const ROSTOV_UGC_HREF = "/v2/personal/articles/rostov-ugc";

export type HypothesisNoteTag = "win" | "fail" | "obs";

export type HypothesisTask = {
  id: string;
  title: string;
  detail: string;
  done: boolean;
  goal: number | null;
  n: number;
};

export type HypothesisStage = {
  id: string;
  title: string;
  note: string;
  tasks: HypothesisTask[];
};

export type HypothesisFile = { name: string; href: string };

export type HypothesisNote = {
  id: string;
  tag: HypothesisNoteTag;
  text: string;
  date: string;
};

export type HypothesisIdea = { id: string; text: string; archived: boolean };

export type HypothesisCopyBlock = { id: string; title: string; text: string };

export type HypothesisMoney = { label: string; value: string };

export type HypothesisEconRest = { title: string; note: string; value: string };

export type HypothesisEconBlock = {
  id: string;
  title: string;
  kicker: string;
  launch: [HypothesisMoney, HypothesisMoney];
  launchRest: HypothesisEconRest;
  month: [HypothesisMoney, HypothesisMoney];
  monthRest: HypothesisEconRest;
  footnote: string;
};

export type HypothesisWorkspace = {
  stages: HypothesisStage[];
  files: HypothesisFile[];
  notes: HypothesisNote[];
  ideas: HypothesisIdea[];
  copies: HypothesisCopyBlock[];
  econ: HypothesisEconBlock | null;
};

const TAGS = new Set<HypothesisNoteTag>(["win", "fail", "obs"]);

function text(value: unknown, max: number) {
  return String(value ?? "").replace(/\u0000/g, "").slice(0, max);
}

function id(value: unknown, fallback: string) {
  const clean = text(value, 40).trim();
  return clean || fallback;
}

export function emptyHypothesisWorkspace(): HypothesisWorkspace {
  return { stages: [], files: [], notes: [], ideas: [], copies: [], econ: null };
}

export const TWINLABS_HYPOTHESIS_TITLE = "Дизайн-поддержка";
export const TWINLABS_HYPOTHESIS_BODY =
  "Онлайн-школам, продюсерам и экспертам выгодно передать регулярные дизайн-задачи одной внешней команде вместо поиска отдельных исполнителей.";
export const TWINLABS_HYPOTHESIS_CRITERION = "1–2 платных пилота";
export const TWINLABS_HYPOTHESIS_PRIORITY = "высокий";

const TWINLABS_HYPOTHESIS_ALIASES = [
  "TwinLabs Plus — запустить продажи дизайн-поддержки",
  "Запуск подписки Твинлабс:Плюс + найм",
];

export const QMAGIC_HYPOTHESIS_TITLE = "Qmagic";
export const QMAGIC_HYPOTHESIS_BODY =
  "Пользователям нужен инструмент, который позволяет быстро создавать или редактировать дизайн через ИИ, в том числе внутри Figma.\n\nОбязательно: в агенте должен быть доступ совместной работы команды — чтобы маркетологи, продуктологи и другие роли генерировали в едином стиле.";

const QMAGIC_HYPOTHESIS_ALIASES = ["Qmagic — проверить одну продуктовую гипотезу", "Мини-запуск Qmagic"];

export function qmagicPageBrief(title: string): { title: string; text: string }[] | null {
  const value = title.trim();
  if (value !== QMAGIC_HYPOTHESIS_TITLE && !QMAGIC_HYPOTHESIS_ALIASES.includes(value)) return null;
  return [
    {
      title: "Основная ценность",
      text: "Максимальная простота.\n\n• не нужно настраивать скиллы\n• не нужно быть дизайнером\n• не нужно бегать по разным нейросетям\n\nНаписал, что хочешь — получил, что хочешь. Всё остальное под капотом.",
    },
    {
      title: "Главная ЦА",
      text: "Те, кому нужен постоянно дизайн, но сам дизайнером становиться не хочет. И тратить деньги на дизайнеров не хочет. Небольшие команды без полноценного дизайн-отдела.\n\nВиртуальный дизайн-отдел будет для них.",
    },
    {
      title: "Что Qmagic обязан уметь",
      text: "• Уметь работать с правками\n• Запоминать решения клиента\n• Давать команде совместный доступ в агенте — единый стиль генерации для маркетологов, продуктологов и других ролей\n\nОн должен покрывать весь спектр дизайн-задач, чтобы от него не уходили.",
    },
    {
      title: "Детектор ИИ-слопа",
      text: "В Qmagic должен быть детектор ИИ-слопа. Он должен генерировать всегда уникальный дизайн, без повторения.",
    },
    {
      title: "Первая функция",
      text: "Карусели, баннеры и картинки.\n\nСайты — будущая ставка.",
    },
  ];
}

export const MEDIA_HYPOTHESIS_TITLE = "YouTube (личная медийка)";
export const MEDIA_HYPOTHESIS_BODY =
  "Твой реальный путь из дизайнера в создателя ИИ-продуктов и предпринимателя может привлечь аудиторию, которая в будущем станет источником клиентов, партнёрств и покупателей собственных продуктов.";

const MEDIA_HYPOTHESIS_ALIASES = [
  "Личная медийка — начать строить долгосрочный актив",
  "Запуск контента в соц.сетях",
];

export const ADS_HYPOTHESIS_TITLE = "Запустить услугу продвижения сайтов";
export const ADS_HYPOTHESIS_BODY =
  "Мне нужен директолог-партнёр на субподряде с оплатой за клиентский проект.";
export const ADS_HYPOTHESIS_CRITERION = "Директолог-партнёр и сообщения старым клиентам";

function matchesHypothesisTitle(value: string, title: string, aliases: string[] = []) {
  return value === title || aliases.includes(value);
}

export type HypothesisPageProfile = {
  body: string;
  criterion: string;
  priority?: string;
  workspace: () => HypothesisWorkspace;
};

function task(id: string, title: string, goal: number | null = null, detail = ""): HypothesisTask {
  return { id, title, detail, done: false, goal, n: 0 };
}

export type HypothesisRankTone = "main" | "two" | "three" | "four" | "side";

export type HypothesisRank = { label: string; tone: HypothesisRankTone };

export function hypothesisHero(title: string): { src: string; pos: string } {
  const value = title.trim();
  if (matchesHypothesisTitle(value, ROSTOV_HYPOTHESIS_TITLE, ROSTOV_HYPOTHESIS_ALIASES)) {
    return { src: "/hypotheses/rostov-hero.jpg", pos: "42% 24%" };
  }
  if (value === ADS_HYPOTHESIS_TITLE) return { src: "/hypotheses/ads-hero.jpg", pos: "62% 18%" };
  if (matchesHypothesisTitle(value, MEDIA_HYPOTHESIS_TITLE, MEDIA_HYPOTHESIS_ALIASES)) {
    return { src: "/hypotheses/media-hero.jpg", pos: "66% 16%" };
  }
  if (matchesHypothesisTitle(value, TWINLABS_HYPOTHESIS_TITLE, TWINLABS_HYPOTHESIS_ALIASES)) {
    return { src: "/hypotheses/twinlabs-hero.jpg", pos: "60% 20%" };
  }
  return { src: "/hypotheses/sofia-rules.png", pos: "50% 18%" };
}

export function hypothesisRank(title: string): HypothesisRank | null {
  const seed = findHypothesisCatalogSeed(title);
  if (!seed || (seed.tier !== "must" && seed.tier !== "want")) return null;
  const peers = DESIGN_HYPOTHESES.filter((item) => item.tier === seed.tier);
  const idx = Math.max(0, peers.findIndex((item) => item.title === seed.title));
  if (seed.tier === "must") {
    const tones: HypothesisRankTone[] = ["main", "two", "three", "four"];
    return { label: `Обязательная · ${idx + 1}`, tone: tones[Math.min(idx, tones.length - 1)] ?? "main" };
  }
  return { label: `Желательная · ${idx + 1}`, tone: "side" };
}

export function hypothesisPage(title: string): HypothesisPageProfile | null {
  const value = title.trim();
  if (matchesHypothesisTitle(value, ROSTOV_HYPOTHESIS_TITLE, ROSTOV_HYPOTHESIS_ALIASES)) {
    return {
      body: ROSTOV_HYPOTHESIS_BODY,
      criterion: ROSTOV_HYPOTHESIS_CRITERION,
      workspace: rostovHypothesisWorkspace,
    };
  }
  if (matchesHypothesisTitle(value, TWINLABS_HYPOTHESIS_TITLE, TWINLABS_HYPOTHESIS_ALIASES)) {
    return {
      body: TWINLABS_HYPOTHESIS_BODY,
      criterion: TWINLABS_HYPOTHESIS_CRITERION,
      priority: TWINLABS_HYPOTHESIS_PRIORITY,
      workspace: twinlabsHypothesisWorkspace,
    };
  }
  if (matchesHypothesisTitle(value, QMAGIC_HYPOTHESIS_TITLE, QMAGIC_HYPOTHESIS_ALIASES)) {
    return {
      body: QMAGIC_HYPOTHESIS_BODY,
      criterion: "",
      workspace: qmagicHypothesisWorkspace,
    };
  }
  if (matchesHypothesisTitle(value, MEDIA_HYPOTHESIS_TITLE, MEDIA_HYPOTHESIS_ALIASES)) {
    return {
      body: MEDIA_HYPOTHESIS_BODY,
      criterion: "",
      workspace: mediaHypothesisWorkspace,
    };
  }
  if (value === ADS_HYPOTHESIS_TITLE) {
    return {
      body: ADS_HYPOTHESIS_BODY,
      criterion: ADS_HYPOTHESIS_CRITERION,
      workspace: adsHypothesisWorkspace,
    };
  }
  return null;
}

export function rostovHypothesisWorkspace(): HypothesisWorkspace {
  return {
    stages: [
      {
        id: "st-business",
        title: "Разобраться с бизнесом",
        note: "",
        tasks: [
          {
            id: "tk-buyers",
            title: "Узнать у брата и родителей Что чаще покупают и заказывают повторно.",
            detail: "",
            done: false,
            goal: null,
            n: 0,
          },
          {
            id: "tk-role",
            title: "Договориться с братом о роли",
            detail: "",
            done: false,
            goal: null,
            n: 0,
          },
        ],
      },
      {
        id: "st-offer",
        title: "Подготовить оффер",
        note: "",
        tasks: [
          { id: "tk-set", title: "Создать дегустационный набор", detail: "", done: false, goal: null, n: 0 },
          { id: "tk-copy", title: "Прописать тексты на сайт", detail: "", done: false, goal: null, n: 0 },
        ],
      },
      {
        id: "st-site",
        title: "Подготовить сайт",
        note: "",
        tasks: [
          {
            id: "tk-shop",
            title: "Завайбкодить интернет-магазин",
            detail:
              "Дегустационный сет, без регистрации, подтверждение заказа по телефону. Надпись: Точную сумму подтвердим после взвешивания. Показывать районы и даты доставок. Предзапись для районов, где доставки пока нет.",
            done: false,
            goal: null,
            n: 0,
          },
        ],
      },
      {
        id: "st-reels",
        title: "Ролики",
        note: "Первые 12 роликов — разные форматы.\nСледующие 18 — преимущественно продолжения лучших.\nВыкладываю на все платформы",
        tasks: [
          { id: "tk-plan", title: "Контент-план утвердить", detail: "", done: false, goal: null, n: 0 },
          {
            id: "tk-gear",
            title: "Купить оборудование (петличка/штатив и тд)",
            detail: "",
            done: false,
            goal: null,
            n: 0,
          },
          { id: "tk-shoot", title: "Снять ролики", detail: "", done: false, goal: null, n: 0 },
          { id: "tk-publish", title: "Выпустить 30 роликов", detail: "", done: false, goal: 30, n: 0 },
        ],
      },
      {
        id: "st-ugc",
        title: "Параллельно проверить UGC",
        note: "",
        tasks: [
          {
            id: "tk-ugc",
            title: "Первая волна: 3 автора × 1 материал.",
            detail: "",
            done: false,
            goal: 3,
            n: 0,
          },
        ],
      },
    ],
    files: [
      { name: "Контент-план", href: ROSTOV_CONTENT_PLAN_HREF },
      { name: "UGC-креаторы", href: ROSTOV_UGC_HREF },
    ],
    notes: [],
    ideas: [],
    copies: [],
    econ: null,
  };
}

export function twinlabsHypothesisWorkspace(): HypothesisWorkspace {
  return {
    stages: [
      {
        id: "tw-offer",
        title: "Определиться с предложением",
        note: "Сейчас оффер слабый и непонятный.\nКлиент не понимает, почему постоянная поддержка лучше разовых заказов.",
        tasks: [],
      },
      {
        id: "tw-pack",
        title: "Подготовить упаковку",
        note: "",
        tasks: [
          task("tw-works", "Собрать лучшие работы"),
          task("tw-kp", "Собрать короткое КП с преимуществами, кейсами, процессом и примерами стоимости."),
          task("tw-showreel", "Сделать портфолио/шоурил с лучшими работами и примерами быстрого выполнения задач."),
          task("tw-templates", "Подготовить шаблоны персонализированных сообщений."),
        ],
      },
      {
        id: "tw-sales",
        title: "Запустить продажи",
        note: "",
        tasks: [
          task("tw-base", "Собрать базу 20–30 продюсеров, онлайн-школ и экспертов.", 30),
          task("tw-send", "Отправить 20–30 персональных предложений, в том числе через партнёров.", 30),
          task("tw-reactivate", "Точечно реактивировать постоянников"),
        ],
      },
    ],
    files: [],
    notes: [],
    ideas: [],
    copies: [],
    econ: null,
  };
}

export function qmagicHypothesisWorkspace(): HypothesisWorkspace {
  return {
    stages: [
      {
        id: "qm-important",
        title: "Что важно о сервисе",
        note: "Удобство использования. Пользователь не должен думать, какое ИИ использовать и какую модель. Он пишет простое сообщение, а система сама запускает необходимый воркфлоу.\n\nСистема помнит особенности бренда и что нравится, а что не нравится заказчику.\n\nОна усилена моими дизайнерскими навыками, создан сильный дизайн-скилл.\n\nОбязательно: совместная работа команды в агенте — маркетологи, продуктологи и другие роли генерируют в едином стиле.",
        tasks: [],
      },
      {
        id: "qm-tasks",
        title: "Задачи",
        note: "",
        tasks: [
          task("qm-concept", "Определить концепт МВП"),
          task("qm-audience", "Выбрать главную целевую аудиторию и главную задачу"),
          task("qm-mvp", "Создать МВП"),
          task("qm-test", "Протестировать"),
        ],
      },
    ],
    files: [],
    notes: [],
    ideas: [],
    copies: [],
    econ: null,
  };
}

export function mediaHypothesisWorkspace(): HypothesisWorkspace {
  return {
    stages: [
      {
        id: "md-cadence",
        title: "Как выпускаем",
        note: "2 ютуб-ролика в месяц.\n1 карусель в неделю.\n2 рилса в неделю.",
        tasks: [],
      },
      {
        id: "md-reality",
        title: "Реалити",
        note: "Под каждый ролик — ссылка на предзапись Neuroskills.",
        tasks: [
          task(
            "md-neuroskills-page",
            "Сделать страницу предзаписи Neuroskills",
            null,
            "Лендинг предзаписи школы по ИИ. Вставлять под каждый ролик, собирать интересующихся: для кого курс и анкета."
          ),
          task(
            "md-reality-1",
            "Реалити №1: ИИ отобрал работу",
            null,
            "Рассказать о ситуации и гипотезах. Школу по ИИ запустить (уже 600к заработал) — оставить анкету предзаписи, для кого будет. Агентство перевернуть в маркетинг. Запустить Qmagic. Колбасу. Буду пробовать тестировать и показывать."
          ),
          task(
            "md-reality-2",
            "Реалити №2: сколько заработал вместе с ИИ",
            null,
            "Рассказать о Soul, квартиранте, презе за 60к, сайте за 30к. Показать в целом все работы, что сделал за месяц."
          ),
        ],
      },
      {
        id: "md-youtube",
        title: "Ютуб",
        note: "",
        tasks: [
          task("md-yt-scripts", "Написать сценарии ютуб"),
          task("md-yt-shoot", "Снять ролики ютуб"),
          task("md-yt-edit", "Смонтировать ролики"),
          task("md-yt-publish", "Выложить"),
        ],
      },
      {
        id: "md-insta",
        title: "Инста",
        note: "",
        tasks: [
          task("md-ig-plan", "Придумать контент-план"),
          task("md-ig-scripts", "Написать сценарии роликов"),
          task("md-ig-shoot", "Снять ролики"),
          task("md-ig-publish", "Выложить ролики"),
          task("md-ig-carousel-plan", "Придумать контент-план каруселей"),
          task("md-ig-carousel-script", "Написать сценарий каруселей"),
          task("md-ig-carousel-design", "Задизайнить карусели"),
          task("md-ig-carousel-publish", "Выложить карусели"),
        ],
      },
    ],
    files: [],
    notes: [],
    ideas: [],
    copies: [],
    econ: null,
  };
}

/** Добавляет в сохранённый workspace недостающие стадии/задачи из сида (по id). */
export function mergeHypothesisSeed(
  current: HypothesisWorkspace,
  seed: HypothesisWorkspace
): HypothesisWorkspace {
  const next: HypothesisWorkspace = {
    stages: current.stages.map((stage) => ({
      ...stage,
      tasks: stage.tasks.map((item) => ({ ...item })),
    })),
    files: [...current.files],
    notes: [...current.notes],
    ideas: [...current.ideas],
    copies: [...current.copies],
    econ: current.econ,
  };
  const stageById = new Map(next.stages.map((stage) => [stage.id, stage]));
  for (const seedStage of seed.stages) {
    const existing = stageById.get(seedStage.id);
    if (!existing) {
      next.stages.push({
        ...seedStage,
        tasks: seedStage.tasks.map((item) => ({ ...item })),
      });
      continue;
    }
    if (!existing.note.trim() && seedStage.note.trim()) existing.note = seedStage.note;
    const taskIds = new Set(existing.tasks.map((item) => item.id));
    for (const seedTask of seedStage.tasks) {
      if (!taskIds.has(seedTask.id)) existing.tasks.push({ ...seedTask });
    }
  }
  return next;
}

export function adsHypothesisWorkspace(): HypothesisWorkspace {
  return {
    stages: [
      {
        id: "ads-tasks",
        title: "Задачи",
        note: "",
        tasks: [
          task("ads-partners", "Найти директологов и договориться с партнёрами"),
          task("ads-clients", "Прописать всем старым клиентам"),
        ],
      },
    ],
    files: [],
    notes: [],
    ideas: [],
    copies: [
      {
        id: "ads-roles",
        title: "Как делим работу",
        text: "Я продаю услугу, общаюсь с клиентом, занимаюсь сайтом и упаковкой. Специалист настраивает и оптимизирует рекламу.",
      },
      {
        id: "ads-usp",
        title: "УТП для партнёра",
        text: "У меня большая база клиентов, буду всем писать, хочу маркетинговое агентство строить. Вам буду заказы отдавать и платить за проект.",
      },
      {
        id: "ads-clients-copy",
        title: "Что писать заказчикам",
        text: "Всем прописать, спросить, чем занимаются и какие результаты, и сказать, что теперь занимаемся и рекламой.",
      },
      {
        id: "ads-where",
        title: "Где искать",
        text: "В каталоге сертифицированных специалистов Яндекса, профильных Telegram-сообществах директологов и по рекомендациям владельцев небольших агентств.",
      },
      {
        id: "ads-check",
        title: "Что обязательно проверить",
        text: "2–3 реальных кейса с расходами, заявками и результатами, а не только скриншоты охватов.",
      },
    ],
    econ: {
      id: "ads-econ",
      title: "Пример экономики одного клиента",
      kicker: "Целевые цены для переговоров, не гарантированные рыночные ставки",
      launch: [
        { label: "Клиент платит за запуск", value: "40 000 ₽" },
        { label: "Директологу за запуск", value: "20 000 ₽" },
      ],
      launchRest: {
        title: "Остаток TwinLabs",
        note: "До налогов, продаж и других затрат",
        value: "20 000 ₽",
      },
      month: [
        { label: "Ведение клиенту / мес.", value: "35 000 ₽" },
        { label: "Директологу / мес.", value: "20 000 ₽" },
      ],
      monthRest: {
        title: "Остаток TwinLabs в месяц",
        note: "До прочих расходов",
        value: "15 000 ₽",
      },
      footnote:
        "Рекламный бюджет клиента оплачивается отдельно. Первый пилот нужен в том числе для проверки, оправдывают ли эти 15 тыс. ₽ твою работу и ответственность.",
    },
  };
}

export function sanitizeHypothesisWorkspace(input: unknown): HypothesisWorkspace {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const stages = Array.isArray(raw.stages) ? raw.stages.slice(0, 40) : [];
  const files = Array.isArray(raw.files) ? raw.files.slice(0, 40) : [];
  const notes = Array.isArray(raw.notes) ? raw.notes.slice(0, 200) : [];
  const ideas = Array.isArray(raw.ideas) ? raw.ideas.slice(0, 200) : [];
  const copies = Array.isArray(raw.copies) ? raw.copies.slice(0, 40) : [];
  return {
    stages: stages.map((stage, stageIndex) => {
      const row = stage && typeof stage === "object" ? (stage as Record<string, unknown>) : {};
      const tasks = Array.isArray(row.tasks) ? row.tasks.slice(0, 80) : [];
      return {
        id: id(row.id, `st-${stageIndex}`),
        title: text(row.title, 200),
        note: text(row.note, 2000),
        tasks: tasks.map((task, taskIndex) => {
          const item = task && typeof task === "object" ? (task as Record<string, unknown>) : {};
          const goalRaw = Number(item.goal);
          const goal = Number.isFinite(goalRaw) && goalRaw > 0 ? Math.min(9999, Math.floor(goalRaw)) : null;
          const nRaw = Number(item.n);
          const n = Number.isFinite(nRaw) && nRaw > 0 ? Math.min(goal ?? 9999, Math.floor(nRaw)) : 0;
          return {
            id: id(item.id, `tk-${stageIndex}-${taskIndex}`),
            title: text(item.title, 400),
            detail: text(item.detail, 2000),
            done: Boolean(item.done),
            goal,
            n,
          };
        }),
      };
    }),
    files: files.map((file) => {
      const row = file && typeof file === "object" ? (file as Record<string, unknown>) : {};
      return { name: text(row.name, 120).trim(), href: text(row.href, 300).trim() };
    }).filter((file) => file.name && file.href),
    notes: notes.map((note, index) => {
      const row = note && typeof note === "object" ? (note as Record<string, unknown>) : {};
      const tag = TAGS.has(row.tag as HypothesisNoteTag) ? (row.tag as HypothesisNoteTag) : "obs";
      return {
        id: id(row.id, `nt-${index}`),
        tag,
        text: text(row.text, 2000),
        date: text(row.date, 40),
      };
    }).filter((note) => note.text.trim()),
    ideas: ideas.map((idea, index) => {
      const row = idea && typeof idea === "object" ? (idea as Record<string, unknown>) : {};
      return {
        id: id(row.id, `id-${index}`),
        text: text(row.text, 400),
        archived: Boolean(row.archived),
      };
    }).filter((idea) => idea.text.trim()),
    copies: copies
      .map((block, index) => {
        const row = block && typeof block === "object" ? (block as Record<string, unknown>) : {};
        return {
          id: id(row.id, `cp-${index}`),
          title: text(row.title, 200),
          text: text(row.text, 4000),
        };
      })
      .filter((block) => block.title.trim() || block.text.trim()),
    econ: sanitizeEcon(raw.econ),
  };
}

function money(value: unknown): HypothesisMoney {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return { label: text(row.label, 120), value: text(row.value, 40) };
}

function econRest(value: unknown): HypothesisEconRest {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return { title: text(row.title, 160), note: text(row.note, 240), value: text(row.value, 40) };
}

function sanitizeEcon(value: unknown): HypothesisEconBlock | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const launch = Array.isArray(row.launch) ? row.launch : [];
  const month = Array.isArray(row.month) ? row.month : [];
  if (launch.length < 2 || month.length < 2) return null;
  return {
    id: id(row.id, "econ"),
    title: text(row.title, 200),
    kicker: text(row.kicker, 300),
    launch: [money(launch[0]), money(launch[1])],
    launchRest: econRest(row.launchRest),
    month: [money(month[0]), money(month[1])],
    monthRest: econRest(row.monthRest),
    footnote: text(row.footnote, 800),
  };
}

export function parseTaskDraft(raw: string): { title: string; goal: number | null } {
  const value = raw.trim();
  const match = value.match(/^(.*?)\s*[×x]\s*(\d+)$/i);
  if (!match) return { title: value, goal: null };
  const goal = Number(match[2]);
  if (!Number.isFinite(goal) || goal <= 0) return { title: value, goal: null };
  return { title: match[1].trim(), goal: Math.min(9999, Math.floor(goal)) };
}
