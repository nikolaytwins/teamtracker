"use client";

import { ConversionsPanel, EconomyPanel } from "@/components/sales/profi-analytics-section";
import { appPath } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { formatRub } from "@/lib/v2/finance/meta";
import type { AgencyOverviewPayload } from "@/lib/v2/agency/agency-overview";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

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
      {accent ? <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} aria-hidden /> : null}
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">{label}</div>
      <div className="v2-tnum mt-1.5 text-[19px] font-semibold tracking-tight text-[var(--v2-ink-900)]">{value}</div>
      {hint ? <div className="v2-tight mt-1 text-[12px] text-[var(--v2-ink-500)]">{hint}</div> : null}
    </div>
  );
}

function TrendChart({ months }: { months: AgencyOverviewPayload["months"] }) {
  const geom = useMemo(() => {
    const padL = 48;
    const padR = 20;
    const padT = 16;
    const padB = 36;
    const H = 220;
    const chartH = H - padT - padB;
    const n = months.length;
    const step = 52;
    const innerW = Math.max(step, (n - 1) * step);
    const W = padL + innerW + padR;
    const revs = months.map((m) => m.actualRevenue);
    const profits = months.map((m) => m.profit);
    const maxY = Math.max(...revs, ...profits.map(Math.abs), 1);
    const minY = Math.min(0, ...profits);
    const range = maxY - minY || 1;
    const x = (i: number) => padL + (n <= 1 ? 0 : (i * innerW) / (n - 1));
    const y = (v: number) => padT + chartH - ((v - minY) / range) * chartH;
    const revPath = months
      .map((m, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(m.actualRevenue)}`)
      .join(" ");
    const profitPath = months.map((m, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(m.profit)}`).join(" ");
    const zeroY = y(0);
    return { W, H, padL, padB, x, y, revPath, profitPath, zeroY, months };
  }, [months]);

  if (months.length === 0) {
    return <p className="text-[13px] text-[var(--v2-ink-500)]">Пока нет помесячных данных.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <svg width={geom.W} height={geom.H} className="min-w-full">
        <line
          x1={geom.padL}
          x2={geom.W - 20}
          y1={geom.zeroY}
          y2={geom.zeroY}
          stroke="var(--v2-ink-100)"
          strokeDasharray="4 4"
        />
        <path d={geom.revPath} fill="none" stroke="#3B6FF7" strokeWidth="2.5" />
        <path d={geom.profitPath} fill="none" stroke="#10B981" strokeWidth="2.5" />
        {geom.months.map((m, i) => (
          <g key={m.key}>
            <circle cx={geom.x(i)} cy={geom.y(m.actualRevenue)} r="3.5" fill="#3B6FF7" />
            <circle cx={geom.x(i)} cy={geom.y(m.profit)} r="3.5" fill="#10B981" />
            <text
              x={geom.x(i)}
              y={geom.H - 12}
              textAnchor="middle"
              className="fill-[var(--v2-ink-400)]"
              fontSize="10"
            >
              {m.label.split(" ")[0]?.slice(0, 3)}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex gap-4 text-[12px] text-[var(--v2-ink-500)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#3B6FF7]" /> Выручка (факт)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#10B981]" /> Прибыль
        </span>
      </div>
    </div>
  );
}

function BreakdownList({
  title,
  items,
  total,
}: {
  title: string;
  items: AgencyOverviewPayload["byService"]["items"];
  total: number;
}) {
  return (
    <div className="rounded-2xl border border-[var(--v2-ink-100)] bg-white p-4 shadow-[var(--v2-shadow-card)]">
      <h3 className="v2-tight text-[14px] font-semibold text-[var(--v2-ink-900)]">{title}</h3>
      <p className="v2-tnum mt-1 text-[12px] text-[var(--v2-ink-500)]">Всего {formatRub(total)}</p>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-[13px] text-[var(--v2-ink-500)]">Нет данных</p>
        ) : (
          items.slice(0, 8).map((it) => (
            <div key={it.key}>
              <div className="flex items-center justify-between gap-2 text-[13px]">
                <span className="truncate text-[var(--v2-ink-800)]">{it.label}</span>
                <span className="v2-tnum shrink-0 font-medium text-[var(--v2-ink-900)]">
                  {formatRub(it.totalAmount)} · {it.percent}%
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
                <div
                  className="h-full rounded-full bg-[var(--v2-brand-500)]"
                  style={{ width: `${Math.max(2, Math.min(100, it.percent))}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function AgencyOverviewClient() {
  const [data, setData] = useState<AgencyOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const payload = await fetchJson<AgencyOverviewPayload>("/api/v2/agency/overview");
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <div className="px-6 py-12 text-center text-[13.5px] text-[var(--v2-ink-500)]">Загрузка…</div>;
  }

  if (error || !data) {
    return (
      <div className="px-6 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error ?? "Нет данных"}
        </div>
      </div>
    );
  }

  const cur = data.current;

  return (
    <div className="mx-auto max-w-[1180px] space-y-8 px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="v2-tight text-[22px] font-semibold text-[var(--v2-ink-900)]">Агентство</h1>
          <p className="v2-tight mt-1 text-[13.5px] text-[var(--v2-ink-500)]">
            Сводка по финансам TT2 за последние месяцы, структура выручки и Profi.ru
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={appPath("/v2/agency")}
            className="inline-flex h-9 items-center rounded-xl bg-[var(--v2-ink-900)] px-3.5 text-[12.5px] font-medium text-white hover:bg-[var(--v2-ink-800)]"
          >
            Финансы месяца
          </Link>
          <Link
            href={appPath("/v2/admin/leads/profi-analytics")}
            className="inline-flex h-9 items-center rounded-xl border border-[var(--v2-ink-100)] bg-white px-3.5 text-[12.5px] font-medium text-[var(--v2-ink-700)] hover:bg-[var(--v2-ink-50)]"
          >
            Profi · аналитика
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Выручка месяца"
          value={cur ? formatRub(cur.actualRevenue) : "—"}
          hint={cur ? cur.label : undefined}
          accent="#3B6FF7"
        />
        <Kpi
          label="Прибыль месяца"
          value={cur ? formatRub(cur.profit) : "—"}
          hint={cur ? `маржа ${cur.margin.toFixed(0)}%` : undefined}
          accent="#10B981"
        />
        <Kpi
          label="Ср. выручка / мес"
          value={formatRub(data.averages.avgMonthlyRevenue)}
          hint={`за ${data.averages.monthsWithRevenue || 12} мес. с данными`}
          accent="#6366F1"
        />
        <Kpi
          label="Ср. прибыль / мес"
          value={formatRub(data.averages.avgMonthlyProfit)}
          hint={`сумма 12 мес: ${formatRub(data.averages.totalProfit12)}`}
          accent="#F59E0B"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Активных проектов (v2)" value={String(data.ops.activeProjects)} accent="#3B6FF7" />
        <Kpi label="Открытых задач" value={String(data.ops.openTasks)} />
        <Kpi label="Просрочено" value={String(data.ops.overdueTasks)} accent="#EF4444" />
      </div>

      <div className="rounded-2xl border border-[var(--v2-ink-100)] bg-white p-5 shadow-[var(--v2-shadow-card)]">
        <h2 className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">Динамика 12 месяцев</h2>
        <p className="v2-tight mt-1 text-[12.5px] text-[var(--v2-ink-500)]">
          Факт оплаты и прибыль из «Финансов месяца» (проекты агентства TT2)
        </p>
        <div className="mt-4">
          <TrendChart months={data.months} />
        </div>
        {cur ? (
          <div className="mt-4 grid gap-2 rounded-xl bg-[var(--v2-ink-50)] px-4 py-3 text-[12.5px] text-[var(--v2-ink-600)] sm:grid-cols-4">
            <div>
              Ожид. выручка: <span className="v2-tnum font-semibold text-[var(--v2-ink-900)]">{formatRub(cur.expectedRevenue)}</span>
            </div>
            <div>
              Расходы: <span className="v2-tnum font-semibold text-[var(--v2-ink-900)]">{formatRub(cur.totalExpenses)}</span>
            </div>
            <div>
              Проектов: <span className="v2-tnum font-semibold text-[var(--v2-ink-900)]">{cur.projectCount}</span>
            </div>
            <div>
              Налоги: <span className="v2-tnum font-semibold text-[var(--v2-ink-900)]">{formatRub(cur.taxAmount)}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownList title="Выручка по услугам" items={data.byService.items} total={data.byService.total} />
        <BreakdownList title="Выручка по типу клиента" items={data.byClient.items} total={data.byClient.total} />
      </div>

      {data.profi ? (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">Profi.ru</h2>
              <p className="v2-tight mt-1 text-[12.5px] text-[var(--v2-ink-500)]">Экономика и конверсии за всё время</p>
            </div>
            <Link
              href={appPath("/v2/admin/leads/profi")}
              className="text-[12.5px] font-semibold text-[var(--v2-brand-600)] hover:underline"
            >
              К откликам →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <EconomyPanel stats={data.profi} />
            <ConversionsPanel stats={data.profi} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
