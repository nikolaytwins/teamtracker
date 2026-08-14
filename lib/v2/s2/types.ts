export type S2SprintStatus = "active" | "closed";
export type S2GoalStatus = "deficit" | "building" | "stable" | "observing";
export type S2EngineMode = "active" | "passive" | "protected" | "testing" | "deferred";
export type S2SpotlightKey = "support" | "magnet" | "asymmetry" | "meaning";
export type S2BetStatus =
  | "draft"
  | "testing"
  | "continue"
  | "scale"
  | "change"
  | "stop"
  | "need_data";
export type S2BetFront = "hiring" | "saas" | "media" | "agency" | "arkalium" | "other";
export type S2DecisionStatus = "resolved" | "deferred" | "need_data";
export type S2BacklogCategory = "product" | "content" | "opportunity" | "life" | "question";
export type S2EvidenceType =
  | "positive"
  | "negative"
  | "neutral"
  | "market"
  | "money"
  | "people"
  | "content"
  | "product"
  | "energy";
export type S2EvidenceWeight = "weak" | "medium" | "strong";
export type S2SignalType = "returns" | "positive" | "negative" | "opportunity" | "fire";

export type S2SprintStage = { title: string; role: string; example: string };

export type S2Sprint = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  next_review_date: string | null;
  core_question: string;
  meta_principle: string;
  main_task: string;
  success_criterion: string;
  status: S2SprintStatus;
  stages: S2SprintStage[];
};

export type S2Goal = {
  id: string;
  title: string;
  essence: string;
  why_important: string;
  examples: string;
  anti_distortion: string;
  status: S2GoalStatus;
  sort_order: number;
  spotlight: boolean;
};

export type S2Engine = {
  id: string;
  title: string;
  function_text: string;
  not_for: string;
  good_scenario: string;
  red_line: string;
  mode: S2EngineMode;
  metrics: string;
  spotlight_key: S2SpotlightKey | null;
  sort_order: number;
};

export type S2Bet = {
  id: string;
  sprint_id: string | null;
  engine_id: string | null;
  title: string;
  hypothesis: string;
  why: string;
  minimal_test: string;
  sufficient_action: string;
  success_signals: string;
  fail_signals: string;
  threshold: string;
  next_action: string;
  front: S2BetFront;
  status: S2BetStatus;
  review_date: string | null;
  sort_order: number;
};

export type S2Rule = {
  id: string;
  trigger: string;
  old_pattern: string;
  instruction: string;
  why: string;
  examples: string;
  antipattern_id: string | null;
  sort_order: number;
};

export type S2AntiPattern = {
  id: string;
  title: string;
  manifestation: string;
  antidote: string;
  sort_order: number;
};

export type S2Decision = {
  id: string;
  question: string;
  status: S2DecisionStatus;
  position: string;
  why: string;
  needed_data: string;
  revisit_date: string | null;
  sort_order: number;
};

export type S2BacklogItem = {
  id: string;
  title: string;
  category: S2BacklogCategory;
  why_interesting: string;
  source: string;
  activation_trigger: string;
  created_at: string;
};

export type S2Constraint = { id: string; title: string; sort_order: number };

export type S2MonthOutcome = {
  id: string;
  year: number;
  month: number;
  title: string;
  done: boolean;
  sort_order: number;
};

export type S2Evidence = {
  id: string;
  bet_id: string | null;
  engine_id: string | null;
  happened_on: string;
  type: S2EvidenceType;
  fact: string;
  interpretation: string;
  weight: S2EvidenceWeight;
  next_action: string;
  created_at: string;
};

export type S2Signal = {
  id: string;
  type: S2SignalType;
  text: string;
  bet_id: string | null;
  created_at: string;
};

export type S2Prana = {
  id: string;
  week_start: string;
  training_count: number;
  walk: boolean;
  white_window: boolean;
  social: boolean;
  creative: boolean;
};

export type S2Review = {
  id: string;
  sprint_id: string | null;
  summary: string;
  next_architecture: string;
  created_at: string;
};

export type S2Board = {
  sprint: S2Sprint | null;
  goals: S2Goal[];
  engines: S2Engine[];
  bets: S2Bet[];
  rules: S2Rule[];
  antipatterns: S2AntiPattern[];
  decisions: S2Decision[];
  backlog: S2BacklogItem[];
  constraints: S2Constraint[];
  monthOutcomes: S2MonthOutcome[];
  evidence: S2Evidence[];
  signals: S2Signal[];
  prana: S2Prana | null;
  reviews: S2Review[];
};

export const S2_GOAL_STATUS: Record<S2GoalStatus, string> = {
  deficit: "В дефиците",
  building: "Строится",
  stable: "Стабильно",
  observing: "Наблюдаем",
};

export const S2_ENGINE_MODE: Record<S2EngineMode, string> = {
  active: "Active",
  passive: "Passive",
  protected: "Protected",
  testing: "Testing",
  deferred: "Deferred",
};

export const S2_BET_STATUS: Record<S2BetStatus, string> = {
  draft: "Черновик",
  testing: "Testing",
  continue: "Continue",
  scale: "Scale",
  change: "Change",
  stop: "Stop",
  need_data: "Need data",
};

export const S2_BET_FRONT: Record<S2BetFront, string> = {
  hiring: "Найм",
  saas: "SaaS",
  media: "Медийка",
  agency: "Агентство",
  arkalium: "Аркалиум",
  other: "Другое",
};

export const S2_DECISION_STATUS: Record<S2DecisionStatus, string> = {
  resolved: "Решено",
  deferred: "Отложено",
  need_data: "Нужны данные",
};

export const S2_BACKLOG_CATEGORY: Record<S2BacklogCategory, string> = {
  product: "Продукты / SaaS",
  content: "Контент",
  opportunity: "Возможности",
  life: "Жизнь",
  question: "Вопросы к review",
};

export const S2_EVIDENCE_TYPE: Record<S2EvidenceType, string> = {
  positive: "Позитив",
  negative: "Негатив",
  neutral: "Нейтрально",
  market: "Рынок",
  money: "Деньги",
  people: "Люди",
  content: "Контент",
  product: "Продукт",
  energy: "Энергия",
};

export const S2_EVIDENCE_WEIGHT: Record<S2EvidenceWeight, string> = {
  weak: "Слабый",
  medium: "Средний",
  strong: "Сильный",
};

export const S2_SIGNAL_TYPE: Record<S2SignalType, string> = {
  returns: "Само вернулось",
  positive: "Позитивный",
  negative: "Негативный",
  opportunity: "Возможность",
  fire: "Что-то зажгло",
};

export const S2_SPOTLIGHT: Record<S2SpotlightKey, { label: string; now: string }> = {
  support: {
    label: "Опора",
    now: "Активная финансовая опора. Сейчас: поиск подходящего найма. Минимум 200k; целевой коридор 250–300k. Критерий: после работы остается психический ресурс.",
  },
  magnet: {
    label: "Магнит",
    now: "Медийность / публичное поле. Сейчас: YouTube как основной канал; Instagram — производное.",
  },
  asymmetry: {
    label: "Асимметрия",
    now: "Один активный SaaS validation. Сейчас: Qmagic.",
  },
  meaning: {
    label: "Смысл",
    now: "Аркалиум как защищенное авторство / IP. Не обязан окупаться сейчас.",
  },
};

export const S2_CONSTITUTION = [
  "Я могу сильно хотеть то, к чему пока не знаю дороги.",
  "«Я не вижу как» не означает «это невозможно».",
  "«Сейчас» не означает «навсегда».",
  "Если данных недостаточно, я имею право сказать «я пока не знаю».",
  "Если могу сделать больше — это не значит, что должен.",
  "Я больше не использую себя как расходный материал для будущей жизни.",
  "Нехватку ресурса сначала решает система, а не мой дополнительный вечер.",
  "Чужая потребность и чужая эмоция не становятся автоматически моей обязанностью.",
  "Не каждое желание требует реализации; не каждая мысль требует вывода; не каждая проблема требует решения сегодня.",
  "Один факт не имеет права становиться приговором всей моей жизни.",
  "Я провожу эксперименты и позволяю реальности отвечать вместо попытки предсказать все заранее.",
  "Мое ядро — придумывать то, чего еще нет, и превращать идею в реальность. Формы могут меняться.",
  "Одновременно я даю реальное действие ограниченному числу ставок.",
  "Не вся энергия должна быть инвестирована в будущее. Часть принадлежит сегодняшней жизни.",
  "Мне нужны жесткие берега и текучая жизнь внутри них.",
  "Я могу действовать быстро, не живя внутренне в спешке.",
  "Спокойствие — не отсутствие мощности, а отсутствие лишнего трения.",
  "Я оцениваю не только результат системы, но и то, какого человека она делает из меня.",
  "Я могу вместить противоречащие желания, не заставляя себя немедленно назначить победителя.",
  "Моя задача ближайших месяцев — маленькие осмысленные действия и контакт с реальностью, а не доказательство судьбы.",
];

export const S2_ACTIVE_BET_STATUSES: S2BetStatus[] = ["testing", "continue", "scale"];
export const S2_MAX_ACTIVE_BETS = 6;
export const S2_SINGLE_FRONT: S2BetFront[] = ["hiring", "saas", "media"];

export type S2Entity =
  | "sprint"
  | "goal"
  | "engine"
  | "bet"
  | "rule"
  | "antipattern"
  | "decision"
  | "backlog"
  | "constraint"
  | "month_outcome"
  | "evidence"
  | "signal"
  | "prana"
  | "review";
