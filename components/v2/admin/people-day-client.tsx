"use client";

import { PAY_TYPE_LABELS, fmtRub, type TtPayType } from "@/lib/v2/admin/compensation";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { fmtDuration } from "@/lib/v2/format";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type SessionRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  task_title: string;
  project_name: string | null;
};

type MonthStats = {
  month: string;
  loggedSeconds: number;
  payType: TtPayType;
  monthCostRub: number | null;
  effectiveHourlyRub: number | null;
  byProject: Array<{ projectId: string | null; projectName: string; loggedSeconds: number }>;
};

function currentMonthInput(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

export function V2AdminPeopleDayClient({ userId }: { userId: string }) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "month" ? "month" : "day";
  const [tab, setTab] = useState<"day" | "month">(initialTab);
  const [date, setDate] = useState(searchParams.get("date") ?? new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(searchParams.get("month") ?? currentMonthInput());
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [monthStats, setMonthStats] = useState<MonthStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "day") return;
    fetchJson<{ sessions: SessionRow[] }>(`/api/v2/admin/people/${userId}/day?date=${encodeURIComponent(date)}`)
      .then((d) => setSessions(d.sessions))
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"));
  }, [userId, date, tab]);

  useEffect(() => {
    if (tab !== "month") return;
    fetchJson<{ stats: MonthStats }>(`/api/v2/admin/people/${userId}/month?month=${encodeURIComponent(month)}`)
      .then((d) => setMonthStats(d.stats))
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"));
  }, [userId, month, tab]);

  const dayTotal = useMemo(() => sessions.reduce((a, s) => a + s.duration_seconds, 0), [sessions]);

  const monthLabel = monthStats
    ? new Date(`${monthStats.month}-01`).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
    : "";

  return (
    <div className="px-7 py-6">
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Учёт времени сотрудника</h1>
        <div className="flex rounded-xl border border-[var(--v2-ink-200)] bg-white p-1">
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${tab === "day" ? "bg-[var(--v2-ink-900)] text-white" : "text-[var(--v2-ink-600)]"}`}
            onClick={() => setTab("day")}
          >
            День
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${tab === "month" ? "bg-[var(--v2-ink-900)] text-white" : "text-[var(--v2-ink-600)]"}`}
            onClick={() => setTab("month")}
          >
            Месяц
          </button>
        </div>
        {tab === "day" ? (
          <input type="date" className="v2-input w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
        ) : (
          <input
            type="month"
            className="v2-input w-auto"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        )}
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {tab === "day" ? (
        <>
          <p className="mb-4 text-sm text-[var(--v2-ink-500)]">
            Итого за день: <span className="v2-tnum font-medium">{fmtDuration(dayTotal)}</span>
          </p>
          <div className="v2-card divide-y">
            {sessions.length === 0 && <p className="p-4 text-sm text-[var(--v2-ink-500)]">Нет сессий</p>}
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 text-[13px]">
                <div>
                  <div className="font-medium">{s.task_title}</div>
                  <div className="text-[11px] text-[var(--v2-ink-500)]">
                    {s.project_name ?? "—"} ·{" "}
                    {new Date(s.started_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    {s.ended_at == null ? " · идёт" : ""}
                  </div>
                </div>
                <span className="v2-tnum">{fmtDuration(s.duration_seconds)}</span>
              </div>
            ))}
          </div>
        </>
      ) : monthStats ? (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-4">
            <div className="v2-card p-4">
              <div className="text-[11px] text-[var(--v2-ink-500)]">Период</div>
              <div className="v2-tight mt-1 font-semibold capitalize">{monthLabel}</div>
            </div>
            <div className="v2-card p-4">
              <div className="text-[11px] text-[var(--v2-ink-500)]">Отработано</div>
              <div className="v2-tnum mt-1 text-lg font-semibold">{fmtDuration(monthStats.loggedSeconds)}</div>
            </div>
            <div className="v2-card p-4">
              <div className="text-[11px] text-[var(--v2-ink-500)]">
                {PAY_TYPE_LABELS[monthStats.payType]} · к оплате
              </div>
              <div className="v2-tnum mt-1 text-lg font-semibold">{fmtRub(monthStats.monthCostRub)}</div>
            </div>
            <div className="v2-card p-4">
              <div className="text-[11px] text-[var(--v2-ink-500)]">Эффективно ₽/час</div>
              <div className="v2-tnum mt-1 text-lg font-semibold">{fmtRub(monthStats.effectiveHourlyRub)}</div>
            </div>
          </div>

          <h2 className="mb-3 text-[15px] font-semibold">По проектам</h2>
          <div className="v2-card divide-y">
            {monthStats.byProject.length === 0 && (
              <p className="p-4 text-sm text-[var(--v2-ink-500)]">Нет записей за месяц</p>
            )}
            {monthStats.byProject.map((p) => (
              <div key={p.projectId ?? "none"} className="flex items-center justify-between px-4 py-3 text-[13px]">
                <div className="font-medium">{p.projectName}</div>
                <span className="v2-tnum">{fmtDuration(p.loggedSeconds)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-[var(--v2-ink-500)]">Загрузка…</p>
      )}
    </div>
  );
}
