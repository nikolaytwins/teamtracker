"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import { VIRTUAL_OTHER_CARD_ID } from "@/lib/pm-constants";
import { TIMER_TASK_OPTIONS_OTHER, TIMER_TASK_OPTIONS_PROJECT } from "@/lib/time-task-types";
import {
  PRESENTATION_TASK_PRESETS,
  SALES_TASK,
  SITE_TASK_PRESETS,
  parseCardProjectType,
} from "@/lib/work-presets";
import { HomeCompactTaskList, type HomeSubtaskRow } from "@/components/home/HomeCompactTaskList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DEFAULT_STATUS, isValidStatus, type PmStatusKey } from "@/lib/statuses";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type PmCard = {
  id: string;
  name: string;
  extra?: string | null;
};

type ActiveInfo = {
  id: string;
  cardId: string;
  cardName: string;
  startedAt: string;
  taskLabel: string;
};

type SessionRow = {
  id: string;
  cardId: string;
  cardName: string;
  taskType: string | null;
  taskLabel: string;
  taskNote: string | null;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
};

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(s: string): string {
  const d = new Date(s);
  return d.toISOString();
}

function formatDur(sec: number): string {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}ч ${m}м ${r}с`;
  if (m > 0) return `${m}м ${r}с`;
  return `${r}с`;
}

function formatSessionDurationPrimary(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}\u00a0ч ${m}\u00a0м`;
  if (m > 0) return `${m}\u00a0м ${r}\u00a0с`;
  return `${r}\u00a0с`;
}

function formatClock(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

/** Значение селекта «свой текст»; не пересекается с ключами пресетов в БД. */
const TASK_CHOICE_FREE_TEXT = "__free_text__";

function parseTaskForForm(s: SessionRow): { taskChoice: string; manualWork: string } {
  const tt = (s.taskType || "").trim();
  if (tt.startsWith("custom:")) {
    return { taskChoice: TASK_CHOICE_FREE_TEXT, manualWork: tt.slice("custom:".length) };
  }
  if (tt === "custom" || !tt) {
    return { taskChoice: TASK_CHOICE_FREE_TEXT, manualWork: (s.taskNote || "").trim() };
  }
  const allPresets = [
    ...TIMER_TASK_OPTIONS_PROJECT,
    ...TIMER_TASK_OPTIONS_OTHER,
    ...PRESENTATION_TASK_PRESETS,
    ...SITE_TASK_PRESETS,
    SALES_TASK,
  ];
  const known = allPresets.some((p) => p.key === tt);
  if (known) return { taskChoice: tt, manualWork: (s.taskNote || "").trim() };
  return { taskChoice: TASK_CHOICE_FREE_TEXT, manualWork: (tt || (s.taskNote || "")).trim() };
}

export default function HomePage() {
  const [projects, setProjects] = useState<PmCard[]>([]);
  const [cardId, setCardId] = useState("");
  const [taskChoice, setTaskChoice] = useState<string>(TASK_CHOICE_FREE_TEXT);
  const [manualWork, setManualWork] = useState("");
  const [active, setActive] = useState<ActiveInfo | null>(null);
  const [nowTs, setNowTs] = useState(0);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    cardId: string;
    taskChoice: string;
    manualWork: string;
    startedLocal: string;
    endedLocal: string;
  } | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCardId, setManualCardId] = useState("");
  const [manualTaskChoice, setManualTaskChoice] = useState(TASK_CHOICE_FREE_TEXT);
  const [manualWorkText, setManualWorkText] = useState("");
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  const [homeSubtasks, setHomeSubtasks] = useState<HomeSubtaskRow[]>([]);
  const [homeTeamUsers, setHomeTeamUsers] = useState<{ id: string; displayName: string; avatarUrl?: string | null }[]>([]);
  const [homeTasksLoading, setHomeTasksLoading] = useState(true);

  const projectType = useMemo(() => {
    const c = projects.find((x) => x.id === cardId);
    return parseCardProjectType(c?.extra ?? null);
  }, [projects, cardId]);

  const isOtherCard = cardId === VIRTUAL_OTHER_CARD_ID || projectType === "other";

  const presetOptions = useMemo(() => {
    if (isOtherCard) return [...TIMER_TASK_OPTIONS_OTHER];
    if (projectType === "presentation") return [...PRESENTATION_TASK_PRESETS];
    if (projectType === "site") return [...SITE_TASK_PRESETS];
    return [...TIMER_TASK_OPTIONS_PROJECT];
  }, [projectType, isOtherCard]);

  const quickStartSelectOptions = useMemo(
    () => [{ key: TASK_CHOICE_FREE_TEXT, label: "Свободное описание" }, ...presetOptions],
    [presetOptions]
  );

  const editTaskSelectOptions = useMemo(() => {
    if (!editForm) return [] as { key: string; label: string }[];
    const c = projects.find((x) => x.id === editForm.cardId);
    const pt = parseCardProjectType(c?.extra ?? null);
    const io = editForm.cardId === VIRTUAL_OTHER_CARD_ID || pt === "other";
    const opts = io
      ? [...TIMER_TASK_OPTIONS_OTHER]
      : pt === "presentation"
        ? [...PRESENTATION_TASK_PRESETS]
        : pt === "site"
          ? [...SITE_TASK_PRESETS]
          : [...TIMER_TASK_OPTIONS_PROJECT];
    return [{ key: TASK_CHOICE_FREE_TEXT, label: "Свободное описание" }, ...opts];
  }, [editForm, projects]);

  useEffect(() => {
    if (taskChoice === TASK_CHOICE_FREE_TEXT) return;
    if (!presetOptions.some((p) => p.key === taskChoice)) setTaskChoice(TASK_CHOICE_FREE_TEXT);
  }, [cardId, presetOptions, taskChoice]);

  const loadProjects = useCallback(async () => {
    const r = await fetch(apiUrl("/api/me/home/projects"));
    if (!r.ok) return;
    const d = (await r.json()) as { cards?: PmCard[] };
    const list = Array.isArray(d.cards) ? d.cards : [];
    setProjects(list.map((c) => ({ id: c.id, name: c.name, extra: c.extra ?? null })));
  }, []);

  const loadActive = useCallback(async () => {
    const r = await fetch(apiUrl("/api/me/timer/active"));
    const d = await r.json();
    if (d.active?.id) {
      setActive({
        id: String(d.active.id),
        cardId: d.active.cardId,
        cardName: d.active.cardName,
        startedAt: d.active.startedAt,
        taskLabel: d.active.taskLabel,
      });
    } else {
      setActive(null);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    const r = await fetch(apiUrl("/api/me/timer/sessions/recent?limit=10"));
    if (!r.ok) return;
    const d = (await r.json()) as { sessions?: SessionRow[] };
    setSessions(Array.isArray(d.sessions) ? d.sessions : []);
  }, []);

  const loadHomeTasks = useCallback(async () => {
    setHomeTasksLoading(true);
    try {
      const [st, tu] = await Promise.all([fetch(apiUrl("/api/me/subtasks")), fetch(apiUrl("/api/team/users"))]);
      if (st.ok) {
        const d = (await st.json()) as { subtasks?: Partial<HomeSubtaskRow>[] };
        const rows = Array.isArray(d.subtasks) ? d.subtasks : [];
        setHomeSubtasks(
          rows
            .map((row) => ({
              id: String(row.id ?? ""),
              card_id: String(row.card_id ?? ""),
              title: String(row.title ?? ""),
              assignee_user_id: row.assignee_user_id ?? null,
              lead_user_id: row.lead_user_id ?? null,
              planned_start: row.planned_start != null ? String(row.planned_start) : null,
              planned_end: row.planned_end != null ? String(row.planned_end) : null,
              deadline_at: row.deadline_at != null ? String(row.deadline_at) : null,
              execution_dates_json: row.execution_dates_json != null ? String(row.execution_dates_json) : null,
              card_name: String(row.card_name ?? ""),
              card_status: isValidStatus(String(row.card_status ?? "")) ? (String(row.card_status) as PmStatusKey) : DEFAULT_STATUS,
              card_extra: row.card_extra != null ? String(row.card_extra) : null,
              completed_at: row.completed_at != null && String(row.completed_at).trim() ? String(row.completed_at) : null,
            }))
            .filter((x) => x.id && x.card_id)
        );
      } else {
        setHomeSubtasks([]);
      }
      if (tu.ok) {
        const u = (await tu.json()) as { users?: { id?: string; displayName?: string; avatarUrl?: string | null }[] };
        setHomeTeamUsers(
          Array.isArray(u.users)
            ? u.users.map((x) => ({
                id: String(x.id ?? ""),
                displayName: String(x.displayName ?? ""),
                avatarUrl: x.avatarUrl ?? null,
              }))
            : []
        );
      } else {
        setHomeTeamUsers([]);
      }
    } finally {
      setHomeTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await Promise.all([loadProjects(), loadActive(), loadSessions(), loadHomeTasks()]);
      setLoading(false);
    })();
  }, [loadProjects, loadActive, loadSessions, loadHomeTasks]);

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

  const manualProjectType = useMemo(() => {
    const c = projects.find((x) => x.id === manualCardId);
    return parseCardProjectType(c?.extra ?? null);
  }, [projects, manualCardId]);
  const manualIsOther = manualCardId === VIRTUAL_OTHER_CARD_ID || manualProjectType === "other";
  const manualPresetOptions = useMemo(() => {
    if (manualIsOther) return [...TIMER_TASK_OPTIONS_OTHER];
    if (manualProjectType === "presentation") return [...PRESENTATION_TASK_PRESETS];
    if (manualProjectType === "site") return [...SITE_TASK_PRESETS];
    return [...TIMER_TASK_OPTIONS_PROJECT];
  }, [manualIsOther, manualProjectType]);

  const manualSelectOptions = useMemo(
    () => [{ key: TASK_CHOICE_FREE_TEXT, label: "Свободное описание" }, ...manualPresetOptions],
    [manualPresetOptions]
  );

  useEffect(() => {
    if (manualTaskChoice === TASK_CHOICE_FREE_TEXT) return;
    if (!manualPresetOptions.some((p) => p.key === manualTaskChoice)) setManualTaskChoice(TASK_CHOICE_FREE_TEXT);
  }, [manualCardId, manualPresetOptions, manualTaskChoice]);

  async function startSession() {
    setErr(null);
    if (!cardId) {
      setErr("Выберите проект");
      return;
    }
    if (taskChoice === TASK_CHOICE_FREE_TEXT) {
      if (!manualWork.trim()) {
        setErr("Опишите, над чем работаете");
        return;
      }
    }
    const payloadTaskType =
      taskChoice === TASK_CHOICE_FREE_TEXT
        ? "custom"
        : taskChoice === "sales"
          ? SALES_TASK.key
          : taskChoice;
    const taskNote = taskChoice === TASK_CHOICE_FREE_TEXT ? manualWork.trim() : "";
    setActionBusy(true);
    try {
      const r = await fetch(apiUrl("/api/me/timer/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId,
          taskType: payloadTaskType,
          taskNote,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка");
      await loadActive();
      await loadSessions();
      setManualWork("");
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
      await loadActive();
      await loadSessions();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setActionBusy(false);
    }
  }

  async function cancelActiveSession() {
    if (!active?.id) return;
    if (!confirm("Удалить эту сессию без сохранения времени?")) return;
    setActionBusy(true);
    setErr(null);
    try {
      const r = await fetch(apiUrl(`/api/me/timer/sessions/${encodeURIComponent(active.id)}`), { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Ошибка");
      setActive(null);
      await loadSessions();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setActionBusy(false);
    }
  }

  function openEdit(s: SessionRow) {
    const parsed = parseTaskForForm(s);
    setEditingId(s.id);
    setEditForm({
      cardId: s.cardId,
      taskChoice: parsed.taskChoice,
      manualWork: parsed.manualWork,
      startedLocal: toDatetimeLocalValue(s.startedAt),
      endedLocal: toDatetimeLocalValue(s.endedAt),
    });
  }

  async function saveEdit() {
    if (!editingId || !editForm) return;
    if (editForm.taskChoice === TASK_CHOICE_FREE_TEXT && !editForm.manualWork.trim()) {
      setErr("Опишите, над чем работали");
      return;
    }
    setActionBusy(true);
    setErr(null);
    try {
      const body: Record<string, string> = {
        cardId: editForm.cardId,
        startedAt: fromDatetimeLocalValue(editForm.startedLocal),
        endedAt: fromDatetimeLocalValue(editForm.endedLocal),
      };
      if (editForm.taskChoice === TASK_CHOICE_FREE_TEXT) {
        body.taskType = "custom";
        body.taskNote = editForm.manualWork.trim();
      } else {
        const tt =
          editForm.taskChoice === "sales"
            ? SALES_TASK.key
            : editForm.taskChoice;
        body.taskType = tt;
        body.taskNote = "";
      }
      const r = await fetch(apiUrl(`/api/me/timer/sessions/${encodeURIComponent(editingId)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Ошибка");
      setEditingId(null);
      setEditForm(null);
      await loadSessions();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setActionBusy(false);
    }
  }

  async function deleteSession(id: string) {
    if (!confirm("Удалить эту запись из истории?")) return;
    setActionBusy(true);
    setErr(null);
    try {
      const r = await fetch(apiUrl(`/api/me/timer/sessions/${encodeURIComponent(id)}`), { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Ошибка");
      if (editingId === id) {
        setEditingId(null);
        setEditForm(null);
      }
      await loadSessions();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setActionBusy(false);
    }
  }

  async function submitManual() {
    setErr(null);
    if (!manualCardId || !manualStart || !manualEnd) {
      setErr("Заполните проект и интервал времени");
      return;
    }
    if (manualTaskChoice === TASK_CHOICE_FREE_TEXT) {
      if (!manualWorkText.trim()) {
        setErr("Опишите задачу");
        return;
      }
    }
    const taskType =
      manualTaskChoice === TASK_CHOICE_FREE_TEXT
        ? "custom"
        : manualTaskChoice === "sales"
          ? SALES_TASK.key
          : manualTaskChoice;
    const taskNote = manualTaskChoice === TASK_CHOICE_FREE_TEXT ? manualWorkText.trim() : "";
    setActionBusy(true);
    try {
      const r = await fetch(apiUrl("/api/me/timer/sessions/manual"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: manualCardId,
          taskType,
          taskNote,
          startedAt: fromDatetimeLocalValue(manualStart),
          endedAt: fromDatetimeLocalValue(manualEnd),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Ошибка");
      setManualOpen(false);
      setManualWorkText("");
      await loadSessions();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setActionBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4 text-sm text-[var(--muted-foreground)]">Загрузка…</div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">Главная</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Быстрый старт учёта времени и последние сессии.{" "}
          <Link href={appPath("/home/sessions")} className="font-semibold text-[var(--primary)] hover:underline">
            Месяц сессий
          </Link>
        </p>
      </header>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="pb-2">
          <CardTitle>Быстрый старт</CardTitle>
          <CardDescription>
            Выберите проект, затем в списке «Задача» — либо «Свободное описание» и свой текст, либо типовой тип работы. Один
            активный таймер.
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
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="md" disabled={actionBusy} onClick={() => void cancelActiveSession()}>
                  Отменить
                </Button>
                <Button type="button" variant="danger" size="md" disabled={actionBusy} onClick={() => void stopSession()}>
                  Стоп
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">Проект</label>
              <select value={cardId} onChange={(e) => setCardId(e.target.value)} className="tt-select w-full text-sm">
                <option value="">— выберите проект —</option>
                {projects.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">Задача</label>
              <select
                value={taskChoice}
                onChange={(e) => {
                  setTaskChoice(e.target.value);
                  if (e.target.value !== TASK_CHOICE_FREE_TEXT) setManualWork("");
                }}
                className="tt-select w-full text-sm"
              >
                {quickStartSelectOptions.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {taskChoice === TASK_CHOICE_FREE_TEXT ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">Над чем работаете</label>
              <Input
                type="text"
                value={manualWork}
                onChange={(e) => setManualWork(e.target.value)}
                placeholder="Свободный текст — что делаете в этом проекте"
                className="text-sm"
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
            {!cardId ? <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Выберите проект</span> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="flex flex-col gap-3 space-y-0 pb-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle>Последние сессии</CardTitle>
            <CardDescription>
              Редактирование проекта, задачи и времени; ручное добавление; удаление ошибочных записей.
            </CardDescription>
          </div>
          <Link
            href={appPath("/home/sessions")}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface-2)]"
          >
            Открыть полную историю
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">Пока нет завершённых сессий</p>
          ) : (
            <ul className="space-y-1.5">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/35 px-3 py-2 dark:bg-[var(--surface-2)]/20"
                >
                  {editingId === s.id && editForm ? (
                    <div className="space-y-2.5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Проект</label>
                          <select
                            value={editForm.cardId}
                            onChange={(e) => setEditForm((f) => (f ? { ...f, cardId: e.target.value } : f))}
                            className="tt-select w-full text-sm"
                          >
                            {projects.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Задача</label>
                          <select
                            value={editForm.taskChoice}
                            onChange={(e) =>
                              setEditForm((f) =>
                                f
                                  ? {
                                      ...f,
                                      taskChoice: e.target.value,
                                      manualWork: e.target.value === TASK_CHOICE_FREE_TEXT ? f.manualWork : "",
                                    }
                                  : f
                              )
                            }
                            className="tt-select w-full text-sm"
                          >
                            {editTaskSelectOptions.map((p) => (
                              <option key={p.key} value={p.key}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {editForm.taskChoice === TASK_CHOICE_FREE_TEXT ? (
                        <Input
                          value={editForm.manualWork}
                          onChange={(e) => setEditForm((f) => (f ? { ...f, manualWork: e.target.value } : f))}
                          placeholder="Над чем работали"
                          className="text-sm"
                        />
                      ) : null}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Начало</label>
                          <input
                            type="datetime-local"
                            value={editForm.startedLocal}
                            onChange={(e) => setEditForm((f) => (f ? { ...f, startedLocal: e.target.value } : f))}
                            className="tt-input w-full text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Конец</label>
                          <input
                            type="datetime-local"
                            value={editForm.endedLocal}
                            onChange={(e) => setEditForm((f) => (f ? { ...f, endedLocal: e.target.value } : f))}
                            className="tt-input w-full text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" disabled={actionBusy} onClick={() => void saveEdit()}>
                          Сохранить
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(null);
                            setEditForm(null);
                          }}
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold leading-tight text-[var(--text)]">{s.cardName}</div>
                        <div className="truncate text-xs leading-snug text-[var(--muted-foreground)]">{s.taskLabel}</div>
                        <div className="mt-0.5 text-[11px] tabular-nums text-[var(--muted-foreground)]">
                          {formatClock(s.startedAt)} — {formatClock(s.endedAt)}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span
                          className="text-xl font-bold tabular-nums leading-none tracking-tight text-[var(--primary)] sm:text-2xl"
                          title="Длительность сессии"
                        >
                          {formatSessionDurationPrimary(s.durationSeconds)}
                        </span>
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => openEdit(s)}
                          >
                            Изменить
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-[var(--danger)]"
                            onClick={() => void deleteSession(s.id)}
                          >
                            Удалить
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-[var(--border)] pt-4">
            <button
              type="button"
              className="text-sm font-semibold text-[var(--primary)] hover:underline"
              onClick={() => setManualOpen((o) => !o)}
            >
              {manualOpen ? "Скрыть форму" : "+ Добавить сессию вручную"}
            </button>
            {manualOpen ? (
              <div className="mt-4 space-y-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Проект</label>
                    <select
                      value={manualCardId}
                      onChange={(e) => setManualCardId(e.target.value)}
                      className="tt-select w-full text-sm"
                    >
                      <option value="">— выберите —</option>
                      {projects.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Задача</label>
                    <select
                      value={manualTaskChoice}
                      onChange={(e) => {
                        setManualTaskChoice(e.target.value);
                        if (e.target.value !== TASK_CHOICE_FREE_TEXT) setManualWorkText("");
                      }}
                      className="tt-select w-full text-sm"
                    >
                      {manualSelectOptions.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {manualTaskChoice === TASK_CHOICE_FREE_TEXT ? (
                  <Input
                    value={manualWorkText}
                    onChange={(e) => setManualWorkText(e.target.value)}
                    placeholder="Над чем работали"
                    className="text-sm"
                  />
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Начало</label>
                    <input
                      type="datetime-local"
                      value={manualStart}
                      onChange={(e) => setManualStart(e.target.value)}
                      className="tt-input w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Конец</label>
                    <input
                      type="datetime-local"
                      value={manualEnd}
                      onChange={(e) => setManualEnd(e.target.value)}
                      className="tt-input w-full text-sm"
                    />
                  </div>
                </div>
                <Button type="button" size="sm" disabled={actionBusy} onClick={() => void submitManual()}>
                  Сохранить сессию
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <HomeCompactTaskList subtasks={homeSubtasks} teamUsers={homeTeamUsers} loading={homeTasksLoading} onReload={loadHomeTasks} />
    </div>
  );
}
