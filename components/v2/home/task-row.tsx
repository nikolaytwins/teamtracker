"use client";

import { fmtDuration, formatDueLabel } from "@/lib/v2/format";
import type { V2TaskWithMeta } from "@/lib/v2/types";
import { PRIORITY_META, V2Icons } from "@/components/v2/ui/icons";
import { IconBtn, PriorityDot, ProjectChip, TaskCheckbox, TimerButton } from "@/components/v2/ui/primitives";

export function TaskRow({
  task,
  isRunning,
  elapsed,
  onToggleRun,
  onToggleDone,
  onOpen,
}: {
  task: V2TaskWithMeta;
  isRunning: boolean;
  elapsed: number;
  onToggleRun: (id: string) => void;
  onToggleDone: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const completed = !!task.completed_at;
  const live = isRunning ? elapsed : 0;
  const totalOnTask = task.logged_seconds + live;
  const est = task.estimate_seconds ?? 0;
  const pct = est > 0 ? Math.min(totalOnTask / est, 1) : 0;
  const priority = PRIORITY_META[task.priority];
  const overdue = task.bucket === "overdue";
  const dueLabel = formatDueLabel(task.deadline_at, task.bucket);
  const isMeeting = /синк|встреч|дейли|созвон/i.test(task.title);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(task.id);
        }
      }}
      className={`group relative flex cursor-pointer items-center gap-4 py-3 pl-4 pr-3 transition-colors duration-200 ${
        isRunning ? "bg-[var(--v2-brand-50)]/50" : "hover:bg-[var(--v2-ink-50)]/70"
      } ${completed ? "opacity-60" : ""}`}
    >
      <span
        aria-hidden
        className={`absolute bottom-2 left-0 top-2 w-[3px] rounded-r transition-opacity ${
          isRunning ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        style={{ background: isRunning ? "#3B6FF7" : priority.dot }}
      />

      <TaskCheckbox checked={completed} onChange={() => onToggleDone(task.id)} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isMeeting ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-[var(--v2-brand-100)] bg-[var(--v2-brand-50)] px-1.5 py-[2px] text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-brand-700)]">
              Встреча
            </span>
          ) : null}
          <h4
            className={`v2-tight truncate text-[14.5px] font-medium text-[var(--v2-ink-900)] ${
              completed ? "text-[var(--v2-ink-500)] line-through" : ""
            }`}
          >
            {task.title}
          </h4>
          {isRunning ? (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[var(--v2-brand-700)]">
              <span className="v2-livedot relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--v2-brand-500)] text-[var(--v2-brand-500)]" />
              идёт запись
            </span>
          ) : null}
        </div>
        <TaskRowMeta task={task} dueLabel={dueLabel} overdue={overdue} priority={task.priority} />
      </div>

      <div className="hidden w-[160px] shrink-0 flex-col items-end md:flex">
        <div className="v2-tnum text-[12px] font-medium text-[var(--v2-ink-700)]">
          {fmtDuration(totalOnTask)}{" "}
          <span className="font-normal text-[var(--v2-ink-400)]">/ {est > 0 ? fmtDuration(est) : "—"}</span>
        </div>
        <div className="mt-1.5 h-[4px] w-full overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.round(pct * 100)}%`,
              background: isRunning
                ? "linear-gradient(90deg,#3B6FF7,#2A56EB)"
                : pct >= 1
                  ? "#10B981"
                  : "#A1A1AA",
              transition: "width .8s cubic-bezier(.2,.7,.2,1)",
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <TimerButton running={isRunning} onClick={() => onToggleRun(task.id)} />
        <IconBtn title="Ещё" className="opacity-0 transition group-hover:opacity-100">
          <V2Icons.more className="h-4 w-4" />
        </IconBtn>
      </div>
    </div>
  );
}

function TaskRowMeta({
  task,
  dueLabel,
  overdue,
  priority,
}: {
  task: V2TaskWithMeta;
  dueLabel: string;
  overdue: boolean;
  priority: V2TaskWithMeta["priority"];
}) {
  return (
    <div className="mt-1.5 flex items-center gap-2.5 text-[12px] text-[var(--v2-ink-500)]">
      {task.project_name ? (
        <ProjectChip
          name={task.project_name}
          short={task.project_short_name}
          bg={task.project_color_bg}
          tint={task.project_color_tint}
          ink={task.project_color_ink}
        />
      ) : null}
      <span className="text-[var(--v2-ink-300)]">·</span>
      <span className={`v2-tight inline-flex items-center gap-1.5 ${overdue ? "font-medium text-red-600" : ""}`}>
        <V2Icons.clock className="h-[13px] w-[13px]" />
        {dueLabel}
      </span>
      <span className="text-[var(--v2-ink-300)]">·</span>
      <PriorityDot priority={priority} />
      {task.comment_count || task.link_count ? (
        <>
          <span className="text-[var(--v2-ink-300)]">·</span>
          <span className="inline-flex items-center gap-3">
            {task.comment_count ? (
              <span className="inline-flex items-center gap-1">
                <V2Icons.chat className="h-[13px] w-[13px]" />
                <span className="v2-tnum">{task.comment_count}</span>
              </span>
            ) : null}
            {task.link_count ? (
              <span className="inline-flex items-center gap-1">
                <V2Icons.paperclip className="h-[13px] w-[13px]" />
                <span className="v2-tnum">{task.link_count}</span>
              </span>
            ) : null}
          </span>
        </>
      ) : null}
    </div>
  );
}
