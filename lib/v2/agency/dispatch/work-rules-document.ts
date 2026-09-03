import type { DispatchRulesPayload } from "@/lib/v2/agency/dispatch/dispatch-types";

export type WorkRulesCapCard = {
  n: string;
  v: string;
  l: string;
  note?: string;
  acc?: boolean;
};

export type WorkRulesTier = {
  v: string;
  l: string;
  w: number;
  c?: string;
};

export type WorkRulesGoal = {
  v: string;
  l: string;
  acc?: boolean;
};

export type WorkRulesAgreement = {
  i: string;
  t: string;
};

export type WorkRulesDocument = {
  cap: WorkRulesCapCard[];
  tiers: WorkRulesTier[];
  rateRule: string;
  goals: WorkRulesGoal[];
  moneyRule: string;
  agr: WorkRulesAgreement[];
  steps: string[];
  prioFinal: string;
};

export const DEFAULT_WORK_RULES_DOCUMENT: WorkRulesDocument = {
  cap: [
    {
      n: "Проектный день",
      v: "до 4 часов",
      l: "заранее планируемой клиентской работы",
      note: "Это не весь рабочий день, а объём, который можно безопасно обещать клиентам.",
      acc: true,
    },
    {
      n: "Стратегия",
      v: "1 день в неделю",
      l: "подвижный стратегический день",
      note: "День можно перенести внутри недели, но он не должен исчезать.",
    },
    {
      n: "Творческий день",
      v: "1 день в неделю",
      l: "защищённый творческий день",
      note: "",
    },
    {
      n: "Резерв",
      v: "20%",
      l: "под сопровождение и внезапные хвосты",
      note: "Резерв не считается свободным временем для продажи нового проекта.",
    },
  ],
  tiers: [
    { v: "4 000 ₽/ч", l: "нижний порог", w: 46, c: "h" },
    { v: "5 000 ₽/ч", l: "целевая ставка", w: 66, c: "t" },
    { v: "6 000 ₽/ч", l: "срочная или особенно ценная работа", w: 86, c: "" },
  ],
  rateRule: "Если ставка ниже 4 000 ₽/ч, нужно изменить цену, объём или срок.",
  goals: [
    { v: "170 000 ₽", l: "минимальная надёжная прибыль" },
    { v: "200 000 ₽", l: "желательная плановая прибыль", acc: true },
  ],
  moneyRule:
    "Когда оба ориентира достигнуты и проекты помещаются в календарь, стратегия и творческий день становятся важнее обычного нового заказа.",
  agr: [
    { i: "bolt", t: "Срочность оплачивается отдельно." },
    { i: "swap", t: "Изменение концепции меняет цену или срок." },
    { i: "clock", t: "Поздняя обратная связь переносит следующие сроки." },
    { i: "list", t: "Новое сообщение не становится первым в очереди только из-за слова «срочно»." },
    { i: "star", t: "Важный клиент может получить исключение, но не безлимитный доступ." },
    { i: "flag", t: "Перенос обещанного дедлайна требует отдельного решения." },
  ],
  steps: [
    "Что реально сломается или остановится?",
    "Какое обещание уже дано?",
    "Что действительно нужно сделать раньше?",
    "Помещается ли новая работа в резерв?",
    "Что придётся вытеснить: другой проект, стратегию или творческий день?",
  ],
  prioFinal: "Тревога клиента — повод проверить ситуацию, но не автоматический приоритет.",
};

function parseRub(s: string): number | null {
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function parseHours(s: string): number | null {
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]!.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parsePercent(s: string): number | null {
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!m) return null;
  const n = Number(m[1]!.replace(",", "."));
  return Number.isFinite(n) ? n / 100 : null;
}

export function normalizeWorkRulesDocument(raw: unknown): WorkRulesDocument {
  const base = DEFAULT_WORK_RULES_DOCUMENT;
  if (!raw || typeof raw !== "object") return structuredClone(base);
  const o = raw as Partial<WorkRulesDocument>;
  return {
    cap: Array.isArray(o.cap) && o.cap.length ? (o.cap as WorkRulesCapCard[]) : base.cap,
    tiers: Array.isArray(o.tiers) && o.tiers.length ? (o.tiers as WorkRulesTier[]) : base.tiers,
    rateRule: typeof o.rateRule === "string" ? o.rateRule : base.rateRule,
    goals: Array.isArray(o.goals) && o.goals.length ? (o.goals as WorkRulesGoal[]) : base.goals,
    moneyRule: typeof o.moneyRule === "string" ? o.moneyRule : base.moneyRule,
    agr: Array.isArray(o.agr) && o.agr.length ? (o.agr as WorkRulesAgreement[]) : base.agr,
    steps: Array.isArray(o.steps) && o.steps.length ? o.steps.map(String) : base.steps,
    prioFinal: typeof o.prioFinal === "string" ? o.prioFinal : base.prioFinal,
  };
}

/** Синхронизирует числовые поля dispatch rules из карточек UI. */
export function syncWorkRulesToRules(
  doc: WorkRulesDocument,
  base: DispatchRulesPayload
): DispatchRulesPayload {
  const hours = parseHours(doc.cap[0]?.v ?? "");
  const reserve = parsePercent(doc.cap[3]?.v ?? "");
  const rates = doc.tiers.map((t) => parseRub(t.v));
  const goals = doc.goals.map((g) => parseRub(g.v));
  return {
    ...base,
    capacity: {
      plannedHoursPerDay: hours ?? base.capacity.plannedHoursPerDay,
      reserveShare: reserve ?? base.capacity.reserveShare,
    },
    pricing: {
      ...base.pricing,
      minEffectiveRateRub: rates[0] ?? base.pricing.minEffectiveRateRub,
      targetEffectiveRateRub: rates[1] ?? base.pricing.targetEffectiveRateRub,
      urgentEffectiveRateRub: rates[2] ?? base.pricing.urgentEffectiveRateRub,
    },
    finance: {
      ...base.finance,
      reliableProfitMinRub: goals[0] ?? base.finance.reliableProfitMinRub,
      plannedProfitTargetRub: goals[1] ?? base.finance.plannedProfitTargetRub,
    },
  };
}

export function rulesJsonWithWorkRules(rules: DispatchRulesPayload, workRules: WorkRulesDocument) {
  return {
    capacity: rules.capacity,
    protected: rules.protected,
    pricing: rules.pricing,
    finance: rules.finance,
    workRules,
  };
}
