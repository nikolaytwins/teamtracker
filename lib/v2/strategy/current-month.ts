import {
  STRATEGY_MONTH_FOCI,
  STRATEGY_NEAR_PROJECTS,
  STRATEGY_PRINCIPLES,
  type StrategyMonthFocus,
  type StrategyPrincipleCard,
  type StrategyProjectCard,
} from "@/lib/v2/strategy/board-content";

export const STRATEGY_RU_MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
] as const;

export function strategyMonthLabel(date = new Date()): string {
  return STRATEGY_RU_MONTHS[date.getMonth()];
}

export function findStrategyMonthFocus(monthLabel: string): StrategyMonthFocus | null {
  return STRATEGY_MONTH_FOCI.find((m) => m.month === monthLabel) ?? null;
}

/** Пауза Лила/Таро действует до 1 ноября 2026 включительно (запрет до этой даты). */
export function isLilaTarotBanActive(date = new Date()): boolean {
  return date < new Date(2026, 10, 1); // Nov 1 2026 local
}

export function activeStrategyBans(date = new Date()): StrategyPrincipleCard[] {
  if (!isLilaTarotBanActive(date)) return [];
  return STRATEGY_PRINCIPLES.filter((p) => p.emphasis === "ban");
}

export function strategyBoardSnapshot(date = new Date()): {
  monthLabel: string;
  currentFocus: StrategyMonthFocus | null;
  nextFocus: StrategyMonthFocus | null;
  bans: StrategyPrincipleCard[];
  principles: StrategyPrincipleCard[];
  nearProjects: StrategyProjectCard[];
} {
  const monthLabel = strategyMonthLabel(date);
  const idx = STRATEGY_MONTH_FOCI.findIndex((m) => m.month === monthLabel);
  const currentFocus =
    idx >= 0 ? STRATEGY_MONTH_FOCI[idx]! : findStrategyMonthFocus(monthLabel);
  const nextFocus =
    idx >= 0 && idx + 1 < STRATEGY_MONTH_FOCI.length
      ? STRATEGY_MONTH_FOCI[idx + 1]!
      : null;

  return {
    monthLabel,
    currentFocus,
    nextFocus,
    bans: activeStrategyBans(date),
    principles: STRATEGY_PRINCIPLES.filter((p) => p.emphasis !== "ban"),
    nearProjects: STRATEGY_NEAR_PROJECTS,
  };
}
