"use client";

import { WorkScheduleEditor } from "@/components/v2/admin/work-schedule-editor";
import { MemberAvatar } from "@/components/v2/projects/project-atoms";
import { appPath } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { fmtDuration } from "@/lib/v2/format";
import { gradientForUser, initialsFromName, pluralRu } from "@/lib/v2/projects/portfolio-utils";
import { fmtLoadSeconds } from "@/lib/v2/team/daily-team-load";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type PeopleRow = {
  userId: string;
  displayName: string;
  jobTitle: string;
  weeklyHoursNorm: number;
  hourlyRateRub: number | null;
  workHoursPerDay: number;
  workDays: number[];
  todayLoad: number;
  todayTaskCount: number;
  todayEstimatedSeconds: number;
  todayCapacitySeconds: number;
  isWorkDayToday: boolean;
  weeks: Array<{ weekStart: string; loggedSeconds: number; normSeconds: number; status: string }>;
  totalLoggedSeconds: number;
};

function statusColor(status: string) {
  if (status === "under") return "bg-amber-200";
  if (status === "over") return "bg-red-200";
  return "bg-emerald-200";
}

function loadBarColor(load: number, isWorkDay: boolean) {
  if (!isWorkDay) return "#A1A1AA";
  if (load > 0.95) return "#EF4444";
  if (load > 0.85) return "#F59E0B";
  return "#3B6FF7";
}

function TodayLoadBar({ row }: { row: PeopleRow }) {
  const pct = row.isWorkDayToday ? Math.min(row.todayLoad, 1) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--v2-ink-500)]">
        <span>
          {row.todayTaskCount > 0 ? (
            <>
              {row.todayTaskCount} {pluralRu(row.todayTaskCount, ["задача", "задачи", "задач"])}
              {row.isWorkDayToday ? (
                <>
                  {" "}
                  · {fmtLoadSeconds(row.todayEstimatedSeconds)} / {fmtLoadSeconds(row.todayCapacitySeconds)}
                </>
              ) : (
                <> · выходной</>
              )}
            </>
          ) : (
            <>Нет задач на сегодня</>
          )}
        </span>
        <span className="v2-tnum font-medium text-[var(--v2-ink-700)]">
          {row.isWorkDayToday ? `${Math.round(row.todayLoad * 100)}%` : "—"}
        </span>
      </div>
      <div className="h-[6px] w-full overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${pct * 100}%`,
            background: loadBarColor(row.todayLoad, row.isWorkDayToday),
          }}
        />
      </div>
    </div>
  );
}

export function V2AdminPeopleClient() {
  const [rows, setRows] = useState<PeopleRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchJson<{ people: PeopleRow[] }>("/api/v2/admin/people")
      .then((d) => setRows(d.people))
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patchUser(
    userId: string,
    body: Record<string, unknown>,
    optimistic: (r: PeopleRow) => PeopleRow
  ) {
    setSavingId(userId);
    setError(null);
    const prev = rows.find((r) => r.userId === userId);
    setRows((list) => list.map((r) => (r.userId === userId ? optimistic(r) : r)));
    try {
      const res = await fetchJson<{
        user: { hourly_rate_rub: number | null; work_hours_per_day: number; work_days: number[] };
      }>(`/api/v2/admin/people/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setRows((list) =>
        list.map((r) =>
          r.userId === userId
            ? {
                ...r,
                hourlyRateRub: res.user.hourly_rate_rub,
                workHoursPerDay: res.user.work_hours_per_day,
                workDays: res.user.work_days,
              }
            : r
        )
      );
      load();
    } catch (e) {
      if (prev) setRows((list) => list.map((r) => (r.userId === userId ? prev : r)));
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSavingId(null);
    }
  }

  async function saveHourlyRate(userId: string, value: string, prev: number | null) {
    const trimmed = value.trim();
    const next = trimmed === "" ? null : Math.round(Number(trimmed.replace(/\s/g, "")));
    if (trimmed !== "" && (!Number.isFinite(next!) || next! < 0)) return;
    if (next === prev || (next == null && prev == null)) return;
    await patchUser(userId, { hourly_rate_rub: next }, (r) => ({ ...r, hourlyRateRub: next }));
  }

  async function saveSchedule(
    userId: string,
    hours: number,
    days: number[],
    prev: Pick<PeopleRow, "workHoursPerDay" | "workDays">
  ) {
    if (hours === prev.workHoursPerDay && JSON.stringify(days) === JSON.stringify(prev.workDays)) return;
    await patchUser(userId, { work_hours_per_day: hours, work_days: days }, (r) => ({
      ...r,
      workHoursPerDay: hours,
      workDays: days,
    }));
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="px-7 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Команда</h1>
        <p className="v2-tight mt-2 max-w-2xl text-[13px] text-[var(--v2-ink-500)]">
          График работы задаёт ёмкость дня. Загрузка на сегодня — сумма оценок задач (сегодня и просроченных), делённая на
          рабочие часы сотрудника.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => {
          const member = {
            userId: r.userId,
            name: r.displayName,
            initials: initialsFromName(r.displayName),
            gradient: gradientForUser(r.userId),
          };
          const saving = savingId === r.userId;

          return (
            <div key={r.userId} className="v2-card flex flex-col p-5">
              <div className="flex items-start gap-3">
                <MemberAvatar member={member} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="v2-tight truncate font-semibold text-[var(--v2-ink-900)]">{r.displayName}</div>
                  <div className="v2-tight truncate text-[12px] text-[var(--v2-ink-500)]">
                    {r.jobTitle || `${r.weeklyHoursNorm}ч/нед`}
                  </div>
                </div>
                <Link
                  href={appPath(`/v2/admin/people/${r.userId}?date=${today}`)}
                  className="v2-tight shrink-0 text-[12px] font-medium text-[var(--v2-brand-600)] hover:text-[var(--v2-brand-700)]"
                >
                  День →
                </Link>
              </div>

              <div className="mt-4 rounded-xl bg-[var(--v2-ink-50)] p-3">
                <div className="v2-tight mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
                  Загрузка сегодня
                </div>
                <TodayLoadBar row={r} />
              </div>

              <div className="mt-4">
                <div className="v2-tight mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
                  График
                </div>
                <WorkScheduleEditor
                  hoursPerDay={r.workHoursPerDay}
                  workDays={r.workDays}
                  disabled={saving}
                  onChangeHours={(hours) => {
                    void saveSchedule(r.userId, hours, r.workDays, {
                      workHoursPerDay: r.workHoursPerDay,
                      workDays: r.workDays,
                    });
                  }}
                  onChangeDays={(days) => {
                    void saveSchedule(r.userId, r.workHoursPerDay, days, {
                      workHoursPerDay: r.workHoursPerDay,
                      workDays: r.workDays,
                    });
                  }}
                />
              </div>

              <div className="mt-4 flex items-end justify-between gap-3 border-t border-[var(--v2-ink-100)] pt-4">
                <div>
                  <div className="v2-tight text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
                    ₽ / час
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    defaultValue={r.hourlyRateRub != null ? String(r.hourlyRateRub) : ""}
                    key={`rate-${r.userId}-${r.hourlyRateRub ?? "x"}`}
                    disabled={saving}
                    placeholder="—"
                    className="v2-tnum mt-1 w-28 rounded-lg border border-[var(--v2-ink-200)] bg-white px-2.5 py-1.5 text-[13px] disabled:opacity-50"
                    onBlur={(e) => void saveHourlyRate(r.userId, e.target.value, r.hourlyRateRub)}
                  />
                </div>
                <div className="text-right">
                  <div className="v2-tight text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
                    6 недель
                  </div>
                  <div className="mt-1.5 flex justify-end gap-1">
                    {r.weeks.map((w) => (
                      <span
                        key={w.weekStart}
                        title={`${w.weekStart}: ${fmtDuration(w.loggedSeconds)}`}
                        className={`h-5 w-5 rounded ${statusColor(w.status)}`}
                      />
                    ))}
                  </div>
                  <div className="v2-tnum mt-1 text-[11px] text-[var(--v2-ink-500)]">
                    {fmtDuration(r.totalLoggedSeconds)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
