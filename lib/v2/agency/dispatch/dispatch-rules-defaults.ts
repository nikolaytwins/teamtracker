import type { DispatchRulesPayload } from "@/lib/v2/agency/dispatch/dispatch-types";

/** Начальные правила — семантика из docs/sofia-dispatch/03_WORK_RULES.md */
export const DEFAULT_DISPATCH_RULES: DispatchRulesPayload = {
  capacity: {
    plannedHoursPerDay: 4,
    reserveShare: 0.2,
  },
  protected: {
    strategyHoursPerWeek: 3,
    arkaliumDaysPerWeek: 1,
  },
  pricing: {
    minEffectiveRateRub: 4000,
    targetEffectiveRateRub: 5000,
    urgentEffectiveRateRub: 6000,
    webinarSlidesPerHour: 20,
  },
  finance: {
    reliableProfitMinRub: 170_000,
    plannedProfitTargetRub: 200_000,
    pauseProfitMinRub: 245_000,
  },
};

export function normalizeDispatchRules(raw: unknown): DispatchRulesPayload {
  const base = DEFAULT_DISPATCH_RULES;
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<DispatchRulesPayload>;
  return {
    capacity: {
      plannedHoursPerDay: num(o.capacity?.plannedHoursPerDay, base.capacity.plannedHoursPerDay),
      reserveShare: num(o.capacity?.reserveShare, base.capacity.reserveShare),
    },
    protected: {
      strategyHoursPerWeek: num(o.protected?.strategyHoursPerWeek, base.protected.strategyHoursPerWeek),
      arkaliumDaysPerWeek: num(o.protected?.arkaliumDaysPerWeek, base.protected.arkaliumDaysPerWeek),
    },
    pricing: {
      minEffectiveRateRub: num(o.pricing?.minEffectiveRateRub, base.pricing.minEffectiveRateRub),
      targetEffectiveRateRub: num(o.pricing?.targetEffectiveRateRub, base.pricing.targetEffectiveRateRub),
      urgentEffectiveRateRub: num(o.pricing?.urgentEffectiveRateRub, base.pricing.urgentEffectiveRateRub),
      webinarSlidesPerHour: num(o.pricing?.webinarSlidesPerHour, base.pricing.webinarSlidesPerHour),
    },
    finance: {
      reliableProfitMinRub: num(o.finance?.reliableProfitMinRub, base.finance.reliableProfitMinRub),
      plannedProfitTargetRub: num(o.finance?.plannedProfitTargetRub, base.finance.plannedProfitTargetRub),
      pauseProfitMinRub: num(o.finance?.pauseProfitMinRub, base.finance.pauseProfitMinRub ?? 245_000),
    },
  };
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
