"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import {
  ConversionsPanel,
  EconomyPanel,
  type ProfiStatsShape,
} from "@/components/sales/profi-analytics-section";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

interface HistoryRecord {
  id: string;
  year: number;
  month: number;
  agencyActualRevenue: number;
  agencyActualProfit: number;
  impulseActualRevenue?: number;
  impulseActualProfit?: number;
  totalRevenue?: number;
}

interface RevenueByServiceItem {
  serviceType: string;
  totalAmount: number;
  count: number;
  percent: number;
}

interface RevenueByClientItem {
  clientType: string;
  totalAmount: number;
  count: number;
  percent: number;
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  site: "Сайт",
  presentation: "Презентация",
  small_task: "Мелкая задача",
  subscription: "Подписка",
};

const CLIENT_TYPE_LABELS: Record<string, string> = {
  "": "Не указан",
  permanent: "Постоянник",
  referral: "Рекомендация",
  profi_ru: "Профи.ру",
  networking: "Нетворкинг",
};

const MONTH_NAMES = [
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
];

type ChartTip = {
  clientX: number;
  clientY: number;
  month: string;
  revenue: number;
  profit: number;
} | null;

function sortHistoryAsc(a: HistoryRecord, b: HistoryRecord): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}

function sortHistoryDesc(a: HistoryRecord, b: HistoryRecord): number {
  if (a.year !== b.year) return b.year - a.year;
  return b.month - a.month;
}

/** Как на странице статистики агентства: выручка/прибыль агентства по месяцу. */
function rowRevenueProfit(row: HistoryRecord): { revenue: number; profit: number } {
  return {
    revenue: row.agencyActualRevenue || 0,
    profit: row.agencyActualProfit || 0,
  };
}

export function AdminDashboardFinanceSection() {
  const chartDomId = useId().replace(/:/g, "");
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [revenueByService, setRevenueByService] = useState<{
    items: RevenueByServiceItem[];
    total: number;
  } | null>(null);
  const [revenueByClient, setRevenueByClient] = useState<{
    items: RevenueByClientItem[];
    total: number;
  } | null>(null);
  const [profiStats, setProfiStats] = useState<ProfiStatsShape | null>(null);
  const [finLoading, setFinLoading] = useState(true);
  const [finErr, setFinErr] = useState<string | null>(null);
  const [chartTip, setChartTip] = useState<ChartTip>(null);

  const loadFinance = useCallback(async () => {
    setFinErr(null);
    try {
      const [historyRes, serviceRes, clientRes, profiRes] = await Promise.all([
        fetch(apiUrl("/api/history"), { cache: "no-store" }),
        fetch(apiUrl("/api/agency/statistics/revenue-by-service"), { cache: "no-store" }),
        fetch(apiUrl("/api/agency/statistics/revenue-by-client"), { cache: "no-store" }),
        fetch(apiUrl("/api/agency/profi-responses?stats=1&omitItems=1"), { cache: "no-store" }),
      ]);
      const historyData = await historyRes.json();
      const serviceData = await serviceRes.json();
      const clientData = await clientRes.json();
      const profiData = await profiRes.json();

      setHistory(Array.isArray(historyData) ? historyData : []);
      setRevenueByService(
        serviceData.items != null
          ? { items: serviceData.items, total: serviceData.total || 0 }
          : null
      );
      setRevenueByClient(
        clientData.items != null ? { items: clientData.items, total: clientData.total || 0 } : null
      );
      setProfiStats(profiData.stats ?? null);
    } catch (e) {
      console.error(e);
      setFinErr("Не удалось загрузить финансы");
      setHistory([]);
      setRevenueByService(null);
      setRevenueByClient(null);
      setProfiStats(null);
    } finally {
      setFinLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFinance();
  }, [loadFinance]);

  useEffect(() => {
    const id = setInterval(() => void loadFinance(), 90_000);
    const onVis = () => {
      if (document.visibilityState === "visible") void loadFinance();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadFinance]);

  const last12Desc = useMemo(() => [...history].sort(sortHistoryDesc).slice(0, 12), [history]);
  const monthsWithData = last12Desc.filter((h) => rowRevenueProfit(h).revenue > 0);
  const monthsCount = monthsWithData.length > 0 ? monthsWithData.length : 1;
  const totalRevenue12 = monthsWithData.reduce((s, h) => s + rowRevenueProfit(h).revenue, 0);
  const totalProfit12 = monthsWithData.reduce((s, h) => s + rowRevenueProfit(h).profit, 0);
  const avgMonthlyRevenue = totalRevenue12 / monthsCount;
  const avgMonthlyProfit = totalProfit12 / monthsCount;

  const monthlyAllAsc = useMemo(() => {
    const sorted = [...history].sort(sortHistoryAsc);
    return sorted.map((record) => {
      const { revenue, profit } = rowRevenueProfit(record);
      return {
        key: `${record.year}-${record.month}`,
        month: `${MONTH_NAMES[record.month - 1] ?? record.month} ${record.year}`,
        revenue,
        profit,
      };
    });
  }, [history]);

  const chartGeom = useMemo(() => {
    const padLeft = 56;
    const padRight = 28;
    const padTop = 20;
    const padBottom = 44;
    const chartH = 280 - padTop - padBottom;
    const n = monthlyAllAsc.length;
    const minStep = 56;
    const innerW = n <= 1 ? minStep : (n - 1) * minStep;
    const svgW = padLeft + innerW + padRight;
    const stepX = n > 1 ? innerW / (n - 1) : 0;
    const toX = (i: number) => padLeft + i * stepX;
    const data = monthlyAllAsc.map((d, i) => ({ ...d, i, x: toX(i) }));
    const maxRevenue = data.length ? Math.max(...data.map((m) => m.revenue), 0) : 1;
    const minProfit = data.length ? Math.min(...data.map((m) => m.profit), 0) : 0;
    const maxProfitAbs = data.length ? Math.max(...data.map((m) => Math.abs(m.profit)), 0) : 1;
    const maxY = Math.max(maxRevenue, maxProfitAbs, 1);
    const minY = Math.min(minProfit, 0);
    const rangeY = maxY - minY || 1;
    const toY = (val: number) => padTop + chartH - ((val - minY) / rangeY) * chartH;
    return {
      padLeft,
      padRight,
      padTop,
      padBottom,
      chartH,
      svgW,
      n,
      data,
      toY,
      innerW,
      minY,
      maxY,
      rangeY,
    };
  }, [monthlyAllAsc]);

  if (finLoading) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
        <p className="text-sm text-[var(--muted-foreground)]">Загрузка финансов и Profi…</p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      {finErr ? <p className="text-sm font-medium text-[var(--danger)]">{finErr}</p> : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">Финансы агентства</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Те же данные, что в{" "}
            <Link href={appPath("/agency/statistics")} className="font-semibold text-[var(--primary)] hover:underline">
              статистике агентства
            </Link>
            . Обновление каждые 90 с и при возврате на вкладку.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
          <div className="text-sm text-[var(--muted-foreground)]">Средняя месячная выручка</div>
          <div className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
            {avgMonthlyRevenue.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽
          </div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">За последние 12 месяцев (агентство)</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
          <div className="text-sm text-[var(--muted-foreground)]">Средняя месячная прибыль</div>
          <div
            className={`mt-1 text-2xl font-bold ${avgMonthlyProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
          >
            {avgMonthlyProfit.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽
          </div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">За последние 12 месяцев (агентство)</div>
        </div>
      </div>

      {/* Длинный график за всю историю */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
        <h3 className="text-base font-semibold text-[var(--text)]">Выручка и прибыль по месяцам (вся история)</h3>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Прокрутка вбок. Наведите на точку месяца — подсказка. Новые месяцы подтягиваются при обновлении данных.
        </p>
        {monthlyAllAsc.length === 0 ? (
          <div className="mt-4 flex h-48 items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-sm text-[var(--muted-foreground)]">
            Нет записей в истории месяцев.
          </div>
        ) : (
          <div className="relative mt-4">
            <div className="max-w-full overflow-x-auto overflow-y-hidden rounded-lg border border-[var(--border)] bg-[var(--bg)]/20">
              {(() => {
                const { padLeft, padRight, padTop, padBottom, chartH, svgW, data, toY, n, minY, rangeY } =
                  chartGeom;
                const revGradId = `dashRevGrad-${chartDomId}`;
                const profGradId = `dashProfGrad-${chartDomId}`;
                const revenuePoints = data.map((d) => `${d.x},${toY(d.revenue)}`).join(" ");
                const profitPoints = data.map((d) => `${d.x},${toY(d.profit)}`).join(" ");
                const chartBottom = padTop + chartH;
                const revenueArea = `M ${data[0]!.x},${chartBottom} L ${revenuePoints.replace(/ /g, " L ")} L ${data[n - 1]!.x},${chartBottom} Z`;
                const profitArea = `M ${data[0]!.x},${chartBottom} L ${profitPoints.replace(/ /g, " L ")} L ${data[n - 1]!.x},${chartBottom} Z`;

                return (
                  <svg
                    width={svgW}
                    height={280}
                    className="block min-h-[280px] min-w-full"
                    style={{ minWidth: `${Math.max(svgW, 400)}px` }}
                    onMouseLeave={() => setChartTip(null)}
                  >
                    <defs>
                      <linearGradient id={revGradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id={profGradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                      const y = padTop + (1 - t) * chartH;
                      return (
                        <line
                          key={t}
                          x1={padLeft}
                          y1={y}
                          x2={svgW - padRight}
                          y2={y}
                          stroke="var(--border)"
                          strokeWidth="1"
                        />
                      );
                    })}
                    {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                      const val = minY + t * rangeY;
                      const y = padTop + (1 - t) * chartH;
                      return (
                        <text
                          key={t}
                          x={52}
                          y={y + 4}
                          textAnchor="end"
                          fill="var(--muted-foreground)"
                          style={{ fontSize: 11, fontFamily: "system-ui, sans-serif" }}
                        >
                          {Math.round(val).toLocaleString("ru-RU")}
                        </text>
                      );
                    })}
                    <path d={revenueArea} fill={`url(#${revGradId})`} />
                    <path d={profitArea} fill={`url(#${profGradId})`} />
                    <polyline
                      points={revenuePoints}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points={profitPoints}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {data.map((d) => {
                      const hitR = 22;
                      return (
                        <g key={d.key}>
                          <circle cx={d.x} cy={toY(d.revenue)} r={3.5} fill="#3b82f6" />
                          <circle cx={d.x} cy={toY(d.profit)} r={3.5} fill="#22c55e" />
                          <rect
                            x={d.x - hitR}
                            y={padTop}
                            width={hitR * 2}
                            height={chartH}
                            fill="transparent"
                            className="cursor-crosshair"
                            onMouseEnter={(e) =>
                              setChartTip({
                                clientX: e.clientX,
                                clientY: e.clientY,
                                month: d.month,
                                revenue: d.revenue,
                                profit: d.profit,
                              })
                            }
                            onMouseMove={(e) =>
                              setChartTip({
                                clientX: e.clientX,
                                clientY: e.clientY,
                                month: d.month,
                                revenue: d.revenue,
                                profit: d.profit,
                              })
                            }
                          />
                        </g>
                      );
                    })}
                    {data.map((d) => {
                      const [monthWord, yearStr] = d.month.split(" ");
                      const xLabel = `${(monthWord ?? "").slice(0, 3)} ${(yearStr ?? "").slice(-2)}`;
                      return (
                        <text
                          key={`${d.key}-x`}
                          x={d.x}
                          y={268}
                          textAnchor="middle"
                          fill="var(--muted-foreground)"
                          style={{ fontSize: 10, fontFamily: "system-ui, sans-serif" }}
                        >
                          {xLabel}
                        </text>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>
            {chartTip ? (
              <div
                className="pointer-events-none fixed z-[100] max-w-[min(90vw,18rem)] rounded-lg border border-[var(--border)] bg-[var(--text)] px-3 py-2 text-xs text-[var(--surface)] shadow-[var(--shadow-elevated)]"
                style={{
                  left: chartTip.clientX + 12,
                  top: chartTip.clientY,
                  transform: "translate(0, -100%)",
                }}
              >
                <div className="mb-1 font-semibold opacity-90">{chartTip.month}</div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  <span>Выручка: {chartTip.revenue.toLocaleString("ru-RU")} ₽</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
                  <span>Прибыль: {chartTip.profit.toLocaleString("ru-RU")} ₽</span>
                </div>
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-6 rounded-full bg-blue-500" />
                <span className="text-xs text-[var(--muted-foreground)]">Выручка агентства</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-6 rounded-full bg-green-500" />
                <span className="text-xs text-[var(--muted-foreground)]">Прибыль агентства</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {revenueByService && revenueByService.items.length > 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
          <h3 className="text-xl font-semibold text-[var(--text)]">Выручка по типам услуг</h3>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            За всё время. Как в статистике агентства.
          </p>
          <div className="mt-6 space-y-5">
            {revenueByService.items.map((item, index) => {
              const colors = [
                "bg-[var(--primary)]",
                "bg-violet-500",
                "bg-amber-500",
                "bg-emerald-500",
                "bg-rose-500",
              ];
              const color = colors[index % colors.length];
              const label = SERVICE_TYPE_LABELS[item.serviceType] || item.serviceType;
              return (
                <div key={item.serviceType} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <div className="shrink-0 sm:w-40">
                    <div className="text-sm font-medium text-[var(--text)]">{label}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {item.count}{" "}
                      {item.count === 1 ? "проект" : item.count < 5 ? "проекта" : "проектов"}
                    </div>
                  </div>
                  <div className="flex min-h-[32px] flex-1 items-center gap-3">
                    <div className="h-8 flex-1 overflow-hidden rounded-lg bg-[var(--surface-2)]">
                      <div
                        className={`h-full ${color} rounded-lg transition-all duration-500`}
                        style={{ width: `${Math.max(item.percent, 1)}%` }}
                        title={`${item.percent}% · ${item.totalAmount.toLocaleString("ru-RU")} ₽`}
                      />
                    </div>
                    <div className="w-24 shrink-0 text-right sm:w-28">
                      <div className="text-sm font-semibold tabular-nums text-[var(--text)]">
                        {item.totalAmount.toLocaleString("ru-RU")} ₽
                      </div>
                      <div className="text-xs tabular-nums text-[var(--muted-foreground)]">{item.percent}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <div className="mb-2 text-xs font-medium text-[var(--muted-foreground)]">Состав выручки</div>
            <div className="flex h-10 overflow-hidden rounded-lg">
              {revenueByService.items.map((item, index) => {
                const colors = [
                  "bg-[var(--primary)]",
                  "bg-violet-500",
                  "bg-amber-500",
                  "bg-emerald-500",
                  "bg-rose-500",
                ];
                return (
                  <div
                    key={item.serviceType}
                    className={`${colors[index % colors.length]} flex min-w-0 items-center justify-center transition-all hover:opacity-90`}
                    style={{ width: `${Math.max(item.percent, 2)}%` }}
                    title={`${SERVICE_TYPE_LABELS[item.serviceType] || item.serviceType}: ${item.percent}% · ${item.totalAmount.toLocaleString("ru-RU")} ₽`}
                  >
                    {item.percent >= 12 ? (
                      <span className="truncate px-1 text-xs font-medium text-white">
                        {SERVICE_TYPE_LABELS[item.serviceType] || item.serviceType}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex justify-between text-sm font-semibold text-[var(--text)]">
              <span>Итого</span>
              <span>{revenueByService.total.toLocaleString("ru-RU")} ₽</span>
            </div>
          </div>
        </div>
      ) : null}

      {revenueByClient && revenueByClient.items.length > 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
          <h3 className="text-xl font-semibold text-[var(--text)]">Выручка по типам клиентов</h3>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">За всё время.</p>
          <div className="mt-6 space-y-5">
            {revenueByClient.items.map((item, index) => {
              const colors = [
                "bg-[var(--primary)]",
                "bg-violet-500",
                "bg-amber-500",
                "bg-emerald-500",
                "bg-rose-500",
              ];
              const color = colors[index % colors.length];
              const label = (CLIENT_TYPE_LABELS[item.clientType] ?? item.clientType) || "Не указан";
              return (
                <div key={item.clientType || "__empty__"} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <div className="shrink-0 sm:w-40">
                    <div className="text-sm font-medium text-[var(--text)]">{label}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {item.count}{" "}
                      {item.count === 1 ? "проект" : item.count < 5 ? "проекта" : "проектов"}
                    </div>
                  </div>
                  <div className="flex min-h-[32px] flex-1 items-center gap-3">
                    <div className="h-8 flex-1 overflow-hidden rounded-lg bg-[var(--surface-2)]">
                      <div
                        className={`h-full ${color} rounded-lg transition-all duration-500`}
                        style={{ width: `${Math.max(item.percent, 1)}%` }}
                        title={`${item.percent}% · ${item.totalAmount.toLocaleString("ru-RU")} ₽`}
                      />
                    </div>
                    <div className="w-24 shrink-0 text-right sm:w-28">
                      <div className="text-sm font-semibold tabular-nums text-[var(--text)]">
                        {item.totalAmount.toLocaleString("ru-RU")} ₽
                      </div>
                      <div className="text-xs tabular-nums text-[var(--muted-foreground)]">{item.percent}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <div className="mb-2 text-xs font-medium text-[var(--muted-foreground)]">Состав выручки</div>
            <div className="flex h-10 overflow-hidden rounded-lg">
              {revenueByClient.items.map((item, index) => {
                const colors = [
                  "bg-[var(--primary)]",
                  "bg-violet-500",
                  "bg-amber-500",
                  "bg-emerald-500",
                  "bg-rose-500",
                ];
                const label = (CLIENT_TYPE_LABELS[item.clientType] ?? item.clientType) || "Не указан";
                return (
                  <div
                    key={item.clientType || "__empty__"}
                    className={`${colors[index % colors.length]} flex min-w-0 items-center justify-center transition-all hover:opacity-90`}
                    style={{ width: `${Math.max(item.percent, 2)}%` }}
                    title={`${label}: ${item.percent}% · ${item.totalAmount.toLocaleString("ru-RU")} ₽`}
                  >
                    {item.percent >= 12 ? (
                      <span className="truncate px-1 text-xs font-medium text-white">{label}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex justify-between text-sm font-semibold text-[var(--text)]">
              <span>Итого</span>
              <span>{revenueByClient.total.toLocaleString("ru-RU")} ₽</span>
            </div>
          </div>
        </div>
      ) : null}

      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">Profi.ru</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Показатели как в{" "}
              <Link href={appPath("/sales/analytics#profi")} className="font-semibold text-[var(--primary)] hover:underline">
                аналитике
              </Link>{" "}
              и разделе{" "}
              <Link href={appPath("/sales/profi")} className="font-semibold text-[var(--primary)] hover:underline">
                Profi
              </Link>
              .
            </p>
          </div>
        </div>
        {profiStats ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <EconomyPanel stats={profiStats} />
            <ConversionsPanel stats={profiStats} />
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">Нет данных Profi.ru.</p>
        )}
      </div>
    </section>
  );
}
