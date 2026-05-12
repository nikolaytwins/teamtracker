"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { apiUrl, appPath } from "@/lib/api-url";
import { bucketMySubtasks, sortSubtasksInColumn } from "@/lib/me-subtask-buckets";
import { parseExecutionDatesFromJson } from "@/lib/pm-subtasks-shared";
import {
  IMPORTANCE_OPTIONS,
  statusLabel,
  statusToSimpleViewGroup,
  SIMPLE_VIEW_GROUPS,
  type ImportanceKey,
  type PmStatusKey,
  type SimpleViewGroupKey,
} from "@/lib/statuses";
import { parseCardProjectType } from "@/lib/work-presets";

export type HomeSubtaskRow = {
  id: string;
  card_id: string;
  title: string;
  assignee_user_id: string | null;
  lead_user_id: string | null;
  planned_start: string | null;
  planned_end: string | null;
  deadline_at: string | null;
  execution_dates_json: string | null;
  card_name: string;
  card_status: PmStatusKey;
  card_extra: string | null;
};

type TeamUser = { id: string; displayName: string; avatarUrl?: string | null };

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function daysFromTodayTo(deadlineDay: Date, now: Date): number {
  const t0 = startOfLocalDay(now).getTime();
  const t1 = startOfLocalDay(deadlineDay).getTime();
  return Math.round((t1 - t0) / 86400000);
}

function parseImportance(extra: string | null): ImportanceKey | null {
  if (!extra?.trim()) return null;
  try {
    const o = JSON.parse(extra) as { importance?: string };
    const k = o.importance;
    if (k === "high" || k === "medium" || k === "low") return k;
  } catch {
    /* ignore */
  }
  return null;
}

function importanceRank(k: ImportanceKey | null): number {
  if (k === "high") return 0;
  if (k === "medium") return 1;
  if (k === "low") return 2;
  return 3;
}

function effectiveDeadlineMs(row: HomeSubtaskRow): number | null {
  if (row.deadline_at) {
    const t = new Date(row.deadline_at).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (row.planned_end) {
    const t = new Date(row.planned_end).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const dates = parseExecutionDatesFromJson(row.execution_dates_json);
  if (dates.length > 0) {
    const sorted = [...dates].sort();
    const t = new Date(sorted[sorted.length - 1] + "T23:59:59").getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (row.planned_start) {
    const t = new Date(row.planned_start).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

function formatDeadlineHint(deadlineMs: number | null, now: Date): { text: string; tone: "today" | "soon" | "later" | "overdue" | "none" } {
  if (deadlineMs == null || Number.isNaN(deadlineMs)) return { text: "—", tone: "none" };
  const deadlineDay = new Date(deadlineMs);
  const diff = daysFromTodayTo(deadlineDay, now);
  if (diff < 0) return { text: "Просрочено", tone: "overdue" };
  if (diff === 0) return { text: "Сегодня", tone: "today" };
  if (diff === 1) return { text: "Завтра", tone: "soon" };
  if (diff <= 7) return { text: `Через ${diff} дн.`, tone: "soon" };
  return {
    text: deadlineDay.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
    tone: "later",
  };
}

function categoryChip(extra: string | null): { label: string; dotClass: string } {
  const pt = parseCardProjectType(extra);
  if (pt === "site") return { label: "Сайт", dotClass: "bg-sky-500" };
  if (pt === "presentation") return { label: "Презентация", dotClass: "bg-fuchsia-500" };
  if (pt === "other") return { label: "Другое", dotClass: "bg-violet-500" };
  return { label: "Проект", dotClass: "bg-[var(--muted-foreground)]" };
}

function simpleGroupDotClass(g: SimpleViewGroupKey): string {
  switch (g) {
    case "not_started":
      return "bg-slate-400";
    case "in_progress":
      return "bg-[var(--primary)]";
    case "awaiting_approval":
      return "bg-amber-500";
    case "pause":
      return "bg-amber-600/80";
    case "done":
      return "bg-emerald-500";
    default:
      return "bg-[var(--muted-foreground)]";
  }
}

function priorityPill(imp: ImportanceKey | null): { label: string; className: string } | null {
  if (!imp) return null;
  if (imp === "high") return { label: "Высокий", className: "bg-red-500/15 text-red-700 ring-red-500/30 dark:text-red-300" };
  if (imp === "medium") return { label: "Средний", className: "bg-amber-500/15 text-amber-800 ring-amber-500/30 dark:text-amber-200" };
  return { label: "Низкий", className: "bg-[var(--surface-2)] text-[var(--muted-foreground)] ring-[var(--border)]" };
}

function tasksCountRu(n: number): string {
  if (n === 0) return "нет задач";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} задача`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} задачи`;
  return `${n} задач`;
}

type Props = {
  subtasks: HomeSubtaskRow[];
  teamUsers: TeamUser[];
  loading?: boolean;
  onReload: () => void | Promise<void>;
};

export function HomeCompactTaskList({ subtasks, teamUsers, loading, onReload }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | SimpleViewGroupKey>("");
  const [priorityFilter, setPriorityFilter] = useState<"" | ImportanceKey>("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subtasks.filter((s) => {
      if (statusFilter) {
        if (statusToSimpleViewGroup(s.card_status) !== statusFilter) return false;
      }
      if (priorityFilter) {
        const imp = parseImportance(s.card_extra);
        if (imp !== priorityFilter) return false;
      }
      if (q) {
        const hit = s.title.toLowerCase().includes(q) || s.card_name.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [subtasks, search, statusFilter, priorityFilter]);

  const withExec = useMemo(
    () =>
      filtered.map((s) => ({
        ...s,
        executionDates: parseExecutionDatesFromJson(s.execution_dates_json),
      })),
    [filtered]
  );

  const buckets = useMemo(() => bucketMySubtasks(withExec, new Date()), [withExec]);

  const sortedToday = useMemo(() => sortHomeRows(buckets.today), [buckets.today]);
  const sortedWeek = useMemo(() => sortHomeRows(buckets.week), [buckets.week]);
  const sortedLater = useMemo(() => sortHomeRows(buckets.backlog), [buckets.backlog]);

  async function toggleComplete(row: HomeSubtaskRow, completed: boolean) {
    setBusyId(row.id);
    try {
      const r = await fetch(apiUrl(`/api/cards/${encodeURIComponent(row.card_id)}/subtasks/${encodeURIComponent(row.id)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(typeof d.error === "string" ? d.error : "Не удалось обновить");
      }
      await onReload();
    } catch {
      /* silent — home page may show global err later */
    } finally {
      setBusyId(null);
    }
  }

  if (!loading && subtasks.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-6 shadow-[var(--shadow-card)] sm:px-5">
        <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">Мои задачи</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
          Нет открытых подзадач с вашим участием. Когда проджект или администратор назначит вас исполнителем или лидом, они появятся здесь.
        </p>
        <Link href={appPath("/tasks")} className="mt-3 inline-block text-xs font-semibold text-[var(--primary)] hover:underline">
          Все задачи →
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
        Загрузка задач…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">Мои задачи</h2>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              По плану и дедлайнам. Отметьте выполненное — задача исчезнет из списка.
            </p>
          </div>
          <Link href={appPath("/tasks")} className="text-xs font-semibold text-[var(--primary)] hover:underline sm:shrink-0">
            Все задачи →
          </Link>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[11rem]">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Статус проекта</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter((e.target.value || "") as "" | SimpleViewGroupKey)} className="tt-select py-2 text-xs">
              <option value="">Все</option>
              {SIMPLE_VIEW_GROUPS.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[11rem]">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Приоритет</span>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter((e.target.value || "") as "" | ImportanceKey)} className="tt-select py-2 text-xs">
              <option value="">Все</option>
              {IMPORTANCE_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.key === "high" ? "Высокий" : o.key === "medium" ? "Средний" : "Низкий"}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 sm:max-w-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Поиск</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" aria-hidden>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
                </svg>
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Название или проект"
                className="tt-input w-full py-2 pl-8 text-xs"
              />
            </div>
          </label>
        </div>
      </div>

      <div className="divide-y divide-[var(--border)]/80">
        <BucketSection
          title="Сегодня"
          hintClass="text-amber-600/90 dark:text-amber-400/90"
          rows={sortedToday}
          teamUsers={teamUsers}
          busyId={busyId}
          onToggleComplete={toggleComplete}
        />
        <BucketSection
          title="На неделе"
          hintClass="text-violet-600/85 dark:text-violet-400/90"
          rows={sortedWeek}
          teamUsers={teamUsers}
          busyId={busyId}
          onToggleComplete={toggleComplete}
        />
        <BucketSection
          title="Позже"
          hintClass="text-[var(--muted-foreground)]"
          rows={sortedLater}
          teamUsers={teamUsers}
          busyId={busyId}
          onToggleComplete={toggleComplete}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)] sm:px-5">Нет задач по выбранным фильтрам.</p>
      ) : null}
    </div>
  );
}

function sortHomeRows(rows: HomeSubtaskRow[]): HomeSubtaskRow[] {
  const withExec = rows.map((s) => ({
    ...s,
    executionDates: parseExecutionDatesFromJson(s.execution_dates_json),
  }));
  const sorted = sortSubtasksInColumn(withExec);
  return [...sorted].sort((a, b) => {
    const ia = importanceRank(parseImportance(a.card_extra));
    const ib = importanceRank(parseImportance(b.card_extra));
    if (ia !== ib) return ia - ib;
    const da = effectiveDeadlineMs(a);
    const db = effectiveDeadlineMs(b);
    if (da != null && db != null && da !== db) return da - db;
    if (da != null && db == null) return -1;
    if (da == null && db != null) return 1;
    return a.title.localeCompare(b.title, "ru");
  });
}

function BucketSection({
  title,
  hintClass,
  rows,
  teamUsers,
  busyId,
  onToggleComplete,
}: {
  title: string;
  hintClass: string;
  rows: HomeSubtaskRow[];
  teamUsers: TeamUser[];
  busyId: string | null;
  onToggleComplete: (row: HomeSubtaskRow, completed: boolean) => void;
}) {
  const now = new Date();
  const countLabel = tasksCountRu(rows.length);
  return (
    <section className="px-3 py-3 sm:px-4">
      <h3 className={`mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] ${hintClass}`}>
        {title} · {countLabel}
      </h3>
      {rows.length === 0 ? (
        <p className="px-1 py-2 text-xs text-[var(--muted-foreground)]">Пусто</p>
      ) : (
        <ul className="space-y-0.5">
          {rows.map((row) => (
            <TaskRow key={row.id} row={row} teamUsers={teamUsers} busyId={busyId} onToggleComplete={onToggleComplete} now={now} />
          ))}
        </ul>
      )}
    </section>
  );
}

function TaskRow({
  row,
  teamUsers,
  busyId,
  onToggleComplete,
  now,
}: {
  row: HomeSubtaskRow;
  teamUsers: TeamUser[];
  busyId: string | null;
  onToggleComplete: (row: HomeSubtaskRow, completed: boolean) => void;
  now: Date;
}) {
  const g = statusToSimpleViewGroup(row.card_status);
  const cat = categoryChip(row.card_extra);
  const imp = parseImportance(row.card_extra);
  const pill = priorityPill(imp);
  const deadlineMs = effectiveDeadlineMs(row);
  const hint = formatDeadlineHint(deadlineMs, now);
  const assigneeId = row.assignee_user_id || row.lead_user_id;
  const u = assigneeId ? teamUsers.find((x) => x.id === assigneeId) : undefined;
  const initial = (u?.displayName || "?").trim().charAt(0).toUpperCase() || "?";

  const hintClass =
    hint.tone === "overdue" || hint.tone === "today"
      ? "text-red-600 dark:text-red-400"
      : hint.tone === "soon"
        ? "text-amber-700 dark:text-amber-300"
        : "text-[var(--muted-foreground)]";

  return (
    <li className="group flex items-center gap-2 rounded-lg px-1 py-1.5 transition-colors hover:bg-[var(--surface-2)]/50">
      <button
        type="button"
        title="Отметить выполненной"
        disabled={busyId === row.id}
        onClick={() => void onToggleComplete(row, true)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)] disabled:opacity-40"
        aria-label="Выполнено"
      >
        {busyId === row.id ? <span className="text-[10px]">…</span> : <span className="h-3.5 w-3.5 rounded-sm border border-current opacity-60" />}
      </button>
      <span className={`h-2 w-2 shrink-0 rounded-full ${simpleGroupDotClass(g)}`} title={statusLabel(row.card_status)} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-[var(--text)]">{row.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--muted-foreground)]">
          <span className="inline-flex items-center gap-1">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cat.dotClass}`} aria-hidden />
            <span className="text-[var(--muted-foreground)]">{cat.label}</span>
          </span>
          <span className="truncate text-[var(--muted-foreground)]/90">· {row.card_name}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {pill ? (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${pill.className}`}>{pill.label}</span>
        ) : null}
        {u?.avatarUrl ? (
          <img src={u.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-[var(--border)]" referrerPolicy="no-referrer" />
        ) : (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-2)] text-[10px] font-semibold text-[var(--text)] ring-1 ring-[var(--border)]"
            title={u?.displayName}
          >
            {initial}
          </span>
        )}
      </div>
      <div className={`shrink-0 text-right text-xs font-medium tabular-nums ${hintClass}`}>{hint.text}</div>
    </li>
  );
}
