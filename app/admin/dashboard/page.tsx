"use client";

import { AdminDashboardFinanceSection } from "@/components/admin/admin-dashboard-finance";
import { apiUrl, appPath } from "@/lib/api-url";
import { TT_ROLE_LABELS, TT_USER_ROLES, type TtUserRole } from "@/lib/roles";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const WDAYS: { v: number; l: string }[] = [
  { v: 1, l: "Пн" },
  { v: 2, l: "Вт" },
  { v: 3, l: "Ср" },
  { v: 4, l: "Чт" },
  { v: 5, l: "Пт" },
  { v: 6, l: "Сб" },
  { v: 0, l: "Вс" },
];

type ByDayRow = { date: string; seconds: number; hours: number };

type DashUser = {
  id: string;
  login: string;
  display_name: string;
  job_title: string;
  role: TtUserRole;
  weekly_capacity_hours: number;
  work_hours_per_day: number;
  work_days: number[];
  avatar_url: string | null;
  auth_email: string | null;
  created_at: string;
  monthTotalSeconds: number;
  monthTotalHours: number;
  byDay: ByDayRow[];
};

function monthYmFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function daysInMonthKeys(ym: string): string[] {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return [];
  const last = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  return Array.from({ length: last }, (_, i) => `${y}-${mm}-${String(i + 1).padStart(2, "0")}`);
}

function dayLabel(ymd: string): string {
  const d = new Date(ymd + "T12:00:00");
  return String(d.getDate());
}

export default function AdminDashboardPage() {
  const [month, setMonth] = useState(() => monthYmFromDate(new Date()));
  const [users, setUsers] = useState<DashUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newJob, setNewJob] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createdPw, setCreatedPw] = useState<{ email: string; password: string } | null>(null);

  const dayKeys = useMemo(() => daysInMonthKeys(month), [month]);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch(apiUrl(`/api/admin/dashboard-month?month=${encodeURIComponent(month)}`));
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Не удалось загрузить");
      setUsers(Array.isArray(d.users) ? d.users : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRoleChange(userId: string, role: TtUserRole) {
    setSavingId(userId);
    setErr(null);
    setNotice(null);
    try {
      const r = await fetch(apiUrl(`/api/admin/users/${encodeURIComponent(userId)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Не удалось сохранить");
      if (d.user) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  ...d.user,
                  monthTotalSeconds: u.monthTotalSeconds,
                  monthTotalHours: u.monthTotalHours,
                  byDay: u.byDay,
                }
              : u
          )
        );
      } else await load();
      setNotice("Роль сохранена. Пользователю нужно перелогиниться, чтобы обновилась сессия.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSavingId(null);
    }
  }

  async function saveSchedule(
    userId: string,
    patch: { work_hours_per_day?: number; work_days?: number[]; weekly_capacity_hours?: number }
  ) {
    setSavingId(userId);
    setErr(null);
    setNotice(null);
    try {
      const r = await fetch(apiUrl(`/api/admin/users/${encodeURIComponent(userId)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Ошибка сохранения");
      if (d.user) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  ...d.user,
                  monthTotalSeconds: u.monthTotalSeconds,
                  monthTotalHours: u.monthTotalHours,
                  byDay: u.byDay,
                }
              : u
          )
        );
      } else await load();
      setNotice("График работы сохранён.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSavingId(null);
    }
  }

  async function regeneratePassword(userId: string) {
    if (!confirm("Сгенерировать новый пароль? Старый перестанет работать.")) return;
    setSavingId(userId);
    setErr(null);
    try {
      const r = await fetch(apiUrl(`/api/admin/users/${encodeURIComponent(userId)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regeneratePassword: true }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Ошибка");
      if (typeof d.temporaryPassword === "string") {
        setCreatedPw({ email: users.find((u) => u.id === userId)?.login ?? userId, password: d.temporaryPassword });
      }
      setNotice("Новый пароль сгенерирован — скопируйте из блока ниже.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSavingId(null);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateBusy(true);
    setErr(null);
    setCreatedPw(null);
    try {
      const r = await fetch(apiUrl("/api/admin/users"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          displayName: newName.trim() || undefined,
          jobTitle: newJob.trim() || undefined,
          role: "member",
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Не удалось создать");
      if (d.user && typeof d.temporaryPassword === "string") {
        setCreatedPw({ email: newEmail.trim(), password: d.temporaryPassword });
        setNewEmail("");
        setNewName("");
        setNewJob("");
        setNotice("Сотрудник создан. Передайте пароль один раз.");
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">Дашборд</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Часы по месяцу и по дням, управление сотрудниками: роли, пароли, график работы.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Месяц
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="tt-input ml-2 mt-1 block py-2 text-sm"
            />
          </label>
          <Link href={appPath("/home")} className="text-sm font-semibold text-[var(--primary)] hover:underline">
            ← Главная
          </Link>
        </div>
      </div>

      {notice ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          {notice}
        </p>
      ) : null}
      {err ? <p className="text-sm font-medium text-[var(--danger)]">{err}</p> : null}

      {createdPw ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm shadow-sm">
          <p className="mb-2 font-semibold text-[var(--text)]">Временный пароль (скопируйте сейчас)</p>
          <p className="mb-1 text-[var(--muted-foreground)]">Логин / email: {createdPw.email}</p>
          <code className="block select-all rounded-lg bg-[var(--surface)] px-3 py-2 font-mono text-[var(--text)]">
            {createdPw.password}
          </code>
          <button type="button" className="mt-2 text-xs text-[var(--primary)] underline" onClick={() => setCreatedPw(null)}>
            Скрыть
          </button>
        </div>
      ) : null}

      <AdminDashboardFinanceSection />

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] md:p-6">
        <h2 className="text-lg font-semibold text-[var(--text)]">Новый сотрудник</h2>
        <form onSubmit={(e) => void createUser(e)} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Email (логин)</label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="tt-input w-full text-sm"
              placeholder="name@company.com"
            />
          </div>
          <div className="min-w-[8rem] flex-1">
            <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Имя</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="tt-input w-full text-sm"
            />
          </div>
          <div className="min-w-[8rem] flex-1">
            <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Должность</label>
            <input
              type="text"
              value={newJob}
              onChange={(e) => setNewJob(e.target.value)}
              className="tt-input w-full text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={createBusy}
            className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[var(--primary)]/25 hover:brightness-110 disabled:opacity-50"
          >
            {createBusy ? "Создание…" : "Создать и выдать пароль"}
          </button>
        </form>
      </section>

      {loading ? (
        <p className="text-sm text-[var(--muted-foreground)]">Загрузка…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">Нет пользователей</p>
      ) : (
        <div className="space-y-10">
          {users.map((u) => {
            const hoursByDate = new Map(u.byDay.map((d) => [d.date, d.hours]));
            const maxH = Math.max(0.01, ...dayKeys.map((dk) => hoursByDate.get(dk) ?? 0));
            return (
              <article
                key={u.id}
                className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]"
              >
                <div className="border-b border-[var(--border)]/60 bg-[var(--surface-2)]/30 px-4 py-4 md:flex md:items-start md:justify-between md:gap-4 md:px-6">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text)]">{u.display_name}</h3>
                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)] tabular-nums">{u.login}</p>
                    {u.job_title ? <p className="mt-1 text-sm text-[var(--muted-foreground)]">{u.job_title}</p> : null}
                  </div>
                  <div className="mt-3 text-right md:mt-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Всего за месяц</p>
                    <p className="text-2xl font-bold tabular-nums text-[var(--primary)]">{u.monthTotalHours} ч</p>
                  </div>
                </div>

                <div className="border-b border-[var(--border)]/50 px-4 py-4 md:px-6">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                    Часы по дням ({month})
                  </p>
                  <div className="flex max-w-full items-end gap-px overflow-x-auto pb-1 pt-1">
                    {dayKeys.map((dk, di) => {
                      const h = hoursByDate.get(dk) ?? 0;
                      const pct = (h / maxH) * 100;
                      const weekend =
                        new Date(dk + "T12:00:00").getDay() === 0 || new Date(dk + "T12:00:00").getDay() === 6;
                      return (
                        <div
                          key={dk}
                          className="flex min-w-[9px] max-w-[16px] flex-1 flex-col items-center gap-0.5"
                          title={`${dk}: ${h} ч`}
                        >
                          <div
                            className={`flex h-28 w-full items-end justify-center rounded-t bg-[var(--surface-2)]/90 ${
                              weekend ? "opacity-65" : ""
                            }`}
                          >
                            <div
                              className="w-[70%] max-w-[13px] rounded-t bg-[var(--primary)] shadow-sm shadow-[var(--primary)]/20"
                              style={{
                                height: `${Math.max(h > 0 ? 6 : 0, pct)}%`,
                                minHeight: h > 0 ? 3 : 0,
                              }}
                            />
                          </div>
                          <span
                            className={`text-[8px] leading-none tabular-nums ${
                              di % 2 === 0 || h > 0 ? "text-[var(--muted-foreground)]" : "text-transparent"
                            }`}
                          >
                            {dayLabel(dk)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
                    Высота столбца — относительно максимума у этого сотрудника в выбранном месяце. Подсказка с точными часами — при
                    наведении.
                  </p>
                </div>

                <div className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Роль</p>
                    <select
                      value={u.role}
                      disabled={savingId === u.id}
                      onChange={(e) => void onRoleChange(u.id, e.target.value as TtUserRole)}
                      className="tt-select w-full max-w-xs py-2 text-sm disabled:opacity-50"
                      aria-label={`Роль ${u.display_name}`}
                    >
                      {TT_USER_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {TT_ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Пароль</p>
                    <button
                      type="button"
                      disabled={savingId === u.id}
                      onClick={() => void regeneratePassword(u.id)}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface)] disabled:opacity-50"
                    >
                      Сгенерировать новый пароль
                    </button>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      Часов в рабочий день
                    </p>
                    <input
                      type="number"
                      step={0.5}
                      min={0.25}
                      max={24}
                      defaultValue={u.work_hours_per_day}
                      key={`wh-${u.id}-${u.work_hours_per_day}`}
                      disabled={savingId === u.id}
                      className="tt-input w-full max-w-xs py-2 text-sm tabular-nums"
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!Number.isFinite(v) || v === u.work_hours_per_day) return;
                        void saveSchedule(u.id, { work_hours_per_day: v });
                      }}
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      Рабочие дни недели
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {WDAYS.map(({ v, l }) => {
                        const on = u.work_days.includes(v);
                        return (
                          <button
                            key={v}
                            type="button"
                            disabled={savingId === u.id}
                            onClick={() => {
                              const next = on ? u.work_days.filter((x) => x !== v) : [...u.work_days, v].sort((a, b) => a - b);
                              if (next.length === 0) return;
                              void saveSchedule(u.id, { work_days: next });
                            }}
                            className={`rounded-lg border px-2 py-1 text-[11px] font-medium ${
                              on
                                ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                                : "border-[var(--border)] text-[var(--muted-foreground)]"
                            } disabled:opacity-50`}
                          >
                            {l}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
