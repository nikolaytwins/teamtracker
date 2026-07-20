"use client";

import { V2Icons } from "@/components/v2/ui/icons";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { formatRub } from "@/lib/v2/finance/meta";
import type { LeadAllTimePayload } from "@/lib/v2/leads/lead-analytics";
import { V2_LEAD_TYPES } from "@/lib/v2/leads/lead-types";
import { useCallback, useEffect, useState } from "react";

function formatRubShort(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(".", ",")} млн`;
  if (abs >= 10_000) return `${Math.round(n / 1000).toLocaleString("ru-RU")} тыс`;
  return formatRub(n);
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--v2-ink-100)] bg-white px-4 py-3.5 shadow-[var(--v2-shadow-card)]">
      {accent ? (
        <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} aria-hidden />
      ) : null}
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">{label}</div>
      <div className="v2-tnum mt-1.5 text-[19px] font-semibold tracking-tight text-[var(--v2-ink-900)]">{value}</div>
      {hint ? <div className="v2-tight mt-1 text-[12px] text-[var(--v2-ink-500)]">{hint}</div> : null}
    </div>
  );
}

function ConversionTrend({ monthly }: { monthly: LeadAllTimePayload["monthly"] }) {
  const W = 720;
  const H = 200;
  const padX = 28;
  const padTop = 24;
  const padBot = 34;
  const maxRate = Math.max(1, ...monthly.map((m) => m.conversionRate));
  const slot = monthly.length ? (W - padX * 2) / monthly.length : W;
  const bw = Math.min(slot * 0.55, 22);
  const Y = (v: number) => padTop + (1 - v / maxRate) * (H - padTop - padBot);
  const base = H - padBot;

  if (!monthly.length) {
    return <p className="py-8 text-center text-[13px] text-[var(--v2-ink-500)]">Пока нет истории по месяцам</p>;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: "block" }}>
      {[0, 0.5, 1].map((t, i) => {
        const y = padTop + t * (H - padTop - padBot);
        return (
          <line key={i} x1={padX} x2={W - padX} y1={y} y2={y} stroke="#0A0A0B" strokeOpacity="0.06" />
        );
      })}
      {monthly.map((d, i) => {
        const cx = padX + slot * i + slot / 2;
        const h = Math.max(0, base - Y(d.conversionRate));
        return (
          <g key={`${d.year}-${d.month}`}>
            <rect x={cx - bw / 2} y={Y(d.conversionRate)} width={bw} height={h} rx={5} fill="#10B981" opacity={0.85} />
            {monthly.length <= 18 || i % 2 === 0 ? (
              <text x={cx} y={H - 12} textAnchor="middle" fontSize="10" fill="#A1A1AA">
                {d.shortLabel}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function LeadsAllTimeAnalyticsPanel() {
  const [data, setData] = useState<LeadAllTimePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const payload = await fetchJson<LeadAllTimePayload>("/api/v2/admin/leads/analytics/all-time");
    setData(payload);
    setError(null);
  }, []);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [load]);

  if (loading) {
    return <div className="py-24 text-center text-[13.5px] text-[var(--v2-ink-500)]">Загрузка…</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-800">{error}</div>
    );
  }

  if (!data) return null;

  const { totals, bySource, byType, byStatus, conversionSpeed, monthly, highlights } = data;
  const maxStatus = Math.max(1, ...byStatus.map((s) => s.count));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="v2-tight text-[18px] font-semibold text-[var(--v2-ink-900)]">Аналитика за всё время</h2>
        <p className="v2-tight mt-1 text-[13px] text-[var(--v2-ink-500)]">
          Сводка по всем активным лидам: каналы, конверсия, текущая воронка и скорость закрытия.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Всего лидов" value={String(totals.leadsCount)} hint="в канбане сейчас" accent="#3B6FF7" />
        <Kpi label="Сумма воронки" value={formatRub(totals.estimatedAmount)} hint="ориентир по всем" accent="#F59E0B" />
        <Kpi
          label="Взяли в работу"
          value={`${totals.takenIntoWorkCount}`}
          hint={`конверсия ${totals.conversionRate}%`}
          accent="#10B981"
        />
        <Kpi
          label="Закрыто продаж"
          value={formatRub(totals.takenIntoWorkAmount)}
          hint={totals.avgTakenCheck ? `ср. чек ${formatRubShort(totals.avgTakenCheck)}` : "сумма взятых"}
          accent="#3B6FF7"
        />
        <Kpi
          label="Открытый пайплайн"
          value={`${totals.openPipelineCount}`}
          hint={formatRubShort(totals.openPipelineAmount)}
          accent="#7C3AED"
        />
        <Kpi
          label="Сливы / паузы"
          value={`${totals.lostCount} / ${totals.pauseCount}`}
          hint="текущий статус"
          accent="#A1A1AA"
        />
      </div>

      {(highlights.bestConversionSource || highlights.topVolumeSource || conversionSpeed) && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {highlights.bestConversionSource ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                Лучшая конверсия
              </p>
              <p className="v2-tight mt-1 text-[15px] font-semibold text-[var(--v2-ink-900)]">
                {highlights.bestConversionSource.label}
              </p>
              <p className="v2-tnum mt-1 text-[12px] text-[var(--v2-ink-600)]">
                {highlights.bestConversionSource.conversionRate}% ·{" "}
                {highlights.bestConversionSource.takenIntoWorkCount} из {highlights.bestConversionSource.count}
              </p>
            </div>
          ) : null}
          {highlights.topVolumeSource ? (
            <div className="rounded-2xl border border-[var(--v2-brand-100)] bg-[var(--v2-brand-50)]/70 px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-brand-700)]">
                Главный канал по объёму
              </p>
              <p className="v2-tight mt-1 text-[15px] font-semibold text-[var(--v2-ink-900)]">
                {highlights.topVolumeSource.label}
              </p>
              <p className="v2-tnum mt-1 text-[12px] text-[var(--v2-ink-600)]">
                {formatRubShort(highlights.topVolumeSource.takenIntoWorkAmount)} закрыто ·{" "}
                {highlights.topVolumeSource.shareOfTaken}% взятых
              </p>
            </div>
          ) : null}
          {conversionSpeed ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                Скорость до «в работу»
              </p>
              <p className="v2-tnum mt-1 text-[15px] font-semibold text-[var(--v2-ink-900)]">
                ~{conversionSpeed.avgDays} дн. · медиана {conversionSpeed.medianDays}
              </p>
              <p className="mt-1 text-[12px] text-[var(--v2-ink-600)]">
                по {conversionSpeed.sampleSize} закрытым лидам
              </p>
            </div>
          ) : null}
        </div>
      )}

      <div className="rounded-2xl border border-[var(--v2-ink-100)] bg-white p-5 shadow-[var(--v2-shadow-card)]">
        <div className="mb-1 flex items-center gap-2">
          <V2Icons.reports className="h-4 w-4 text-[var(--v2-ink-500)]" />
          <h3 className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">Каналы</h3>
        </div>
        <p className="mb-4 text-[12.5px] text-[var(--v2-ink-500)]">
          Откуда приходят лиды и где реально закрываются продажи
        </p>
        {bySource.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--v2-ink-100)] text-[11px] uppercase tracking-[0.06em] text-[var(--v2-ink-400)]">
                  <th className="pb-2 pr-3 font-semibold">Канал</th>
                  <th className="pb-2 pr-3 font-semibold">Лидов</th>
                  <th className="pb-2 pr-3 font-semibold">Сумма</th>
                  <th className="pb-2 pr-3 font-semibold">В работу</th>
                  <th className="pb-2 pr-3 font-semibold">Конверсия</th>
                  <th className="pb-2 pr-3 font-semibold">Закрыто</th>
                  <th className="pb-2 font-semibold">Доля взятых</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--v2-ink-100)]">
                {bySource.map((src) => (
                  <tr key={src.key} className="align-top">
                    <td className="py-3 pr-3 font-medium text-[var(--v2-ink-900)]">{src.label}</td>
                    <td className="v2-tnum py-3 pr-3 text-[var(--v2-ink-700)]">{src.count}</td>
                    <td className="v2-tnum py-3 pr-3 text-[var(--v2-ink-700)]">
                      {formatRubShort(src.estimatedAmount)}
                    </td>
                    <td className="v2-tnum py-3 pr-3 text-[var(--v2-ink-700)]">
                      {src.takenIntoWorkCount}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={`v2-tnum inline-flex rounded-md px-1.5 py-0.5 text-[12px] font-semibold ${
                          src.conversionRate >= 40
                            ? "bg-emerald-50 text-emerald-700"
                            : src.conversionRate >= 20
                              ? "bg-amber-50 text-amber-700"
                              : "bg-[var(--v2-ink-50)] text-[var(--v2-ink-600)]"
                        }`}
                      >
                        {src.conversionRate}%
                      </span>
                    </td>
                    <td className="v2-tnum py-3 pr-3 font-medium text-[var(--v2-ink-900)]">
                      {formatRubShort(src.takenIntoWorkAmount)}
                    </td>
                    <td className="v2-tnum py-3 text-[var(--v2-ink-600)]">{src.shareOfTaken}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-[13px] text-[var(--v2-ink-500)]">Источники пока не заполнены</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--v2-ink-100)] bg-white p-5 shadow-[var(--v2-shadow-card)]">
          <h3 className="v2-tight mb-4 text-[15px] font-semibold text-[var(--v2-ink-900)]">Агентство / курс</h3>
          <div className="space-y-3">
            {V2_LEAD_TYPES.map((t) => {
              const row = byType[t.key];
              return (
                <div key={t.key} className="rounded-xl bg-[var(--v2-ink-50)]/80 px-3.5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.ink }} />
                      <span className="text-[13px] font-semibold text-[var(--v2-ink-900)]">{t.label}</span>
                    </div>
                    <span className="v2-tnum text-[12px] font-semibold text-[var(--v2-ink-600)]">
                      {row.conversionRate}%
                    </span>
                  </div>
                  <p className="v2-tnum mt-1.5 text-[12px] text-[var(--v2-ink-500)]">
                    {row.count} лидов · {formatRubShort(row.estimatedAmount)} · в работу {row.takenIntoWorkCount} ·
                    закрыто {formatRubShort(row.takenIntoWorkAmount)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--v2-ink-100)] bg-white p-5 shadow-[var(--v2-shadow-card)]">
          <h3 className="v2-tight mb-1 text-[15px] font-semibold text-[var(--v2-ink-900)]">Текущая воронка</h3>
          <p className="mb-4 text-[12.5px] text-[var(--v2-ink-500)]">Распределение по статусам канбана</p>
          <div className="space-y-2.5">
            {byStatus.map((status) => (
              <div key={status.key}>
                <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
                  <span className="font-medium text-[var(--v2-ink-800)]">{status.label}</span>
                  <span className="v2-tnum text-[var(--v2-ink-500)]">
                    {status.count} · {formatRubShort(status.estimatedAmount)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(status.count / maxStatus) * 100}%`,
                      background: status.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--v2-ink-100)] bg-white p-5 shadow-[var(--v2-shadow-card)]">
        <h3 className="v2-tight mb-1 text-[15px] font-semibold text-[var(--v2-ink-900)]">
          Конверсия по месяцам
        </h3>
        <p className="mb-4 text-[12.5px] text-[var(--v2-ink-500)]">
          Доля лидов, взятых в работу, от добавленных в том же месяце
        </p>
        <ConversionTrend monthly={monthly} />
      </div>
    </div>
  );
}
