"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import { formatISOWeekParam, shiftISOWeek } from "@/lib/iso-week";
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

type UserRow = {
  id: string;
  login: string;
  display_name: string;
  job_title: string;
  role: TtUserRole;
  weekly_capacity_hours: number;
  work_hours_per_day: number;
  work_days: number[];
  auth_email?: string | null;
};

type LoadDay = {
  date: string;
  shortLabel: string;
  capacityHours: number;
  loggedHours: number;
  plannedHours: number;
  loadHours: number;
  status: "under" | "normal" | "over";
};

type TeamWeekRow = {
  userId: string;
  name: string;
  role: string;
  capacityHours: number;
  hours: number;
  status: "under" | "normal" | "over";
  days?: LoadDay[];
};

type TeamWeekPayload = { week: string; rows: TeamWeekRow[] };

type DayPlanTask = {
  subtaskId: string;
  cardId: string;
  cardName: string;
  title: string;
  hoursOnDay: number;
};

type DayPlanUser = {
  userId: string;
  name: string;
  capacityHours: number;
  loggedHours: number;
  plannedHours: number;
  tasks: DayPlanTask[];
};

function statusBarClass(status: "under" | "normal" | "over"): string {
  if (status === "over") return "bg-red-500";
  if (status === "under") return "bg-amber-500";
  return "bg-emerald-500";
}

function weekStatusBadge(status: TeamWeekRow["status"]): string {
  if (status === "over") return "bg-red-100 text-red-800";
  if (status === "under") return "bg-amber-100 text-amber-900";
  return "bg-emerald-100 text-emerald-800";
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [week, setWeek] = useState(() => formatISOWeekParam());
  const [teamWeek, setTeamWeek] = useState<TeamWeekPayload | null>(null);
  const [teamWeekErr, setTeamWeekErr] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newJob, setNewJob] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createdPw, setCreatedPw] = useState<{ email: string; password: string } | null>(null);

  const [planDate, setPlanDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [planData, setPlanData] = useState<{ date: string; users: DayPlanUser[] } | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [planErr, setPlanErr] = useState<string | null>(null);

  const loadByUser = useMemo(() => {
    const m = new Map<string, TeamWeekRow>();
    for (const r of teamWeek?.rows ?? []) {
      m.set(r.userId, r);
    }
    return m;
  }, [teamWeek]);

  const load = useCallback(async () => {
    setErr(null);
    const r = await fetch(apiUrl("/api/admin/users"));
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(typeof d.error === "string" ? d.error : "Не удалось загрузить список");
      setUsers([]);
      return;
    }
    setUsers(Array.isArray(d.users) ? d.users : []);
  }, []);

  const loadTeamWeek = useCallback(async () => {
    setTeamWeekErr(null);
    try {
      const r = await fetch(apiUrl(`/api/time-analytics/team-week?week=${encodeURIComponent(week)}`));
      const d = (await r.json()) as TeamWeekPayload & { error?: string };
      if (!r.ok) throw new Error(d.error || "Ошибка загрузки недели");
      setTeamWeek(d);
    } catch (e) {
      setTeamWeek(null);
      setTeamWeekErr(e instanceof Error ? e.message : "Ошибка");
    }
  }, [week]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  useEffect(() => {
    void loadTeamWeek();
  }, [loadTeamWeek]);

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
      if (!r.ok) {
        throw new Error(typeof d.error === "string" ? d.error : "Не удалось сохранить");
      }
      if (d.user) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...d.user } : u)));
      } else {
        await load();
      }
      setNotice(
        "Роль сохранена. Пользователю нужно выйти и войти снова, чтобы обновилась сессия (доступ в интерфейсе)."
      );
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
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...d.user } : u)));
      } else await load();
      setNotice("График сохранён.");
      await loadTeamWeek();
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
      setNotice("Новый пароль сгенерирован — скопируйте из всплывающего блока.");
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
        setUsers((prev) => [...prev, d.user as UserRow].sort((a, b) => a.display_name.localeCompare(b.display_name, "ru")));
        setCreatedPw({ email: newEmail.trim(), password: d.temporaryPassword });
        setNewEmail("");
        setNewName("");
        setNewJob("");
        setNotice("Сотрудник создан. Передайте пароль один раз — в БД хранится только хэш.");
      }
      await loadTeamWeek();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setCreateBusy(false);
    }
  }

  async function loadDayPlan() {
    setPlanBusy(true);
    setPlanErr(null);
    try {
      const r = await fetch(apiUrl(`/api/time-analytics/team-day-plan?date=${encodeURIComponent(planDate)}`));
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Ошибка");
      setPlanData({ date: String(d.date ?? planDate), users: Array.isArray(d.users) ? d.users : [] });
    } catch (e) {
      setPlanData(null);
      setPlanErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPlanBusy(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Команда</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Создание учёток по email, график работы, загрузка по неделе и план на выбранный день.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href={appPath("/board/team-load")} className="font-medium text-[var(--primary)] hover:underline">
            Загрузка команды
          </Link>
          <Link href={appPath("/me")} className="font-medium text-[var(--primary)] hover:underline">
            ← Профиль
          </Link>
        </div>
      </div>

      {notice && (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">{notice}</p>
      )}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {createdPw ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm">
          <p className="font-semibold text-[var(--text)] mb-2">Временный пароль (скопируйте сейчас)</p>
          <p className="text-[var(--muted-foreground)] mb-1">Логин / email: {createdPw.email}</p>
          <code className="block select-all rounded bg-[var(--surface)] px-3 py-2 font-mono text-[var(--text)]">
            {createdPw.password}
          </code>
          <button
            type="button"
            className="mt-2 text-xs text-[var(--primary)] underline"
            onClick={() => setCreatedPw(null)}
          >
            Скрыть
          </button>
        </div>
      ) : null}

      <section className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] p-4 md:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text)]">Новый сотрудник</h2>
        <form onSubmit={(e) => void createUser(e)} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Email (логин)</label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              placeholder="name@company.com"
            />
          </div>
          <div className="min-w-[8rem] flex-1">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Имя (необяз.)</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </div>
          <div className="min-w-[8rem] flex-1">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Должность</label>
            <input
              type="text"
              value={newJob}
              onChange={(e) => setNewJob(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={createBusy}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {createBusy ? "Создание…" : "Создать и выдать пароль"}
          </button>
        </form>
      </section>

      <section className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[var(--text)]">План на день</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              disabled={planBusy}
              onClick={() => void loadDayPlan()}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--surface)] disabled:opacity-50"
            >
              {planBusy ? "Загрузка…" : "Показать задачи"}
            </button>
          </div>
        </div>
        {planErr && <p className="text-sm text-red-600">{planErr}</p>}
        {planData ? (
          <div className="space-y-4 max-h-[28rem] overflow-y-auto">
            {planData.users.map((u) => (
              <div key={u.userId} className="rounded-lg border border-[var(--border)] p-3">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-medium text-[var(--text)]">{u.name}</span>
                  <span className="text-[var(--muted-foreground)] tabular-nums">
                    ёмкость {u.capacityHours}ч · факт {u.loggedHours}ч · план {u.plannedHours}ч
                  </span>
                </div>
                {u.tasks.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)] mt-2">Нет подзадач с датами на этот день</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-xs">
                    {u.tasks.map((t) => (
                      <li key={t.subtaskId} className="flex justify-between gap-2">
                        <span className="text-[var(--text)]">
                          «{t.title}» · {t.cardName}
                        </span>
                        <span className="shrink-0 tabular-nums text-[var(--muted-foreground)]">{t.hoursOnDay}ч</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-[var(--text)]">Неделя для графиков</h2>
          <button
            type="button"
            className="rounded-lg border border-[var(--border)] px-2 py-1 text-sm"
            onClick={() => setWeek((w) => shiftISOWeek(w, -1))}
          >
            ←
          </button>
          <span className="text-sm font-mono text-[var(--muted-foreground)]">{week}</span>
          <button
            type="button"
            className="rounded-lg border border-[var(--border)] px-2 py-1 text-sm"
            onClick={() => setWeek((w) => shiftISOWeek(w, 1))}
          >
            →
          </button>
        </div>
        {teamWeekErr && <p className="text-sm text-red-600">{teamWeekErr}</p>}
      </section>

      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] overflow-hidden">
        {loading ? (
          <p className="p-6 text-[var(--muted-foreground)]">Загрузка…</p>
        ) : users.length === 0 ? (
          <p className="p-6 text-[var(--muted-foreground)]">Нет пользователей</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[56rem]">
              <thead className="bg-[var(--surface-2)] border-b border-[var(--border)] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-3 py-3 font-medium">Сотрудник</th>
                  <th className="px-3 py-3 font-medium">Неделя</th>
                  <th className="px-3 py-3 font-medium">По дням</th>
                  <th className="px-3 py-3 font-medium">Ч/день</th>
                  <th className="px-3 py-3 font-medium">Дни</th>
                  <th className="px-3 py-3 font-medium min-w-[9rem]">Роль</th>
                  <th className="px-3 py-3 font-medium">Пароль</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const tw = loadByUser.get(u.id);
                  const ratio = tw && tw.capacityHours > 0 ? Math.min(1.1, tw.hours / tw.capacityHours) : 0;
                  return (
                    <tr key={u.id} className="border-b border-[var(--border)] last:border-0 align-top hover:bg-[var(--surface-2)]/50">
                      <td className="px-3 py-3">
                        <div className="font-medium text-[var(--text)]">{u.display_name}</div>
                        <div className="text-xs text-[var(--muted-foreground)] tabular-nums">{u.login}</div>
                        {tw ? (
                          <span
                            className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${weekStatusBadge(tw.status)}`}
                          >
                            {tw.status === "over" ? "перегруз" : tw.status === "under" ? "недогруз" : "норма"}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 w-36">
                        {tw ? (
                          <div className="space-y-1">
                            <div className="h-2 w-full overflow-hidden rounded bg-[var(--surface-2)]">
                              <div
                                className={`h-full ${statusBarClass(tw.status)}`}
                                style={{ width: `${Math.min(100, ratio * 100)}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-[var(--muted-foreground)] tabular-nums">
                              {tw.hours} / {tw.capacityHours} ч
                            </div>
                          </div>
                        ) : (
                          <span className="text-[var(--muted-foreground)]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {tw?.days && tw.days.length > 0 ? (
                          <div className="flex h-14 items-end gap-0.5">
                            {tw.days.map((d) => {
                              const cap = d.capacityHours > 0 ? d.capacityHours : 0.01;
                              const h = d.loadHours;
                              const pct = Math.min(100, (h / cap) * 100);
                              return (
                                <div key={d.date} className="flex flex-1 flex-col items-center gap-0.5" title={`${d.date}: ${d.loadHours}ч / ${d.capacityHours}ч`}>
                                  <div className="flex h-10 w-full items-end justify-center rounded bg-[var(--surface-2)]">
                                    <div
                                      className={`w-[85%] max-w-[14px] rounded-t ${statusBarClass(d.status)}`}
                                      style={{ height: `${pct}%`, minHeight: h > 0 ? 3 : 0 }}
                                    />
                                  </div>
                                  <span className="text-[9px] text-[var(--muted-foreground)]">{d.shortLabel}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[var(--muted-foreground)]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 w-20">
                        <input
                          type="number"
                          step={0.5}
                          min={0.25}
                          max={24}
                          defaultValue={u.work_hours_per_day}
                          key={`wh-${u.id}-${u.work_hours_per_day}`}
                          disabled={savingId === u.id}
                          className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-1 py-1 text-xs tabular-nums"
                          onBlur={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!Number.isFinite(v) || v === u.work_hours_per_day) return;
                            void saveSchedule(u.id, { work_hours_per_day: v });
                          }}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[11rem]">
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
                                className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
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
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={u.role}
                          disabled={savingId === u.id}
                          onChange={(e) => void onRoleChange(u.id, e.target.value as TtUserRole)}
                          className="w-full max-w-[9rem] px-2 py-1.5 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] text-xs disabled:opacity-50"
                          aria-label={`Роль для ${u.display_name}`}
                        >
                          {TT_USER_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {TT_ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          disabled={savingId === u.id}
                          onClick={() => void regeneratePassword(u.id)}
                          className="text-xs text-[var(--primary)] underline disabled:opacity-50"
                        >
                          Новый пароль
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
