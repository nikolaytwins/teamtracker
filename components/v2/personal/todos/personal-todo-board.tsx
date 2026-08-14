"use client";

import { PriorityDot } from "@/components/v2/projects/project-atoms";
import { formatWeekColumnLabel } from "@/lib/v2/home/home-schedule";
import { personalTodoTodayYmd } from "@/lib/v2/personal/todo-date";
import type { PersonalKanbanColumn, PersonalTodoRow } from "@/lib/v2/personal/todo-types";

const KANBAN_COLUMNS: { key: PersonalKanbanColumn; label: string; dot: string }[] = [
  { key: "unassigned", label: "Нераспределённые", dot: "#F59E0B" },
  { key: "today", label: "Сегодня", dot: "#3B6FF7" },
  { key: "tomorrow", label: "Завтра", dot: "#A1A1AA" },
  { key: "this_week", label: "На этой неделе", dot: "#A1A1AA" },
  { key: "later", label: "Позже", dot: "#D4D4D8" },
];

function PersonalProjectChip({ name, color }: { name: string; color?: string | null }) {
  const bg = color ?? "#E4E4E7";
  return (
    <span className="inline-flex max-w-[160px] items-center gap-1.5 rounded-full bg-[var(--v2-ink-50)] py-[2px] pl-1 pr-2 text-[11px]">
      <span
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
        style={{ background: bg }}
      >
        {name.slice(0, 1)}
      </span>
      <span className="v2-tight truncate font-medium text-[var(--v2-ink-700)]">{name}</span>
    </span>
  );
}

export function PersonalTodoBoardCard({
  todo,
  dragging = false,
  draggable = false,
  onDragStart,
  onDragEnd,
  onOpen,
}: {
  todo: PersonalTodoRow;
  dragging?: boolean;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onOpen?: () => void;
}) {
  const priority = todo.priority;
  const showPriority = priority && priority !== "medium";

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", todo.id);
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      className={`group relative overflow-hidden rounded-2xl bg-white shadow-[var(--v2-shadow-card)] transition-all duration-200 hover:shadow-[var(--v2-shadow-cardHv)] ${
        onOpen ? "cursor-pointer" : ""
      } ${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${dragging ? "scale-[0.98] opacity-50" : ""}`}
    >
      <div className="p-2.5 pl-3.5">
        <h4 className="v2-tight min-w-0 text-[13px] font-semibold leading-[1.3] text-[var(--v2-ink-900)]">
          {todo.title}
        </h4>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {todo.project_name ? (
            <PersonalProjectChip name={todo.project_name} color={todo.project_color} />
          ) : (
            <span className="text-[11px] text-[var(--v2-ink-400)]">Без проекта</span>
          )}
          {showPriority && priority ? <PriorityDot priority={priority} /> : null}
          {(todo.subtask_count ?? 0) > 0 ? (
            <span className="v2-tnum text-[10.5px] text-[var(--v2-ink-400)]">
              {todo.subtask_done ?? 0}/{todo.subtask_count}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PersonalBoardColumn({
  label,
  dot,
  todos,
  dragId,
  onDragStart,
  onDragEnd,
  onOpen,
  onDrop,
  dropActive,
  onDragEnterColumn,
}: {
  label: string;
  dot: string;
  todos: PersonalTodoRow[];
  dragId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onOpen: (id: string) => void;
  onDrop?: () => void;
  dropActive?: boolean;
  onDragEnterColumn?: () => void;
}) {
  return (
    <div
      onDragOver={
        onDrop
          ? (e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              onDragEnterColumn?.();
            }
          : undefined
      }
      onDrop={
        onDrop
          ? (e) => {
              e.preventDefault();
              onDrop();
              onDragEnd();
            }
          : undefined
      }
      onDragLeave={() => {
        /* parent clears via drag end / enter other */
      }}
      className={`v2-kcol flex w-[280px] shrink-0 flex-col rounded-2xl bg-white/40 backdrop-blur-sm transition-all ${
        dropActive ? "bg-[var(--v2-brand-50)]/60 ring-2 ring-[var(--v2-brand-400)] ring-offset-2 ring-offset-transparent" : ""
      }`}
    >
      <div className="v2-kcol-head sticky top-0 z-10 flex items-center gap-2 rounded-t-2xl border-b border-[var(--v2-ink-100)]/70 bg-white/70 px-3.5 py-3 backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
        <h3 className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">{label}</h3>
        <span className="v2-tnum text-[11.5px] text-[var(--v2-ink-500)]">{todos.length}</span>
      </div>
      <div className="flex min-h-[120px] flex-col gap-2.5 p-2.5">
        {todos.length === 0 ? (
          <div className="v2-tight py-6 text-center text-[12px] italic text-[var(--v2-ink-400)]">Пока пусто</div>
        ) : (
          todos.map((todo, i) => (
            <div key={todo.id} className="v2-card-in" style={{ animationDelay: `${i * 40}ms` }}>
              <PersonalTodoBoardCard
                todo={todo}
                draggable
                dragging={dragId === todo.id}
                onDragStart={() => onDragStart(todo.id)}
                onDragEnd={onDragEnd}
                onOpen={() => onOpen(todo.id)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function PersonalWeekBoard({
  dates,
  columns,
  unscheduled,
  dragId,
  dragOverDate,
  onDragStart,
  onDragEnd,
  onDragOverDate,
  onDropDate,
  onOpen,
}: {
  dates: string[];
  columns: Record<string, PersonalTodoRow[]>;
  unscheduled: PersonalTodoRow[];
  dragId: string | null;
  dragOverDate: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOverDate: (ymd: string | null) => void;
  onDropDate: (ymd: string) => void;
  onOpen: (id: string) => void;
}) {
  const todayYmd = dates[0] ?? personalTodoTodayYmd();

  return (
    <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-4">
      {dates.map((ymd, i) => (
        <PersonalBoardColumn
          key={ymd}
          label={formatWeekColumnLabel(ymd, todayYmd)}
          dot={i === 0 ? "#3B6FF7" : i === 1 ? "#6366F1" : "#A1A1AA"}
          todos={columns[ymd] ?? []}
          dragId={dragId}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onOpen={onOpen}
          onDrop={() => onDropDate(ymd)}
          dropActive={dragOverDate === ymd}
          onDragEnterColumn={() => onDragOverDate(ymd)}
        />
      ))}
      {unscheduled.length > 0 ? (
        <PersonalBoardColumn
          key="unscheduled"
          label="Без даты"
          dot="#D4D4D8"
          todos={unscheduled}
          dragId={dragId}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onOpen={onOpen}
        />
      ) : null}
    </div>
  );
}

export function PersonalKanbanBoard({
  kanban,
  dragId,
  dragOverColumn,
  onDragStart,
  onDragEnd,
  onDragOverColumn,
  onDropColumn,
  onOpen,
}: {
  kanban: Record<PersonalKanbanColumn, PersonalTodoRow[]>;
  dragId: string | null;
  dragOverColumn: PersonalKanbanColumn | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOverColumn: (key: PersonalKanbanColumn | null) => void;
  onDropColumn: (key: PersonalKanbanColumn) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-4">
      {KANBAN_COLUMNS.map(({ key, label, dot }) => (
        <PersonalBoardColumn
          key={key}
          label={label}
          dot={dot}
          todos={kanban[key] ?? []}
          dragId={dragId}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onOpen={onOpen}
          onDrop={() => onDropColumn(key)}
          dropActive={dragOverColumn === key}
          onDragEnterColumn={() => onDragOverColumn(key)}
        />
      ))}
    </div>
  );
}
