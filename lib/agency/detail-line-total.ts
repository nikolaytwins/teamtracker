export type AgencyDetailBillingType = "fixed" | "hourly";

export type AgencyDetailLineInput = {
  billingType?: AgencyDetailBillingType | string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  trackedSeconds?: number | null;
};

/** Сумма строки детализации: фикс = qty×price, hourly = часы×ставка проекта. */
export function agencyDetailLineTotal(
  detail: AgencyDetailLineInput,
  hourlyRateRub: number,
  opts?: { liveElapsedSeconds?: number }
): number {
  const billing = detail.billingType === "hourly" ? "hourly" : "fixed";
  if (billing === "hourly") {
    const tracked = Math.max(0, Number(detail.trackedSeconds) || 0);
    const live = Math.max(0, opts?.liveElapsedSeconds ?? 0);
    const hours = (tracked + live) / 3600;
    return hours * (Number(hourlyRateRub) || 0);
  }
  return (Number(detail.quantity) || 0) * (Number(detail.unitPrice) || 0);
}

export function agencyDetailEffectiveSeconds(
  detail: { trackedSeconds?: number | null; timerStartedAt?: string | null },
  nowMs: number = Date.now()
): number {
  const tracked = Math.max(0, Number(detail.trackedSeconds) || 0);
  if (!detail.timerStartedAt) return tracked;
  const started = Date.parse(detail.timerStartedAt);
  if (Number.isNaN(started)) return tracked;
  return tracked + Math.max(0, Math.floor((nowMs - started) / 1000));
}

export function formatAgencyDetailHours(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h <= 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}
