"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import { formatISOWeekParam, shiftISOWeek } from "@/lib/iso-week";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type LoadRow = {
  userId: string;
  name: string;
  role: string;
  capacityHours: number;
  hours: number;
  previousHours: number;
  deltaHours: number;
  status: "under" | "normal" | "over";
};

type TeamWeekPayload = {
  week: string;
  totalHours: number;
  totalCapacityHours: number;
  rows: LoadRow[];
};

type MarginWorker = {
  userId: string;
  name: string;
  role: string;
  hours: number;
  attributedRevenue: number;
  payouts: number;
  margin: number;
  projects: Array<{
    projectId: string;
    projectName: string;
    hours: number;
    attributedRevenue: number;
    payouts: number;
    margin: number;
  }>;
};

type MarginPayload = {
  week: string;
  byWorker: MarginWorker[];
};

function statusBadgeClass(status: LoadRow["status"]): string {
  if (status === "over") return "bg-red-100 text-red-700";
  if (status === "under") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

export default function TeamLoadPage() {
  const [week, setWeek] = useState(() => formatISOWeekParam());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TeamWeekPayload | null>(null);
  const [marginLoading, setMarginLoading] = useState(true);
  const [marginError, setMarginError] = useState<string | null>(null);
  const [marginData, setMarginData] = useState<MarginPayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(apiUrl(`/api/time-analytics/team-week?week=${encodeURIComponent(week)}`));
      const payload = (await r.json()) as TeamWeekPayload & { error?: string };
      if (!r.ok) throw new Error(payload.error || "Ошибка загрузки");
      setData(payload);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, [week]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMargin = useCallback(async () => {
    setMarginLoading(true);
    setMarginError(null);
    try {
      const r = await fetch(apiUrl(`/api/agency/margin/by-worker?week=${encodeURIComponent(week)}`));
      const payload = (await r.json()) as MarginPayload & { error?: string };
      if (!r.ok) throw new Error(payload.error || "Ошибка загрузки маржи");
      setMarginData(payload);
    } catch (e) {
      setMarginData(null);
      setMarginError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setMarginLoading(false);
    }
  }, [week]);

  useEffect(() => {
    void loadMargin();
  }, [loadMargin]);

  return (
    <div className="min-h-screen bg-slate-50/80 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link href={appPath("/board")} className="text-sm text-slate-600 hover:text-slate-900 underline">
          ← Канбан
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-slate-800 mb-1">Загрузка команды</h1>
      <p className="text-sm text-slate-500 mb-6">
        Недельная фактическая загрузка по сотрудникам с сравнением к прошлой неделе.
      </p>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setWeek((w) => shiftISOWeek(w, -1))}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            ← Неделя назад
          </button>
          <input
            type="week"
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
          />
          <button
            type="button"
            onClick={() => setWeek((w) => shiftISOWeek(w, 1))}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            Следующая неделя →
          </button>
        </div>

        {loading ? <p className="text-sm text-slate-500">Загрузка…</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {data && !loading ? (
          <>
            <div className="mb-4 flex flex-wrap gap-3 text-sm">
              <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700">
                Неделя: <span className="font-semibold tabular-nums">{data.week}</span>
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-800">
                Факт: <span className="font-semibold tabular-nums">{data.totalHours} ч</span>
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700">
                Ёмкость: <span className="font-semibold tabular-nums">{data.totalCapacityHours} ч</span>
              </span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="py-2 px-3">Сотрудник</th>
                    <th className="py-2 px-3 text-right">Факт</th>
                    <th className="py-2 px-3 text-right">Прошлая неделя</th>
                    <th className="py-2 px-3 text-right">Δ</th>
                    <th className="py-2 px-3 text-right">Ёмкость</th>
                    <th className="py-2 px-3">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 px-3 text-slate-500">
                        Нет данных по сотрудникам
                      </td>
                    </tr>
                  ) : (
                    data.rows.map((row) => (
                      <tr key={row.userId} className="border-b border-slate-50">
                        <td className="py-2 px-3">
                          <div className="font-medium text-slate-800">{row.name}</div>
                          <div className="text-xs text-slate-500">{row.role}</div>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">{row.hours} ч</td>
                        <td className="py-2 px-3 text-right tabular-nums">{row.previousHours} ч</td>
                        <td
                          className={`py-2 px-3 text-right tabular-nums ${
                            row.deltaHours > 0
                              ? "text-emerald-700"
                              : row.deltaHours < 0
                                ? "text-red-600"
                                : "text-slate-600"
                          }`}
                        >
                          {row.deltaHours > 0 ? "+" : ""}
                          {row.deltaHours} ч
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">{row.capacityHours} ч</td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex px-2 py-1 rounded-md text-xs ${statusBadgeClass(row.status)}`}>
                            {row.status === "over"
                              ? "Перегружен"
                              : row.status === "under"
                                ? "Недогружен"
                                : "Норма"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 mt-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Маржа и вклад сотрудников</h2>
        <p className="text-sm text-slate-500 mb-4">
          Формула: приписанная выручка = `totalAmount / часы проекта` × часы сотрудника; маржа = выручка − выплаты
          дизайнеру по проекту.
        </p>

        {marginLoading ? <p className="text-sm text-slate-500">Загрузка…</p> : null}
        {marginError ? <p className="text-sm text-red-600">{marginError}</p> : null}

        {marginData && !marginLoading ? (
          <div className="space-y-5">
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="py-2 px-3">Сотрудник</th>
                    <th className="py-2 px-3 text-right">Часы</th>
                    <th className="py-2 px-3 text-right">Приписанная выручка</th>
                    <th className="py-2 px-3 text-right">Выплаты</th>
                    <th className="py-2 px-3 text-right">Маржа</th>
                  </tr>
                </thead>
                <tbody>
                  {marginData.byWorker.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 px-3 text-slate-500">
                        Нет данных по марже за выбранную неделю
                      </td>
                    </tr>
                  ) : (
                    marginData.byWorker.map((row) => (
                      <tr key={row.userId} className="border-b border-slate-50">
                        <td className="py-2 px-3">
                          <div className="font-medium text-slate-800">{row.name}</div>
                          <div className="text-xs text-slate-500">{row.role}</div>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">{row.hours} ч</td>
                        <td className="py-2 px-3 text-right tabular-nums">{row.attributedRevenue.toLocaleString("ru-RU")} ₽</td>
                        <td className="py-2 px-3 text-right tabular-nums">{row.payouts.toLocaleString("ru-RU")} ₽</td>
                        <td
                          className={`py-2 px-3 text-right tabular-nums font-medium ${
                            row.margin >= 0 ? "text-emerald-700" : "text-red-600"
                          }`}
                        >
                          {row.margin.toLocaleString("ru-RU")} ₽
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {marginData.byWorker.map((worker) => (
              <div key={`${worker.userId}-projects`} className="rounded-lg border border-slate-100 p-3">
                <div className="text-sm font-semibold text-slate-800 mb-2">{worker.name}: проекты</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs md:text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-100">
                        <th className="py-1.5 pr-3">Проект</th>
                        <th className="py-1.5 pr-3 text-right">Часы</th>
                        <th className="py-1.5 pr-3 text-right">Выручка</th>
                        <th className="py-1.5 pr-3 text-right">Выплаты</th>
                        <th className="py-1.5 text-right">Маржа</th>
                      </tr>
                    </thead>
                    <tbody>
                      {worker.projects.map((p) => (
                        <tr key={p.projectId} className="border-b border-slate-50">
                          <td className="py-1.5 pr-3">{p.projectName}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{p.hours} ч</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{p.attributedRevenue.toLocaleString("ru-RU")} ₽</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{p.payouts.toLocaleString("ru-RU")} ₽</td>
                          <td
                            className={`py-1.5 text-right tabular-nums ${
                              p.margin >= 0 ? "text-emerald-700" : "text-red-600"
                            }`}
                          >
                            {p.margin.toLocaleString("ru-RU")} ₽
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
