"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PmSubtaskWithCard } from "@/lib/pm-subtasks";
import { appPath } from "@/lib/api-url";
import { statusToSimpleViewGroup, type ImportanceKey, type SimpleViewGroupKey } from "@/lib/statuses";
import {
  addDays,
  buildDayToSubtasksMap,
  isSameLocalDay,
  parseCardImportance,
  startOfMonday,
  toYmd,
} from "@/lib/tasks-calendar";
import { parseCardProjectType } from "@/lib/work-presets";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;
const MAX_PILLS = 3;

type PmCard = { id: string; name: string };
type TeamUser = { id: string; displayName: string; avatarUrl?: string | null };

type Props = {
  subtasks: PmSubtaskWithCard[];
  cards: PmCard[];
  teamUsers: TeamUser[];
  canPm: boolean;
};

function pillClasses(imp: ImportanceKey | null, g: SimpleViewGroupKey): string {
  const base = "flex min-w-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-left text-[11px] font-medium leading-tight";
  const ring = "ring-1 ring-inset";
  if (imp === "high") return `${base} ${ring} border-red-800/40 bg-red-950/35 text-red-100`;
  if (imp === "medium") return `${base} ${ring} border-amber-800/35 bg-amber-950/30 text-amber-100`;
  if (imp === "low") return `${base} ${ring} border-violet-800/30 bg-violet-950/25 text-violet-100`;
  if (g === "awaiting_approval") return `${base} ${ring} border-orange-800/35 bg-orange-950/30 text-orange-100`;
  return `${base} ${ring} border-[var(--border)] bg-[var(--surface-2)]/80 text-[var(--text)]`;
}

function dotClassForProject(extra: string | null): string {
  const pt = parseCardProjectType(extra);
  if (pt === "site") return "bg-sky-400";
  if (pt === "presentation") return "bg-fuchsia-400";
  if (pt === "other") return "bg-violet-400";
  return "bg-[var(--muted-foreground)]";
}

function monthGrid(year: number, monthIndex: number): (Date | null)[][] {
  const first = new Date(year, monthIndex, 1);
  const pad = (first.getDay() + 6) % 7;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < pad; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(new Date(year, monthIndex, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export function TasksCalendarView({ subtasks, cards, teamUsers, canPm }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"month" | "week">("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [employeeId, setEmployeeId] = useState("");
  const [cardId, setCardId] = useState("");
  const [priority, setPriority] = useState<"" | ImportanceKey>("");
  const [dayModal, setDayModal] = useState<{ ymd: string; list: PmSubtaskWithCard[] } | null>(null);

  const filtered = useMemo(() => {
    return subtasks.filter((s) => {
      if (canPm && employeeId) {
        if (s.assignee_user_id !== employeeId && s.lead_user_id !== employeeId) return false;
      }
      if (canPm && cardId && s.card_id !== cardId) return false;
      if (priority) {
        const imp = parseCardImportance(s.card_extra);
        if (imp !== priority) return false;
      }
      return true;
    });
  }, [subtasks, canPm, employeeId, cardId, priority]);

  const dayMap = useMemo(() => buildDayToSubtasksMap(filtered), [filtered]);

  const monthMeta = useMemo(() => {
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const label = new Date(y, m, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
    return { y, m, label, rows: monthGrid(y, m) };
  }, [anchor]);

  const weekDays = useMemo(() => {
    const mon = startOfMonday(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  }, [anchor]);

  const weekLabel = useMemo(() => {
    const a = weekDays[0];
    const b = weekDays[6];
    if (!a || !b) return "";
    return `${a.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} — ${b.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}`;
  }, [weekDays]);

  function goToday() {
    setAnchor(new Date());
  }

  function goPrev() {
    setAnchor((d) => {
      if (mode === "month") return new Date(d.getFullYear(), d.getMonth() - 1, 1);
      return addDays(d, -7);
    });
  }

  function goNext() {
    setAnchor((d) => {
      if (mode === "month") return new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return addDays(d, 7);
    });
  }

  const today = new Date();

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 shadow-[var(--shadow-card)] ring-1 ring-[var(--border)]/15 dark:bg-[var(--surface)]/70">
      <div className="border-b border-[var(--border)]/70 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">Календарь</h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--muted-foreground)]">
              Задачи по датам плана, датам выполнения и дедлайнам. Нажмите на день — список задач на этот день.
            </p>
          </div>
          <div className="flex rounded-xl border border-[var(--border)] bg-[var(--bg)]/40 p-0.5">
            <button
              type="button"
              onClick={() => setMode("month")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === "month" ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--text)]"
              }`}
            >
              Месяц
            </button>
            <button
              type="button"
              onClick={() => setMode("week")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === "week" ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--text)]"
              }`}
            >
              Неделя
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]"
              aria-label="Назад"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goNext}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]"
              aria-label="Вперёд"
            >
              ›
            </button>
            <span className="min-w-[10rem] px-2 text-sm font-semibold capitalize text-[var(--text)] tabular-nums">
              {mode === "month" ? monthMeta.label : weekLabel}
            </span>
            <button
              type="button"
              onClick={goToday}
              className="rounded-lg border border-[var(--border)] bg-[var(--primary-soft)]/50 px-3 py-1.5 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)]"
            >
              Сегодня
            </button>
          </div>

          {canPm ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-end">
              <label className="flex min-w-[10rem] flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Сотрудник</span>
                <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="tt-select py-2 text-xs">
                  <option value="">Все сотрудники</option>
                  {teamUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-[10rem] flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Проект</span>
                <select value={cardId} onChange={(e) => setCardId(e.target.value)} className="tt-select py-2 text-xs">
                  <option value="">Все проекты</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-[8.5rem] flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Приоритет</span>
                <select
                  value={priority}
                  onChange={(e) => setPriority((e.target.value || "") as "" | ImportanceKey)}
                  className="tt-select py-2 text-xs"
                >
                  <option value="">Все приоритеты</option>
                  <option value="high">Высокий</option>
                  <option value="medium">Средний</option>
                  <option value="low">Низкий</option>
                </select>
              </label>
            </div>
          ) : (
            <label className="flex min-w-[8.5rem] flex-col gap-1 sm:ml-auto">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Приоритет</span>
              <select
                value={priority}
                onChange={(e) => setPriority((e.target.value || "") as "" | ImportanceKey)}
                className="tt-select py-2 text-xs"
              >
                <option value="">Все приоритеты</option>
                <option value="high">Высокий</option>
                <option value="medium">Средний</option>
                <option value="low">Низкий</option>
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="p-2 sm:p-3">
        {mode === "month" ? (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-7 border-b border-[var(--border)]/60 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="px-1 py-2">
                    {d}
                  </div>
                ))}
              </div>
              {monthMeta.rows.map((row, ri) => (
                <div key={ri} className="grid grid-cols-7 border-b border-[var(--border)]/40 last:border-b-0">
                  {row.map((cell, ci) => (
                    <DayCell
                      key={ci}
                      date={cell}
                      dayMap={dayMap}
                      today={today}
                      onOpen={(ymd, list) => setDayModal({ ymd, list })}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1 overflow-x-auto sm:gap-2">
            {weekDays.map((d) => (
              <WeekDayColumn key={toYmd(d)} date={d} dayMap={dayMap} today={today} onOpen={(ymd, list) => setDayModal({ ymd, list })} />
            ))}
          </div>
        )}
      </div>

      {dayModal ? (
        <DayTasksModal
          ymd={dayModal.ymd}
          list={dayModal.list}
          teamUsers={teamUsers}
          canPm={canPm}
          onClose={() => setDayModal(null)}
          onOpenBoard={(id) => router.push(appPath(`/board/${id}`))}
        />
      ) : null}
    </div>
  );
}

function DayCell({
  date,
  dayMap,
  today,
  onOpen,
}: {
  date: Date | null;
  dayMap: Map<string, PmSubtaskWithCard[]>;
  today: Date;
  onOpen: (ymd: string, list: PmSubtaskWithCard[]) => void;
}) {
  if (!date) {
    return <div className="min-h-[6.5rem] bg-[var(--bg)]/20 p-1 sm:min-h-[7.5rem]" />;
  }
  const ymd = toYmd(date);
  const list = dayMap.get(ymd) ?? [];
  const isToday = isSameLocalDay(date, today);
  const shown = list.slice(0, MAX_PILLS);
  const more = list.length - shown.length;

  return (
    <button
      type="button"
      onClick={() => onOpen(ymd, list)}
      className={`min-h-[6.5rem] w-full border-l border-[var(--border)]/35 p-1 text-left first:border-l-0 hover:bg-[var(--surface-2)]/40 sm:min-h-[7.5rem] sm:p-1.5`}
    >
      <div className="mb-1 flex justify-end">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
            isToday ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/30" : "text-[var(--text)]"
          }`}
        >
          {date.getDate()}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {shown.map((s) => (
          <TaskPill key={`${s.id}-${ymd}`} s={s} compact />
        ))}
        {more > 0 ? (
          <span className="px-0.5 pt-0.5 text-[10px] font-semibold text-[var(--primary)]">+{more} ещё</span>
        ) : null}
      </div>
    </button>
  );
}

function WeekDayColumn({
  date,
  dayMap,
  today,
  onOpen,
}: {
  date: Date;
  dayMap: Map<string, PmSubtaskWithCard[]>;
  today: Date;
  onOpen: (ymd: string, list: PmSubtaskWithCard[]) => void;
}) {
  const ymd = toYmd(date);
  const list = dayMap.get(ymd) ?? [];
  const isToday = isSameLocalDay(date, today);
  const shown = list.slice(0, MAX_PILLS);
  const more = list.length - shown.length;
  return (
    <button
      type="button"
      onClick={() => onOpen(ymd, list)}
      className="flex min-h-[12rem] min-w-0 flex-col rounded-xl border border-[var(--border)]/60 bg-[var(--bg)]/25 p-1.5 text-left hover:bg-[var(--surface-2)]/30 sm:min-h-[14rem] sm:p-2"
    >
      <div className="mb-2 text-center">
        <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
          {WEEKDAYS[(date.getDay() + 6) % 7]}
        </div>
        <div
          className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
            isToday ? "bg-[var(--primary)] text-white" : "text-[var(--text)]"
          }`}
        >
          {date.getDate()}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1">
        {shown.map((s) => (
          <TaskPill key={`${s.id}-w`} s={s} compact />
        ))}
        {more > 0 ? <span className="text-center text-[10px] font-semibold text-[var(--primary)]">+{more} ещё</span> : null}
      </div>
    </button>
  );
}

function TaskPill({ s, compact }: { s: PmSubtaskWithCard; compact?: boolean }) {
  const imp = parseCardImportance(s.card_extra);
  const g = statusToSimpleViewGroup(s.card_status);
  const dot = dotClassForProject(s.card_extra);
  return (
    <span className={`${pillClasses(imp, g)} ${compact ? "max-w-full" : ""}`} title={s.card_name}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className="truncate">{s.title}</span>
    </span>
  );
}

function DayTasksModal({
  ymd,
  list,
  teamUsers,
  canPm,
  onClose,
  onOpenBoard,
}: {
  ymd: string;
  list: PmSubtaskWithCard[];
  teamUsers: TeamUser[];
  canPm: boolean;
  onClose: () => void;
  onOpenBoard: (cardId: string) => void;
}) {
  const [y, m, d] = ymd.split("-").map(Number);
  const label =
    y && m && d
      ? new Date(y, m - 1, d).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : ymd;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" role="presentation" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-elevated)]"
        role="dialog"
        aria-modal
        aria-labelledby="tasks-day-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <div>
            <h3 id="tasks-day-title" className="text-base font-semibold text-[var(--text)]">
              Задачи на день
            </h3>
            <p className="mt-0.5 text-sm capitalize text-[var(--muted-foreground)]">{label}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]" aria-label="Закрыть">
            ✕
          </button>
        </div>
        <div className="max-h-[min(60vh,480px)] overflow-y-auto px-3 py-3 sm:px-4">
          {list.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">На этот день нет задач с выбранными датами.</p>
          ) : (
            <ul className="space-y-2">
              {list.map((s) => {
                const assignee = s.assignee_user_id ? teamUsers.find((u) => u.id === s.assignee_user_id) : undefined;
                const lead = s.lead_user_id ? teamUsers.find((u) => u.id === s.lead_user_id) : undefined;
                const imp = parseCardImportance(s.card_extra);
                return (
                  <li key={s.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30 p-3 dark:bg-[var(--surface-2)]/15">
                    <div className="flex items-start gap-2">
                      <TaskPill s={s} />
                    </div>
                    <div className="mt-2 text-xs text-[var(--muted-foreground)]">{s.card_name}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {assignee ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]">
                          {assignee.avatarUrl ? (
                            <img src={assignee.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-2)] text-[9px] font-semibold">
                              {(assignee.displayName || "?").charAt(0).toUpperCase()}
                            </span>
                          )}
                          {assignee.displayName}
                        </span>
                      ) : null}
                      {lead && lead.id !== assignee?.id ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-800/90 dark:text-amber-200/90">
                          Лид: {lead.displayName}
                        </span>
                      ) : null}
                      {imp ? (
                        <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--muted-foreground)] ring-1 ring-[var(--border)]">
                          {imp === "high" ? "Высокий" : imp === "medium" ? "Средний" : "Низкий"}
                        </span>
                      ) : null}
                    </div>
                    {canPm ? (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenBoard(s.card_id);
                        }}
                        className="mt-3 text-xs font-semibold text-[var(--primary)] hover:underline"
                      >
                        Открыть проект →
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
