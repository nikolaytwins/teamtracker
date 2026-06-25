"use client";

import { PriorityDot, TaskCheckbox } from "@/components/v2/ui/primitives";
import { V2Icons } from "@/components/v2/ui/icons";
import {
  formatPersonalTodoDateLabel,
  isPersonalTodoOverdue,
} from "@/lib/v2/personal/todo-date";
import type { PersonalTodoRow } from "@/lib/v2/personal/todo-types";

function PersonalProjectChipMini({ name, color }: { name: string; color?: string | null }) {
  const bg = color ?? "#E4E4E7";
  return (
    <span className="inline-flex max-w-[140px] items-center gap-1 rounded-full bg-white py-[2px] pl-1 pr-2 text-[11px] shadow-[var(--v2-shadow-card)]">
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

export function PersonalTodoRowItem({
  todo,
  onToggle,
  onOpen,
  onAddSubtask,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
  showProject = true,
  compact = false,
}: {
  todo: PersonalTodoRow;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onAddSubtask?: (id: string) => void;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  showProject?: boolean;
  compact?: boolean;
}) {
  const completed = !!todo.completed_at;
  const overdue = isPersonalTodoOverdue(todo);
  const dateYmd = todo.scheduled_date ?? todo.due_date;
  const dateLabel = formatPersonalTodoDateLabel(dateYmd);
  const hasSubtasks = (todo.subtask_count ?? 0) > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", todo.id);
        onDragStart?.();
      }}
      onDragEnd={() => onDragEnd?.()}
      onClick={() => onOpen(todo.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(todo.id);
        }
      }}
      className={`group relative flex cursor-pointer items-center gap-3 transition-colors duration-200 ${
        compact ? "px-2 py-2" : "py-3 pl-4 pr-3"
      } ${completed ? "opacity-60" : "hover:bg-[var(--v2-ink-50)]/70"} ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <span onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <TaskCheckbox checked={completed} onChange={() => onToggle(todo.id)} />
      </span>

      <div className="min-w-0 flex-1">
        <h4
          className={`v2-tight truncate font-medium text-[var(--v2-ink-900)] ${
            compact ? "text-[13px]" : "text-[14.5px]"
          } ${completed ? "text-[var(--v2-ink-500)] line-through" : ""}`}
        >
          {todo.title}
        </h4>

        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-[var(--v2-ink-500)]">
          {showProject && todo.project_name ? (
            <PersonalProjectChipMini name={todo.project_name} color={todo.project_color} />
          ) : null}
          {dateLabel ? (
            <>
              {showProject && todo.project_name ? <span className="text-[var(--v2-ink-300)]">·</span> : null}
              <span className={`v2-tight inline-flex items-center gap-1 ${overdue ? "font-medium text-red-600" : ""}`}>
                <V2Icons.clock className="h-[13px] w-[13px]" />
                {dateLabel}
              </span>
            </>
          ) : null}
          {todo.priority !== "medium" ? (
            <>
              <span className="text-[var(--v2-ink-300)]">·</span>
              <PriorityDot priority={todo.priority} />
            </>
          ) : null}
          {hasSubtasks ? (
            <>
              <span className="text-[var(--v2-ink-300)]">·</span>
              <span className="v2-tight inline-flex items-center gap-1 text-[var(--v2-ink-500)]">
                <V2Icons.tasks className="h-[13px] w-[13px]" />
                <span className="v2-tnum">
                  {todo.subtask_done ?? 0}/{todo.subtask_count}
                </span>
              </span>
            </>
          ) : null}
        </div>
      </div>

      {onAddSubtask && !completed ? (
        <button
          type="button"
          title="Добавить подзадачу"
          onClick={(e) => {
            e.stopPropagation();
            onAddSubtask(todo.id);
          }}
          className="v2-tight shrink-0 rounded-lg p-1.5 text-[var(--v2-ink-400)] opacity-0 transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-700)] group-hover:opacity-100"
        >
          <V2Icons.plus className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
