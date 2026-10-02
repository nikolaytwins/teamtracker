import type { FinanceAllocationLine, FinanceAllocationPlan, FinanceAssistantMode } from "./types";

export const FINANCE_RULES = {
  salaryRub: 50_000,
  paymentsRub: 93_000,
  economyTotalRub: 170_000,
  normalTotalRub: 200_000,
  economyFreeRub: 77_000,
  normalFreeRub: 87_000,
  clothingRub: 5_000,
  giftsRub: 10_000,
  leraRub: 5_000,
  surplusToCushionShare: 0.8,
  surplusToFreeShare: 0.2,
} as const;

export const FINANCE_RULES_TEXT = [
  "Сначала отдельно откладываю зарплату 50 000 ₽ (обязательство бизнеса).",
  "Обязательные платежи жизни: 93 000 ₽ (аренда 59к + подписки ≈27к + метро 7к).",
  "Экономный месяц 170 000 ₽: платежи 93к + свободные 77к. Целевые фонды не пополняю.",
  "Нормальный месяц от 200 000 ₽: платежи 93к + свободные 87к + одежда 5к + подарки 10к + сюрпризы Лере 5к.",
  "Всё сверх 200 000 ₽: 80% в подушку/капитал, 20% дополнительно в свободные деньги.",
  "Если доступно меньше 170к — уменьшаю пополнение свободных денег на недостающую сумму.",
] as const;

function rub(n: number): string {
  return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
}

function line(
  key: FinanceAllocationLine["key"],
  label: string,
  amount_rub: number,
  fund_key?: string | null,
  note?: string
): FinanceAllocationLine {
  return { key, label, amount_rub: Math.max(0, Math.round(amount_rub)), fund_key: fund_key ?? null, note };
}

/** Разложить доступный личный доход по правилам финансовой системы. */
export function allocateAvailableIncome(availableRaw: number): FinanceAllocationPlan {
  const available = Math.max(0, Math.round(Number(availableRaw) || 0));
  const { paymentsRub, economyTotalRub, normalTotalRub, economyFreeRub, normalFreeRub, clothingRub, giftsRub, leraRub, surplusToCushionShare, surplusToFreeShare } =
    FINANCE_RULES;

  let mode: FinanceAssistantMode;
  let mode_label: string;
  let lines: FinanceAllocationLine[];

  if (available < economyTotalRub) {
    mode = "weak";
    mode_label = "Слабый месяц";
    const payments = Math.min(paymentsRub, available);
    const free = Math.max(0, available - payments);
    lines = [
      line("payments", "Обязательные платежи", payments, null, "аренда, подписки, метро"),
      line("free", "Свободные деньги", free, null, "еда, кофейни, выходы, покупки"),
      line("clothing", "Одежда", 0, "clothing", "не пополняю"),
      line("gifts", "Подарки", 0, "gifts", "не пополняю"),
      line("lera", "Сюрпризы Лере", 0, "lera", "не пополняю"),
      line("cushion", "Подушка / капитал", 0, "cushion", "после восстановления месяца"),
    ];
  } else if (available < normalTotalRub) {
    mode = "economy";
    mode_label = "Экономный режим";
    const leftover = available - economyTotalRub;
    lines = [
      line("payments", "Обязательные платежи", paymentsRub, null, "аренда, подписки, метро"),
      line("free", "Свободные деньги", economyFreeRub, null, "месячный лимит"),
      line("clothing", "Одежда", 0, "clothing", "не пополняю"),
      line("gifts", "Подарки", 0, "gifts", "не пополняю"),
      line("lera", "Сюрпризы Лере", 0, "lera", "не пополняю"),
      line("cushion", "Подушка / капитал", leftover, "cushion", leftover > 0 ? "остаток после 170к" : undefined),
    ];
  } else {
    mode = "normal";
    mode_label = "Нормальный режим";
    const surplus = available - normalTotalRub;
    const extraFree = Math.round(surplus * surplusToFreeShare);
    const toCushion = Math.round(surplus * surplusToCushionShare);
    lines = [
      line("payments", "Обязательные платежи", paymentsRub, null, "аренда, подписки, метро"),
      line("free", "Свободные деньги", normalFreeRub + extraFree, null, extraFree > 0 ? `87к + 20% сверх 200к (${rub(extraFree)})` : "месячный лимит"),
      line("clothing", "Одежда", clothingRub, "clothing"),
      line("gifts", "Подарки", giftsRub, "gifts"),
      line("lera", "Сюрпризы Лере", leraRub, "lera"),
      line("cushion", "Подушка / капитал", toCushion, "cushion", toCushion > 0 ? "80% сверх 200к" : "подушка уже в базе месяца"),
    ];
  }

  const total_allocated_rub = lines.reduce((s, l) => s + l.amount_rub, 0);
  const summary =
    mode === "weak"
      ? `При ${rub(available)} сначала закрываю платежи, свободные уменьшаю до ${rub(lines.find((l) => l.key === "free")?.amount_rub ?? 0)}. Целевые фонды не трогаю.`
      : mode === "economy"
        ? `При ${rub(available)} — экономный режим: 93к платежи + 77к свободные. Остаток ${rub(lines.find((l) => l.key === "cushion")?.amount_rub ?? 0)} — в подушку.`
        : `При ${rub(available)} — нормальный режим. База 200к на жизнь и фонды; сверх 200к делю 80/20.`;

  return {
    available_rub: available,
    mode,
    mode_label,
    lines,
    total_allocated_rub,
    summary,
  };
}

/** Достать сумму в рублях из фразы («заработал 250 тысяч», «доступно 180000»). */
export function parseAvailableRub(message: string): number | null {
  const cleaned = message.replace(/\u00a0/g, " ").toLowerCase();
  const withWord = cleaned.match(
    /(\d[\d\s]{0,12}(?:[.,]\d+)?)\s*(?:тыс(?:яч|ячи|ячу)?|к|тысяч|т\.?р\.?|₽|руб(?:лей|ля|ля)?)/i
  );
  if (withWord) {
    const raw = withWord[1]!.replace(/\s/g, "").replace(",", ".");
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    const unit = withWord[0].toLowerCase();
    if (/тыс|тысяч|\bк\b/.test(unit) && n < 10_000) return Math.round(n * 1000);
    return Math.round(n);
  }
  const bare = cleaned.match(/(?:заработал|доступно|получил|доход|прибыль|сумма)[^\d]{0,12}(\d[\d\s]{2,12})/);
  if (bare) {
    const n = Number(bare[1]!.replace(/\s/g, ""));
    if (Number.isFinite(n) && n >= 1000) return Math.round(n);
  }
  const onlyNumber = cleaned.trim().match(/^(\d[\d\s]{2,12})$/);
  if (onlyNumber) {
    const n = Number(onlyNumber[1]!.replace(/\s/g, ""));
    if (Number.isFinite(n) && n >= 1000) return Math.round(n);
  }
  return null;
}

export function formatPlanForPrompt(plan: FinanceAllocationPlan): string {
  const rows = plan.lines
    .filter((l) => l.amount_rub > 0 || l.key === "payments" || l.key === "free")
    .map((l) => `- ${l.label}: ${rub(l.amount_rub)}${l.note ? ` (${l.note})` : ""}`)
    .join("\n");
  return `${plan.mode_label}. Доступно ${rub(plan.available_rub)}.\n${rows}\nИтого: ${rub(plan.total_allocated_rub)}.`;
}
