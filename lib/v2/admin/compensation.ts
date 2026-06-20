export type TtPayType = "hourly" | "monthly" | "deal";

export const PAY_TYPE_LABELS: Record<TtPayType, string> = {
  hourly: "Почасовая",
  monthly: "Оклад",
  deal: "Сделка",
};

export function normalizePayType(raw: string | null | undefined): TtPayType {
  if (raw === "monthly" || raw === "deal") return raw;
  return "hourly";
}

export type CompensationInput = {
  payType: TtPayType;
  hourlyRateRub: number | null;
  monthlySalaryRub: number | null;
  monthlyPaidRub: number | null;
  loggedSeconds: number;
};

export type CompensationResult = {
  monthCostRub: number | null;
  effectiveHourlyRub: number | null;
};

/** Расчёт стоимости и эффективной ставки за период по типу оплаты. */
export function computeCompensation(input: CompensationInput): CompensationResult {
  const hours = input.loggedSeconds / 3600;
  const { payType, hourlyRateRub, monthlySalaryRub, monthlyPaidRub } = input;

  if (payType === "monthly") {
    const cost = monthlySalaryRub;
    const effective = cost != null && hours > 0 ? Math.round(cost / hours) : null;
    return { monthCostRub: cost, effectiveHourlyRub: effective };
  }

  if (payType === "deal") {
    const cost = monthlyPaidRub;
    const effective = cost != null && hours > 0 ? Math.round(cost / hours) : null;
    return { monthCostRub: cost, effectiveHourlyRub: effective };
  }

  const cost = hourlyRateRub != null ? Math.round(hours * hourlyRateRub) : null;
  return { monthCostRub: cost, effectiveHourlyRub: hourlyRateRub };
}

export function fmtRub(value: number | null): string {
  if (value == null) return "—";
  return `${value.toLocaleString("ru-RU")} ₽`;
}
