"use client";

import type { LeadAnalyticsMonth, LeadAnalyticsPayload } from "@/lib/v2/leads/lead-analytics";
import { V2_LEAD_TYPES } from "@/lib/v2/leads/lead-types";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { useCallback, useEffect, useState } from "react";

function formatRub(n: number) {
  return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--v2-ink-100)] bg-white px-4 py-3.5 shadow-[var(--v2-shadow-card)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">{label}</div>
      <div className="v2-tnum mt-1.5 text-[20px] font-semibold text-[var(--v2-ink-900)]">{value}</div>
      {hint ? <div className="v2-tight mt-1 text-[12px] text-[var(--v2-ink-500)]">{hint}</div> : null}
    </div>
  );
}

function MiniBar({
  label,
  count,
  amount,
  maxCount,
}: {
  label: string;
  count: number;
  amount: number;
  maxCount: number;
}) {
  const pct = maxCount ? Math.round((count / maxCount) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="v2-tight text-[12.5px] font-medium text-[var(--v2-ink-800)]">{label}</span>
        <span className="v2-tnum text-[12px] text-[var(--v2-ink-500)]">
          {count} · {formatRub(amount)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
        <div className="h-full rounded-full bg-[var(--v2-brand-500)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MonthCard({ row }: { row: LeadAnalyticsMonth }) {
  const maxSource = Math.max(1, ...row.bySource.map((s) => s.count));
  return (
    <article className="rounded-2xl border border-[var(--v2-ink-100)] bg-white p-5 shadow-[var(--v2-shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="v2-tight text-[16px] font-semibold capitalize text-[var(--v2-ink-900)]">{row.label}</h3>
          <p className="v2-tight mt-1 text-[13px] text-[var(--v2-ink-500)]">
            {row.leadsCount} лид{row.leadsCount === 1 ? "" : row.leadsCount < 5 ? "а" : "ов"}
            {row.leadsCount > 0 ? ` · конверсия ${row.conversionRate}%` : ""}
          </p>
        </div>
        <div className="v2-tnum text-right text-[15px] font-semibold text-[var(--v2-ink-900)]">
          {formatRub(row.estimatedAmount)}
          <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--v2-ink-500)]">
            сумма лидов
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {V2_LEAD_TYPES.map((t) => {
          const slice = row.byType[t.key];
          return (
            <div key={t.key} className="rounded-xl px-3 py-2.5" style={{ background: t.soft }}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: t.ink }}>
                {t.label}
              </div>
              <div className="v2-tnum mt-1 text-[15px] font-semibold" style={{ color: t.ink }}>
                {slice.count}
              </div>
              <div className="v2-tnum text-[12px]" style={{ color: t.ink, opacity: 0.85 }}>
                {formatRub(slice.estimatedAmount)}
              </div>
            </div>
          );
        })}
        <div className="rounded-xl bg-[var(--v2-ink-50)] px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--v2-ink-500)]">
            В работу
          </div>
          <div className="v2-tnum mt-1 text-[15px] font-semibold text-[var(--v2-ink-900)]">
            {row.takenIntoWorkCount}
          </div>
          <div className="v2-tnum text-[12px] text-[var(--v2-ink-500)]">{row.conversionRate}%</div>
        </div>
      </div>

      {row.bySource.length > 0 ? (
        <div className="mt-5 space-y-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
            Источники
          </div>
          {row.bySource.map((s) => (
            <MiniBar key={s.key} label={s.label} count={s.count} amount={s.estimatedAmount} maxCount={maxSource} />
          ))}
        </div>
      ) : null}

      <div className="mt-5 rounded-xl border border-dashed border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)]/60 px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
          Сравнение с финансами месяца
        </div>
        {row.finance ? (
          <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <div className="text-[12px] text-[var(--v2-ink-500)]">Закрыто продаж</div>
              <div className="v2-tnum text-[14px] font-semibold text-[var(--v2-ink-900)]">
                {formatRub(row.finance.closedSalesAmount)}
              </div>
              <div className="text-[11px] text-[var(--v2-ink-400)]">{row.finance.projectCount} проектов</div>
            </div>
            <div>
              <div className="text-[12px] text-[var(--v2-ink-500)]">Факт. выручка</div>
              <div className="v2-tnum text-[14px] font-semibold text-[var(--v2-ink-900)]">
                {formatRub(row.finance.actualRevenue)}
              </div>
              <div className="text-[11px] text-[var(--v2-ink-400)]">оплачено</div>
            </div>
            <div>
              <div className="text-[12px] text-[var(--v2-ink-500)]">Прибыль</div>
              <div className="v2-tnum text-[14px] font-semibold text-[var(--v2-ink-900)]">
                {formatRub(row.finance.profit)}
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-[var(--v2-ink-500)]">Нет данных по проектам за этот месяц</p>
        )}
        {row.leadsCount > 0 && row.finance ? (
          <p className="v2-tight mt-3 text-[12.5px] text-[var(--v2-ink-500)]">
            Лиды ~{formatRub(row.estimatedAmount)} → продажи {formatRub(row.finance.closedSalesAmount)} → оплачено{" "}
            {formatRub(row.finance.actualRevenue)}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function LeadsAnalyticsPanel() {
  const [data, setData] = useState<LeadAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchJson<LeadAnalyticsPayload>("/api/v2/admin/leads/analytics");
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <div className="py-24 text-center text-[13.5px] text-[var(--v2-ink-500)]">Загрузка аналитики…</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-800">{error}</div>
    );
  }

  if (!data) return null;

  const { totals, months } = data;
  const visible = months.filter((m) => m.leadsCount > 0 || (m.finance && m.finance.projectCount > 0));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        <Kpi label="Лидов" value={String(totals.leadsCount)} hint="за период" />
        <Kpi label="Сумма лидов" value={formatRub(totals.estimatedAmount)} />
        <Kpi
          label="В работу"
          value={String(totals.takenIntoWorkCount)}
          hint={`конверсия ${totals.conversionRate}%`}
        />
        <Kpi label="Закрыто продаж" value={formatRub(totals.closedSalesAmount)} hint="полная сумма проектов" />
        <Kpi label="Факт. выручка" value={formatRub(totals.actualRevenue)} hint="оплачено" />
        <Kpi label="Прибыль" value={formatRub(totals.profit)} />
        <Kpi
          label="Воронка"
          value={
            totals.estimatedAmount > 0
              ? `${Math.round((totals.closedSalesAmount / totals.estimatedAmount) * 100)}%`
              : "—"
          }
          hint="продажи / сумма лидов"
        />
      </div>

      <p className="v2-tight text-[13px] text-[var(--v2-ink-500)]">
        Месяц лида — по дате добавления. Финансы — по месяцу проекта (как в «Проекты и финансы»). Выручка может
        растягиваться на несколько месяцев, если оплаты идут позже.
      </p>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-[var(--v2-ink-100)] bg-white px-6 py-16 text-center text-[13.5px] text-[var(--v2-ink-500)]">
          Пока нет данных для аналитики — добавьте лиды с датой и отметьте «взяли в работу»
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((row) => (
            <MonthCard key={`${row.year}-${row.month}`} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
