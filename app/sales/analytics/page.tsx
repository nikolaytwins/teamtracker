"use client";

import { apiUrl } from "@/lib/api-url";
import { useCallback, useEffect, useState } from "react";

interface Conversion {
  label: string;
  count: number;
  percentage: number;
}

interface SourceStat {
  source: string;
  count: number;
}

interface Analytics {
  conversions: Conversion[];
  sources: SourceStat[];
}

interface FunnelMini {
  responses: number;
  toConversation: number;
  toProposal: number;
  toPaid: number;
}

interface OutreachStatsMini {
  totalResponses: number;
  netSpent: number;
  totalProjectAmount: number;
  funnel: FunnelMini;
}

interface SalesDashboard {
  period: { startDate: string | null; endDate: string | null };
  outreach: {
    profi: { stats: OutreachStatsMini | null; count: number };
    threads: { stats: OutreachStatsMini | null; count: number };
    combined: { stats: OutreachStatsMini | null; count: number };
  };
  visits: {
    profi: { total: number };
    threads: { total: number };
  };
  leads: { newInPeriod: number; paidInPeriod: number };
  recurring: { contactedInPeriod: number; paidInPeriod: number };
  agency: { paidAmountSumInPeriod: number };
}

function periodParams(period: "week" | "month" | "all"): { startDate: string | null; endDate: string | null } {
  if (period === "all") return { startDate: null, endDate: null };
  const today = new Date();
  const endDate = today.toISOString().split("T")[0];
  const start = new Date(today);
  if (period === "week") start.setDate(start.getDate() - 7);
  else start.setMonth(start.getMonth() - 1);
  return { startDate: start.toISOString().split("T")[0], endDate };
}

export default function SalesAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [dashboard, setDashboard] = useState<SalesDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<"week" | "month" | "all">("month");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = periodParams(analyticsPeriod);
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const q = params.toString();

      const [resLeads, resDash] = await Promise.all([
        fetch(apiUrl(`/api/agency/leads/analytics?${q}`)),
        fetch(apiUrl(`/api/agency/sales-dashboard?${q}`)),
      ]);

      if (resLeads.ok) setAnalytics(await resLeads.json());
      else setAnalytics(null);

      if (resDash.ok) setDashboard(await resDash.json());
      else setDashboard(null);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setAnalytics(null);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [analyticsPeriod]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const c = dashboard?.outreach.combined.stats;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Аналитика продаж</h1>
        <p className="text-sm text-gray-500">
          Сводка: Profi + Threads, визиты, лиды, постоянники и оплаты по проектам. Ниже — детальная воронка лидов.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Период</h2>
          <div className="flex gap-2">
            {(["week", "month", "all"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAnalyticsPeriod(p)}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  analyticsPeriod === p
                    ? "bg-violet-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {p === "week" ? "Неделя" : p === "month" ? "Месяц" : "Все время"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Загрузка…</div>
        ) : dashboard ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-violet-50 border border-violet-100">
                <div className="text-xs font-medium text-violet-800 uppercase">Отклики всего (Profi + Threads)</div>
                <div className="text-2xl font-bold text-violet-900 tabular-nums mt-1">
                  {dashboard.outreach.combined.count}
                </div>
                {c && (
                  <p className="text-xs text-violet-700 mt-2">
                    Переписка+: {c.funnel.toConversation} · КП: {c.funnel.toProposal} · Оплачено:{" "}
                    {c.funnel.toPaid}
                  </p>
                )}
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs font-medium text-slate-600 uppercase">Расходы на Profi (чистые)</div>
                <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
                  {dashboard.outreach.profi.stats
                    ? `${Math.round(dashboard.outreach.profi.stats.netSpent).toLocaleString("ru-RU")} ₽`
                    : "—"}
                </div>
                <p className="text-xs text-slate-500 mt-2">Threads: обычно 0 ₽</p>
              </div>
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                <div className="text-xs font-medium text-emerald-800 uppercase">Выручка по проектам (сумма paid)</div>
                <div className="text-2xl font-bold text-emerald-900 tabular-nums mt-1">
                  {Math.round(dashboard.agency.paidAmountSumInPeriod).toLocaleString("ru-RU")} ₽
                </div>
                <p className="text-xs text-emerald-700 mt-2">AgencyProject в выбранном периоде по дате создания</p>
              </div>
            </div>

            {c && (
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Сводка воронки (оба канала)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Сумма проектов (оплаченные отклики)</span>
                    <div className="font-semibold tabular-nums">{Math.round(c.totalProjectAmount).toLocaleString("ru-RU")} ₽</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Чистые расходы (оба)</span>
                    <div className="font-semibold tabular-nums">{Math.round(c.netSpent).toLocaleString("ru-RU")} ₽</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Лиды (созданы в периоде)</span>
                    <div className="font-semibold tabular-nums">{dashboard.leads.newInPeriod}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Лиды → оплачен</span>
                    <div className="font-semibold tabular-nums">{dashboard.leads.paidInPeriod}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Визиты вкладок</h3>
                <p className="text-sm text-gray-700">
                  Profi:{" "}
                  <span className="font-semibold tabular-nums">{dashboard.visits.profi.total}</span>
                </p>
                <p className="text-sm text-gray-700">
                  Threads:{" "}
                  <span className="font-semibold tabular-nums">{dashboard.visits.threads.total}</span>
                </p>
                <p className="text-xs text-gray-500 mt-2">Учёт с дебаунсом 30 мин на браузер</p>
              </div>
              <div className="p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Постоянники (флаг у лида)</h3>
                <p className="text-sm text-gray-700">
                  Обратились в периоде:{" "}
                  <span className="font-semibold tabular-nums">{dashboard.recurring.contactedInPeriod}</span>
                </p>
                <p className="text-sm text-gray-700">
                  Статус «Оплачен» и созданы в периоде:{" "}
                  <span className="font-semibold tabular-nums">{dashboard.recurring.paidInPeriod}</span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">Нет данных сводки</div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Воронка лидов (детально)</h2>
        <p className="text-sm text-gray-500 mb-4">
          Конверсии по статусам и источники — по истории лидов за тот же период.
        </p>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Загрузка…</div>
          ) : analytics ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Конверсии переходов</h3>
                {analytics.conversions.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.conversions.map((conv) => (
                      <div key={conv.label} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <div className="text-sm text-gray-900">{conv.label}</div>
                          <div className="text-xs text-gray-600">{conv.count} уникальных лидов</div>
                        </div>
                        <div className="text-sm font-semibold text-gray-900 tabular-nums">
                          {conv.percentage.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic py-2">Нет данных о конверсиях</div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Источники</h3>
                {analytics.sources.length > 0 ? (
                  <div className="space-y-2">
                    {[...analytics.sources]
                      .sort((a, b) => b.count - a.count)
                      .map((source) => (
                        <div
                          key={source.source}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div className="text-sm text-gray-900">{source.source}</div>
                          <div className="text-sm font-semibold text-gray-900 tabular-nums">
                            {source.count} лидов
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic py-2">Нет данных об источниках</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">Нет данных</div>
          )}
        </div>
      </div>
    </div>
  );
}
