export type AgencyDetailBillingType = "fixed" | "hourly";

export type AgencyDetailLineInput = {
  billingType?: AgencyDetailBillingType | string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  trackedSeconds?: number | null;
  totalOverrideRub?: number | null;
  /** Секунды на момент ручной суммы. Дальше таймер прибавляет только новое время. */
  totalOverrideSeconds?: number | null;
};

export function readTotalOverrideRub(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** `15 000`, `15000,5` → число. Пустая строка → null. Иначе null. */
export function parseAgencyDetailMoney(raw: string): number | null {
  const v = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function readTotalOverrideSeconds(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/**
 * Ручная сумма строки.
 * Если колонки `total_override_rub` нет, почасовая правка хранится в `unit_price`,
 * а секунды на этот момент — в `total_override_seconds`.
 */
export function agencyDetailManualTotalRub(detail: {
  billingType?: string | null;
  unitPrice?: number | null;
  totalOverrideRub?: unknown;
  totalOverrideSeconds?: unknown;
}): number | null {
  const direct = readTotalOverrideRub(detail.totalOverrideRub);
  if (direct != null) return direct;
  if (detail.billingType !== "hourly") return null;
  if (readTotalOverrideSeconds(detail.totalOverrideSeconds) == null) return null;
  const unit = Number(detail.unitPrice);
  return Number.isFinite(unit) ? unit : null;
}

/**
 * Сумма строки.
 * Фикс: ручная сумма, иначе qty×price.
 * По времени: ручная сумма плюс ставка за секунды после этой правки.
 * Без якоря секунд ручная сумма остаётся как есть — старые строки не прыгают.
 */
export function agencyDetailLineTotal(
  detail: AgencyDetailLineInput,
  hourlyRateRub: number,
  opts?: { liveElapsedSeconds?: number }
): number {
  const override = readTotalOverrideRub(detail.totalOverrideRub);
  const billing = detail.billingType === "hourly" ? "hourly" : "fixed";
  if (billing === "hourly") {
    const tracked = Math.max(0, Number(detail.trackedSeconds) || 0);
    const live = Math.max(0, opts?.liveElapsedSeconds ?? 0);
    const seconds = tracked + live;
    if (override != null) {
      const anchor = readTotalOverrideSeconds(detail.totalOverrideSeconds);
      const extra = anchor == null ? 0 : Math.max(0, seconds - anchor);
      return override + (extra / 3600) * (Number(hourlyRateRub) || 0);
    }
    return (seconds / 3600) * (Number(hourlyRateRub) || 0);
  }
  if (override != null) return override;
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

/** Живой таймер ЧЧ:ММ:СС */
export function formatAgencyDetailClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function agencyDetailSessionElapsedSeconds(
  timerStartedAt: string | null | undefined,
  nowMs: number = Date.now()
): number {
  if (!timerStartedAt) return 0;
  const started = Date.parse(timerStartedAt);
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.floor((nowMs - started) / 1000));
}

/** `1:30`, `01:30:00`, `90:00` → секунды. Иначе null. */
export function parseAgencyDetailClock(raw: string): number | null {
  const v = raw.trim().replace(",", ".");
  if (!v) return null;
  const m = v.match(/^(\d{1,4}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  const s = Number(m[3] || 0);
  if (![h, mi, s].every(Number.isFinite) || mi > 59 || s > 59 || h < 0) return null;
  return h * 3600 + mi * 60 + s;
}

