"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import { formatISOWeekParam, shiftISOWeek } from "@/lib/iso-week";
import { VIRTUAL_OTHER_CARD_ID } from "@/lib/pm-constants";
import {
  defaultTimerTaskTypeForCard,
  TIMER_TASK_OPTIONS_OTHER,
  TIMER_TASK_OPTIONS_PROJECT,
} from "@/lib/time-task-types";
import {
  PRESENTATION_TASK_PRESETS,
  SALES_TASK,
  SITE_TASK_PRESETS,
  parseCardProjectType,
} from "@/lib/work-presets";
import { statusLabel, type PmStatusKey } from "@/lib/statuses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type PmCard = {
  id: string;
  name: string;
  extra?: string | null;
};

type ActiveInfo = {
  cardId: string;
  cardName: string;
  startedAt: string;
  taskLabel: string;
};

type StatsPayload = {
  month: string;
  totalHours: number;
  breakdown: Array<{ taskType: string; label: string; hours: number }>;
  buckets: Array<{ id: string; label: string; hours: number }>;
  averages: Array<{ taskType: string; label: string; avgHours: number; sessions: number }>;
};

type MySubtaskRow = {
  id: string;
  card_id: string;
  title: string;
  assignee_user_id: string | null;
  lead_user_id: string | null;
  card_name: string;
  card_status: string;
  card_extra: string | null;
};

type WeekSessionsPayload = {
  week: string;
  weekStart: string;
  weekEnd: string;
  days: Array<{
    date: string;
    sessions: Array<{
      id: string;
      cardId: string;
      cardName: string;
      taskType: string | null;
      taskLabel: string;
      taskNote: string | null;
      startedAt: string;
      endedAt: string;
      durationSeconds: number;
    }>;
  }>;
};

function currentMonthYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    id: string;
    name: string;
    title: string;
    avatarUrl: string | null;
    role?: string;
  } | null>(null);
  const isMemberUser = user?.role === "member";
  const [cards, setCards] = useState<PmCard[]>([]);
  const [cardId, setCardId] = useState("");
  const [taskChoice, setTaskChoice] = useState<string>("design_concept");
  const [customText, setCustomText] = useState("");
  const [active, setActive] = useState<ActiveInfo | null>(null);
  /** Avoid Date.now() in useState initializer — SSR and client differ → hydration errors and broken clicks. */
  const [nowTs, setNowTs] = useState(0);
  const [monthYm, setMonthYm] = useState(currentMonthYm);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [weekIso, setWeekIso] = useState(() => formatISOWeekParam());
  const [weekSessions, setWeekSessions] = useState<WeekSessionsPayload | null>(null);
  const [mySubtasks, setMySubtasks] = useState<MySubtaskRow[]>([]);

  const projectType = useMemo(() => {
    const c = cards.find((x) => x.id === cardId);
    return parseCardProjectType(c?.extra ?? null);
  }, [cards, cardId]);

  const isOtherCard = cardId === VIRTUAL_OTHER_CARD_ID || projectType === "other";

  const presetOptions = useMemo(() => {
    if (isOtherCard) return [...TIMER_TASK_OPTIONS_OTHER];
    if (projectType === "presentation") return [...PRESENTATION_TASK_PRESETS];
    if (projectType === "site") return [...SITE_TASK_PRESETS];
    return [...TIMER_TASK_OPTIONS_PROJECT];
  }, [projectType, isOtherCard]);

  useEffect(() => {
    const valid =
      taskChoice === "custom" || presetOptions.some((p) => p.key === taskChoice);
    if (!valid) {
      setTaskChoice(presetOptions[0]?.key ?? "sales");
    }
  }, [cardId, presetOptions, taskChoice]);

  const loadMe = useCallback(async () => {
    const r = await fetch(apiUrl("/api/auth/me"));
    const d = await r.json();
    if (d.user)
      setUser(d.user as { id: string; name: string; title: string; avatarUrl: string | null; role?: string });
  }, []);

  const loadMySubtasks = useCallback(async () => {
    const r = await fetch(apiUrl("/api/me/subtasks"));
    if (!r.ok) return;
    const d = (await r.json()) as { subtasks?: MySubtaskRow[] };
    setMySubtasks(Array.isArray(d.subtasks) ? d.subtasks : []);
  }, []);

  const loadCards = useCallback(async () => {
    const r = await fetch(apiUrl("/api/cards/active"));
    if (!r.ok) return;
    const data = (await r.json()) as PmCard[];
    setCards(data);
  }, []);

  const loadActive = useCallback(async () => {
    const r = await fetch(apiUrl("/api/me/timer/active"));
    const d = await r.json();
    if (d.active) {
      setActive({
        cardId: d.active.cardId,
        cardName: d.active.cardName,
        startedAt: d.active.startedAt,
        taskLabel: d.active.taskLabel,
      });
    } else {
      setActive(null);
    }
  }, []);

  const loadStats = useCallback(async () => {
    const r = await fetch(apiUrl(`/api/me/stats?month=${encodeURIComponent(monthYm)}`));
    if (!r.ok) return;
    const d = await r.json();
    setStats(d as StatsPayload);
  }, [monthYm]);

  const loadWeekSessions = useCallback(async () => {
    const r = await fetch(apiUrl(`/api/me/timer/sessions?week=${encodeURIComponent(weekIso)}`));
    if (!r.ok) return;
    const d = await r.json();
    setWeekSessions(d as WeekSessionsPayload);
  }, [weekIso]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await Promise.all([loadMe(), loadCards(), loadActive(), loadMySubtasks()]);
      setLoading(false);
    })();
  }, [loadMe, loadCards, loadActive, loadMySubtasks]);

  useEffect(() => {
    void loadStats();
  }, [monthYm, loadStats]);

  useEffect(() => {
    void loadWeekSessions();
  }, [loadWeekSessions]);

  useEffect(() => {
    if (!active) return;
    setNowTs(Date.now());
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const elapsedSec = useMemo(() => {
    if (!active) return 0;
    return Math.floor((nowTs - new Date(active.startedAt).getTime()) / 1000);
  }, [active, nowTs]);

  function formatDur(sec: number): string {
    const s = Math.max(0, sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h > 0) return `${h}ч ${m}м ${r}с`;
    if (m > 0) return `${m}м ${r}с`;
    return `${r}с`;
  }

  async function startSession() {
    setErr(null);
    if (!cardId) {
      setErr("Выберите проект");
      return;
    }
    if (taskChoice === "custom" && !customText.trim()) {
      setErr("Опишите задачу");
      return;
    }
    const payloadTaskType =
      taskChoice === "custom"
        ? "custom"
        : taskChoice === "sales"
          ? SALES_TASK.key
          : taskChoice;
    setActionBusy(true);
    try {
      const r = await fetch(apiUrl("/api/me/timer/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId,
          taskType: payloadTaskType,
          taskNote: taskChoice === "custom" ? customText.trim() : "",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка");
      await loadActive();
      await loadWeekSessions();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setActionBusy(false);
    }
  }

  async function stopSession() {
    setActionBusy(true);
    setErr(null);
    try {
      const r = await fetch(apiUrl("/api/me/timer/stop"), { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка");
      setActive(null);
      await loadStats();
      await loadWeekSessions();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setActionBusy(false);
    }
  }

  function formatClock(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso;
    }
  }

  async function startTimerOnCard(cardId: string, cardExtra: string | null) {
    if (active) {
      setErr("Сначала остановите текущую сессию");
      return;
    }
    setErr(null);
    const taskType = defaultTimerTaskTypeForCard(cardId, cardExtra);
    setActionBusy(true);
    try {
      const r = await fetch(apiUrl("/api/me/timer/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, taskType, taskNote: "" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка");
      await loadActive();
      await loadWeekSessions();
      await loadMySubtasks();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setActionBusy(false);
    }
  }

  async function continueFromSession(s: WeekSessionsPayload["days"][0]["sessions"][0]) {
    if (active) {
      setErr("Сначала остановите текущую сессию");
      return;
    }
    setErr(null);
    let taskType = (s.taskType || "").trim();
    let taskNote = (s.taskNote || "").trim();
    if (taskType.startsWith("custom:")) {
      taskNote = taskType.slice("custom:".length).trim() || taskNote;
      taskType = "custom";
    }
    if (!taskType) taskType = "custom";
    setActionBusy(true);
    try {
      const r = await fetch(apiUrl("/api/me/timer/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: s.cardId,
          taskType,
          taskNote,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка");
      await loadActive();
      await loadWeekSessions();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setActionBusy(false);
    }
  }

  async function logout() {
    await fetch(apiUrl("/api/auth/logout"), { method: "POST" });
    router.push(appPath("/login"));
    router.refresh();
  }

  async function onAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      const dataUrl = r.result as string;
      await fetch(apiUrl("/api/me/profile"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: dataUrl }),
      });
      await loadMe();
    };
    r.readAsDataURL(f);
    e.target.value = "";
  }

  if (loading && !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4 text-sm text-[var(--muted-foreground)]">Загрузка…</div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <header className="flex flex-wrap items-start gap-6">
        <label className="relative shrink-0 cursor-pointer">
          <input type="file" accept="image/*" className="hidden" onChange={onAvatarFile} />
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-[var(--border)] bg-[var(--surface-2)] text-3xl font-bold text-[var(--muted-foreground)] shadow-[var(--shadow-card)]">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{user?.name?.charAt(0)?.toUpperCase() ?? "?"}</span>
            )}
          </div>
          <span className="absolute -bottom-1 -right-1 rounded-full bg-[var(--primary)] px-2 py-0.5 text-[10px] font-semibold text-white shadow-md">
            фото
          </span>
        </label>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">{user?.name ?? "Профиль"}</h1>
          <p className="mt-0.5 text-[var(--muted-foreground)]">{user?.title || "Должность не указана"}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => void logout()} className="!px-0 text-[var(--primary)]">
              Выйти
            </Button>
            {!isMemberUser ? (
              <>
                <Link
                  href={appPath("/board")}
                  className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)]"
                >
                  Канбан
                </Link>
                <Link
                  href={appPath("/board/time-analytics")}
                  className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)]"
                >
                  Аналитика времени
                </Link>
              </>
            ) : null}
          </div>
          {isMemberUser ? (
            <p className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text)]">
              У вас пока нет доступа к командной доске и админским разделам. После выдачи роли администратором появятся
              канбан, календарь и аналитика команды.
            </p>
          ) : null}
        </div>
      </header>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="pb-2">
          <CardTitle>Быстрый старт</CardTitle>
          <CardDescription>
            Выберите проект и тип задачи. Сессии привязаны к вашему профилю. Один активный таймер на человека.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {err ? <p className="text-sm font-medium text-[var(--danger)]">{err}</p> : null}

          {active ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--primary-soft)] bg-[var(--primary-soft)]/40 p-4 dark:bg-[var(--primary-soft)]/20">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">Идёт работа</div>
                <div className="font-semibold text-[var(--text)]">{active.cardName}</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  {active.taskLabel} · {formatDur(elapsedSec)}
                </div>
              </div>
              <Button type="button" variant="danger" size="md" disabled={actionBusy} onClick={() => void stopSession()}>
                Стоп
              </Button>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">Проект</label>
              <select
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                className="tt-select w-full text-sm"
              >
                <option value="">— выберите карточку канбана</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {projectType ? (
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Тип в карточке:{" "}
                  {projectType === "site" ? "сайт" : projectType === "presentation" ? "презентация" : "другое"}
                </p>
              ) : null}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">Задача</label>
              <select
                value={taskChoice}
                onChange={(e) => {
                  setTaskChoice(e.target.value);
                  setCustomText("");
                }}
                className="tt-select w-full text-sm"
              >
                {presetOptions.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
                <option value="custom">Своя задача…</option>
              </select>
            </div>
          </div>

          {taskChoice === "custom" ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">Описание</label>
              <Input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Кратко, что делаете"
              />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="lg"
              disabled={actionBusy || !!active || !cardId}
              onClick={() => void startSession()}
              className="inline-flex items-center gap-2"
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
              Приступил
            </Button>
            {!cardId ? <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Сначала выберите проект</span> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-2">
          <div>
            <CardTitle>Мои подзадачи</CardTitle>
            <CardDescription className="mt-1">
              {isMemberUser
                ? "Доступ к командным задачам по роли."
                : "Открытые задачи, где вы исполнитель или лид."}
            </CardDescription>
          </div>
          {!isMemberUser ? (
            <Link
              href={appPath("/board")}
              className="text-sm font-semibold text-[var(--primary)] hover:underline"
            >
              Канбан →
            </Link>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {isMemberUser ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Подзадачи команды здесь не отображаются, пока администратор не расширит доступ.
            </p>
          ) : mySubtasks.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">Нет открытых подзадач</p>
          ) : (
            <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50">
              {mySubtasks.map((s) => {
                const roles: string[] = [];
                if (user && s.assignee_user_id === user.id) roles.push("исполнитель");
                if (user && s.lead_user_id === user.id) roles.push("лид");
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[var(--text)]">{s.title}</div>
                      <div className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">{s.card_name}</div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {roles.map((r) => (
                          <span
                            key={r}
                            className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)] ring-1 ring-[var(--border)]"
                          >
                            {r}
                          </span>
                        ))}
                        <span className="rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[10px] font-medium text-amber-950 dark:text-amber-100">
                          {statusLabel(s.card_status as PmStatusKey)}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={actionBusy || !!active}
                      onClick={() => void startTimerOnCard(s.card_id, s.card_extra)}
                      className="shrink-0 gap-1"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Таймер
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>История за неделю</CardTitle>
            <CardDescription className="mt-1">
              Неделя ISO {weekIso}. Завершённые сессии по дням.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setWeekIso((w) => shiftISOWeek(w, -1))}
            >
              ←
            </Button>
            <span className="min-w-[8rem] text-center text-sm font-semibold tabular-nums text-[var(--text)]">
              {weekSessions ? `${weekSessions.weekStart} — ${weekSessions.weekEnd}` : weekIso}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setWeekIso((w) => shiftISOWeek(w, 1))}
            >
              →
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setWeekIso(formatISOWeekParam())}>
              Сегодня
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {weekSessions ? (
            <div className="space-y-6">
              {weekSessions.days.every((d) => d.sessions.length === 0) ? (
                <p className="text-sm text-[var(--muted-foreground)]">Нет записей за эту неделю</p>
              ) : (
                weekSessions.days.map((day) =>
                  day.sessions.length === 0 ? null : (
                    <div key={day.date}>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                        {new Date(day.date + "T12:00:00").toLocaleDateString("ru-RU", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </h3>
                      <ul className="space-y-2">
                        {day.sessions.map((s) => (
                          <li
                            key={s.id}
                            className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] py-2 last:border-0"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-[var(--text)]">{s.cardName}</div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
                                <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 font-medium text-[var(--text)] ring-1 ring-[var(--border)]">
                                  {s.taskLabel}
                                </span>
                                <span>
                                  {formatClock(s.startedAt)} — {formatClock(s.endedAt)}
                                </span>
                                <span className="tabular-nums">{formatDur(s.durationSeconds)}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={actionBusy || !!active}
                              onClick={() => void continueFromSession(s)}
                              className="shrink-0 text-sm font-semibold text-[var(--primary)] hover:underline disabled:opacity-40"
                            >
                              Продолжить
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                )
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Моя работа за месяц</CardTitle>
            <CardDescription className="mt-1">Сводка и средние по сессиям</CardDescription>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">Месяц</label>
            <input
              type="month"
              value={monthYm}
              onChange={(e) => setMonthYm(e.target.value)}
              className="tt-input text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats ? (
            <>
              <p className="text-2xl font-bold tabular-nums tracking-tight text-[var(--text)]">
                Всего: {stats.totalHours} ч
              </p>
              <h3 className="text-sm font-semibold text-[var(--text)]">По категориям</h3>
              <ul className="space-y-1 text-sm">
                {stats.buckets.length === 0 ? (
                  <li className="text-[var(--muted-foreground)]">Нет данных за месяц</li>
                ) : (
                  stats.buckets.map((b) => (
                    <li key={b.id} className="flex justify-between gap-2 border-b border-[var(--border)] py-1.5 last:border-0">
                      <span className="text-[var(--text)]">{b.label}</span>
                      <span className="tabular-nums font-medium text-[var(--muted-foreground)]">{b.hours} ч</span>
                    </li>
                  ))
                )}
              </ul>
              <h3 className="pt-1 text-sm font-semibold text-[var(--text)]">Детально по задачам</h3>
              <ul className="space-y-1 text-sm text-[var(--muted-foreground)]">
                {stats.breakdown.length === 0 ? (
                  <li>—</li>
                ) : (
                  stats.breakdown.map((r) => (
                    <li key={r.taskType || "__"} className="flex justify-between gap-2">
                      <span>{r.label}</span>
                      <span className="tabular-nums font-medium text-[var(--text)]">{r.hours} ч</span>
                    </li>
                  ))
                )}
              </ul>
              <h3 className="pt-2 text-sm font-semibold text-[var(--text)]">Средняя длительность сессии</h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                По типу задачи: сколько в среднем уходит на один «приход» в работу.
              </p>
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      <th className="py-3 pl-4 pr-2">Задача</th>
                      <th className="py-3 pr-2">Сессий</th>
                      <th className="py-3 pr-4">Среднее</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.averages.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-[var(--muted-foreground)]">
                          Мало данных для средних
                        </td>
                      </tr>
                    ) : (
                      stats.averages.map((a) => (
                        <tr key={a.taskType || "__"} className="border-b border-[var(--border)] last:border-0">
                          <td className="py-2.5 pl-4 pr-2 text-[var(--text)]">{a.label}</td>
                          <td className="py-2.5 pr-2 tabular-nums text-[var(--muted-foreground)]">{a.sessions}</td>
                          <td className="py-2.5 pr-4 tabular-nums font-medium text-[var(--text)]">{a.avgHours} ч</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
