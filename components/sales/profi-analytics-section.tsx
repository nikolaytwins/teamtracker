"use client";

import { apiUrl } from "@/lib/api-url";
import { parseISOWeekParam } from "@/lib/iso-week";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface ProfiStatsShape {
  totalPaid: number;
  totalRefunded: number;
  netSpent: number;
  totalResponses: number;
  countResponse: number;
  countConversation: number;
  countProposal: number;
  countPaid: number;
  countRefunded: number;
  countDrain: number;
  totalProjectAmount: number;
  roi: number;
  responseToPaidRate: number;
  costPerPayingClient: number | null;
  avgCheckPaying: number | null;
  funnel: {
    responses: number;
    viewedResponses: number;
    toConversation: number;
    toProposal: number;
    toPaid: number;
    convRate: number;
    proposalRate: number;
    paidRate: number;
  };
}

function formatMonthYm(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function weekLabelRu(weekKey: string): string {
  const p = parseISOWeekParam(weekKey);
  if (!p) return weekKey;
  const end = new Date(p.nextMonday);
  end.setDate(end.getDate() - 1);
  const startStr = p.monday.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const endStr = end.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  return `${startStr}–${endStr}`;
}

function EconomyPanel({ stats }: { stats: ProfiStatsShape }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
      <h3 className="mb-3 text-lg font-semibold text-[var(--text)]">Экономика</h3>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--muted-foreground)]">Заплатил за отклики</span>
          <span className="font-medium">{stats.totalPaid.toLocaleString("ru-RU")} ₽</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted-foreground)]">Возвраты</span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400">−{stats.totalRefunded.toLocaleString("ru-RU")} ₽</span>
        </div>
        {stats.countDrain > 0 && (
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Сливов (отказ)</span>
            <span className="font-medium text-[var(--muted-foreground)]">{stats.countDrain}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-[var(--border)] pt-2">
          <span className="font-medium text-[var(--text)]">Чистые расходы</span>
          <span className="font-semibold">{stats.netSpent.toLocaleString("ru-RU")} ₽</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted-foreground)]">Сумма проектов</span>
          <span className="font-medium text-[var(--primary)]">{stats.totalProjectAmount.toLocaleString("ru-RU")} ₽</span>
        </div>
        <div className="flex justify-between border-t border-[var(--border)] pt-2">
          <span className="font-medium text-[var(--text)]">ROI</span>
          <span
            className={`font-semibold ${stats.roi >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
          >
            {stats.roi >= 0 ? "+" : ""}
            {stats.roi.toFixed(0)}%
          </span>
        </div>
      </dl>
      <p className="mt-3 text-xs text-[var(--muted-foreground)]">
        {stats.totalProjectAmount >= stats.netSpent
          ? "Окупается: выручка по проектам больше расходов на отклики."
          : "Пока не окупается: расходы на отклики больше выручки по проектам."}
      </p>
    </div>
  );
}

function ConversionsPanel({ stats }: { stats: ProfiStatsShape }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
      <h3 className="mb-4 text-lg font-semibold text-[var(--text)]">Конверсии</h3>
      <div className="space-y-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-white">
            {stats.funnel.responses}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-[var(--text)]">Откликов</div>
            <div className="mt-0.5 h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div className="h-full w-full rounded-full bg-[var(--primary)]" />
            </div>
          </div>
        </div>
        <div className="flex justify-center py-0.5">
          <span className="text-lg text-[var(--muted-foreground)]">↓</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/75 text-sm font-bold text-white">
            {stats.funnel.viewedResponses}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-sm font-medium text-[var(--text)]">
              <span>Просмотренные отклики</span>
              <span className="tabular-nums font-semibold text-[var(--primary)]">
                {stats.funnel.responses > 0
                  ? `${Math.round((stats.funnel.viewedResponses / stats.funnel.responses) * 1000) / 10}% от отклика`
                  : "—"}
              </span>
            </div>
            <div className="mt-0.5 h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full bg-[var(--primary)]/75 transition-all"
                style={{
                  width: `${stats.funnel.responses > 0 ? Math.max((stats.funnel.viewedResponses / stats.funnel.responses) * 100, 2) : 2}%`,
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-center py-0.5">
          <span className="text-lg text-[var(--muted-foreground)]">↓</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/60 text-sm font-bold text-white">
            {stats.funnel.toConversation}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-sm font-medium text-[var(--text)]">
              <span>Переписка</span>
              <span className="tabular-nums font-semibold text-[var(--primary)]">{stats.funnel.convRate}% от отклика</span>
            </div>
            <div className="mt-0.5 h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full bg-[var(--primary)]/60 transition-all"
                style={{ width: `${Math.max(stats.funnel.convRate, 2)}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-center py-0.5">
          <span className="text-lg text-[var(--muted-foreground)]">↓</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/80 text-sm font-bold text-[var(--primary-foreground)]">
            {stats.funnel.toProposal}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-sm font-medium text-[var(--text)]">
              <span>КП</span>
              <span className="tabular-nums font-semibold text-[var(--primary)]">{stats.funnel.proposalRate}% от переписки</span>
            </div>
            <div className="mt-0.5 h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full bg-[var(--primary)]/80 transition-all"
                style={{ width: `${Math.max(stats.funnel.convRate * (stats.funnel.proposalRate / 100), 2)}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-center py-0.5">
          <span className="text-lg text-[var(--muted-foreground)]">↓</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--success)] text-sm font-bold text-white">
            {stats.funnel.toPaid}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-sm font-medium text-[var(--text)]">
              <span>Оплачено</span>
              <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{stats.funnel.paidRate}% от КП</span>
            </div>
            <div className="mt-0.5 h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full bg-[var(--success)] transition-all"
                style={{ width: `${Math.max(stats.responseToPaidRate, 2)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-3">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--muted-foreground)]">Итого от отклика в оплату</span>
          <span className="tabular-nums font-semibold text-[var(--primary)]">{stats.responseToPaidRate}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--muted-foreground)]">Цена платящего клиента</span>
          <span className="font-medium tabular-nums text-[var(--text)]">
            {stats.costPerPayingClient != null ? `${Math.round(stats.costPerPayingClient).toLocaleString("ru-RU")} ₽` : "—"}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--muted-foreground)]">Средний чек платящего</span>
          <span className="font-medium tabular-nums text-[var(--text)]">
            {stats.avgCheckPaying != null ? `${Math.round(stats.avgCheckPaying).toLocaleString("ru-RU")} ₽` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProfiAnalyticsSection() {
  const [stats, setStats] = useState<ProfiStatsShape | null>(null);
  const [byMonth, setByMonth] = useState<Record<string, ProfiStatsShape>>({});
  const [byMonthWeeks, setByMonthWeeks] = useState<Record<string, Record<string, ProfiStatsShape>>>({});
  const [loading, setLoading] = useState(true);
  /** 0 = все время; k ≥ 1 → monthsSorted[k - 1] */
  const [periodIdx, setPeriodIdx] = useState(0);
  const [openMonths, setOpenMonths] = useState<Set<string>>(() => new Set());

  const monthsSorted = useMemo(() => Object.keys(byMonth).sort((a, b) => b.localeCompare(a)), [byMonth]);
  const maxIdx = monthsSorted.length;

  const displayStats = useMemo(() => {
    if (periodIdx === 0) return stats;
    const ym = monthsSorted[periodIdx - 1];
    return ym ? byMonth[ym] ?? null : null;
  }, [periodIdx, stats, byMonth, monthsSorted]);

  const periodLabel =
    periodIdx === 0
      ? "Все время"
      : monthsSorted[periodIdx - 1]
        ? formatMonthYm(monthsSorted[periodIdx - 1]!)
        : "—";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/agency/profi-responses?stats=1&omitItems=1"));
      const data = await res.json();
      setStats(data.stats ?? null);
      setByMonth(data.byMonth ?? {});
      setByMonthWeeks(data.byMonthWeeks ?? {});
    } catch (e) {
      console.error(e);
      setStats(null);
      setByMonth({});
      setByMonthWeeks({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (periodIdx > maxIdx) setPeriodIdx(maxIdx);
  }, [maxIdx, periodIdx]);

  const toggleMonthOpen = (ym: string) => {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(ym)) next.delete(ym);
      else next.add(ym);
      return next;
    });
  };

  if (loading) {
    return (
      <div id="profi" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted-foreground)]">
        Загрузка Profi.ru…
      </div>
    );
  }

  return (
    <section id="profi" className="scroll-mt-4 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">Profi.ru — конверсии и экономика</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            По дате отклика. Ниже — помесячно и по неделям внутри месяца.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Предыдущий период"
            disabled={periodIdx >= maxIdx}
            onClick={() => setPeriodIdx((i) => Math.min(maxIdx, i + 1))}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            ←
          </button>
          <span className="min-w-[10rem] text-center text-sm font-semibold capitalize text-[var(--text)]">{periodLabel}</span>
          <button
            type="button"
            aria-label="Следующий период"
            disabled={periodIdx <= 0}
            onClick={() => setPeriodIdx((i) => Math.max(0, i - 1))}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            →
          </button>
        </div>
      </div>

      {displayStats ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <EconomyPanel stats={displayStats} />
          <ConversionsPanel stats={displayStats} />
        </div>
      ) : (
        <p className="text-sm text-[var(--muted-foreground)]">Нет данных по Profi.ru за выбранный период.</p>
      )}

      {Object.keys(byMonth).length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
          <h3 className="mb-3 text-lg font-semibold text-[var(--text)]">По месяцам (дата отклика) и по неделям</h3>
          <div className="space-y-1">
            {Object.entries(byMonth)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([ym, m]) => {
                const weeks = byMonthWeeks[ym] ?? {};
                const weekKeys = Object.keys(weeks).sort((a, b) => a.localeCompare(b));
                const open = openMonths.has(ym);
                return (
                  <div key={ym} className="rounded-lg border border-[var(--border)] bg-[var(--bg)]/30">
                    <button
                      type="button"
                      onClick={() => toggleMonthOpen(ym)}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-[var(--surface-2)]/50"
                    >
                      <span className="tabular-nums text-[var(--muted-foreground)]">{open ? "▼" : "▶"}</span>
                      <span className="font-semibold capitalize text-[var(--text)]">{formatMonthYm(ym)}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        откликов {m.funnel.responses}
                        {weekKeys.length > 0 ? ` · ${weekKeys.length} нед.` : ""}
                      </span>
                    </button>
                    <div className="overflow-x-auto border-t border-[var(--border)]">
                      <table className="w-full min-w-[880px] text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                            <th className="py-2 pl-3 pr-2 font-medium">Период</th>
                            <th className="py-2 pr-2 font-medium">Отклики</th>
                            <th className="py-2 pr-2 font-medium">Просмотры</th>
                            <th className="py-2 pr-2 font-medium">Переписки</th>
                            <th className="py-2 pr-2 font-medium">КП</th>
                            <th className="py-2 pr-2 font-medium">Оплачено</th>
                            <th className="py-2 pr-2 font-medium">Чистые ₽</th>
                            <th className="py-2 pr-3 font-medium">Доходы ₽</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-[var(--border)]/60 bg-[var(--surface)]/80 font-medium">
                            <td className="py-2 pl-3 pr-2 text-[var(--text)]">Итого месяц</td>
                            <td className="py-2 pr-2 tabular-nums">{m.funnel.responses}</td>
                            <td className="py-2 pr-2 tabular-nums">{m.funnel.viewedResponses}</td>
                            <td className="py-2 pr-2 tabular-nums">{m.funnel.toConversation}</td>
                            <td className="py-2 pr-2 tabular-nums">{m.funnel.toProposal}</td>
                            <td className="py-2 pr-2 tabular-nums">{m.countPaid}</td>
                            <td className="py-2 pr-2 tabular-nums">{Math.round(m.netSpent).toLocaleString("ru-RU")}</td>
                            <td className="py-2 pr-3 tabular-nums text-[var(--primary)]">
                              {Math.round(m.totalProjectAmount).toLocaleString("ru-RU")}
                            </td>
                          </tr>
                          {open &&
                            weekKeys.map((wk) => {
                              const w = weeks[wk]!;
                              return (
                                <tr key={wk} className="border-b border-[var(--border)]/40 text-[var(--muted-foreground)]">
                                  <td className="py-2 pl-6 pr-2 text-xs text-[var(--text)]">
                                    {weekLabelRu(wk)} <span className="text-[var(--muted-foreground)]">({wk})</span>
                                  </td>
                                  <td className="py-2 pr-2 tabular-nums">{w.funnel.responses}</td>
                                  <td className="py-2 pr-2 tabular-nums">{w.funnel.viewedResponses}</td>
                                  <td className="py-2 pr-2 tabular-nums">{w.funnel.toConversation}</td>
                                  <td className="py-2 pr-2 tabular-nums">{w.funnel.toProposal}</td>
                                  <td className="py-2 pr-2 tabular-nums">{w.countPaid}</td>
                                  <td className="py-2 pr-2 tabular-nums">{Math.round(w.netSpent).toLocaleString("ru-RU")}</td>
                                  <td className="py-2 pr-3 tabular-nums text-[var(--primary)]">
                                    {Math.round(w.totalProjectAmount).toLocaleString("ru-RU")}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </section>
  );
}
