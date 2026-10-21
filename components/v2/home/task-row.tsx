"use client";

import { fmtDuration, formatDueLabel } from "@/lib/v2/format";
import { BUCKET_LABELS, HOME_DROP_BUCKETS } from "@/lib/v2/tasks/task-buckets";
import type { V2TaskBucket, V2TaskWithMeta } from "@/lib/v2/types";
import { PRIORITY_META, V2Icons } from "@/components/v2/ui/icons";
import { IconBtn, PriorityDot, ProjectChip, TaskCheckbox, TimerButton } from "@/components/v2/ui/primitives";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

type MenuPos = { top: number; right: number };

function MoveMenu({
  title,
  currentBucket,
  pos,
  onPick,
  onClose,
}: {
  title: string;
  currentBucket?: V2TaskBucket;
  pos: MenuPos;
  onPick: (bucket: V2TaskBucket) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const host = typeof document !== "undefined" ? (document.querySelector(".v2-root") ?? document.body) : null;
  if (!host) return null;

  return createPortal(
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key !== "Escape") e.stopPropagation();
      }}
    >
      <div className="fixed inset-0 z-[80] bg-black/30 lg:bg-transparent" onClick={onClose} aria-hidden />
      <div
        role="menu"
        className="fixed inset-x-2 bottom-[calc(var(--v2-mobnav-h,0px)+8px)] z-[81] max-h-[min(70dvh,420px)] overflow-y-auto rounded-2xl border border-[var(--v2-ink-100)] bg-white p-2 shadow-[var(--v2-shadow-pop)] lg:inset-x-auto lg:bottom-auto lg:right-[var(--mm-right)] lg:top-[var(--mm-top)] lg:w-[220px] lg:rounded-xl lg:p-1"
        style={{ ["--mm-top" as string]: `${pos.top}px`, ["--mm-right" as string]: `${pos.right}px` } as CSSProperties}
      >
        <div className="px-3 pb-2 pt-1.5 lg:pb-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">Перенести</div>
          <div className="v2-tight mt-0.5 truncate text-[14px] font-medium text-[var(--v2-ink-900)] lg:hidden">{title}</div>
        </div>
        {HOME_DROP_BUCKETS.map((bucket) => (
          <button
            key={bucket}
            type="button"
            role="menuitem"
            disabled={bucket === currentBucket}
            onClick={() => {
              onPick(bucket);
              onClose();
            }}
            className="v2-tight flex h-12 w-full items-center rounded-xl px-3 text-left text-[15px] text-[var(--v2-ink-800)] transition hover:bg-[var(--v2-ink-50)] active:bg-[var(--v2-ink-100)] disabled:text-[var(--v2-ink-300)] lg:h-9 lg:rounded-lg lg:text-[13px]"
          >
            {BUCKET_LABELS[bucket]}
          </button>
        ))}
        <button
          type="button"
          onClick={onClose}
          className="v2-tight mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-[var(--v2-ink-50)] text-[15px] font-medium text-[var(--v2-ink-600)] lg:hidden"
        >
          Отмена
        </button>
      </div>
    </div>,
    host
  );
}

export function TaskRow({
  task,
  isRunning,
  elapsed,
  onToggleRun,
  onToggleDone,
  onOpen,
  currentBucket,
  onMoveToBucket,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
}: {
  task: V2TaskWithMeta;
  isRunning: boolean;
  elapsed: number;
  onToggleRun: (id: string) => void;
  onToggleDone: (id: string) => void;
  onOpen: (id: string) => void;
  currentBucket?: V2TaskBucket;
  onMoveToBucket?: (bucket: V2TaskBucket) => void;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const moreRef = useRef<HTMLSpanElement>(null);
  const completed = !!task.completed_at;
  const live = isRunning ? elapsed : 0;
  const totalOnTask = task.logged_seconds + live;
  const est = task.estimate_seconds ?? 0;
  const pct = est > 0 ? Math.min(totalOnTask / est, 1) : 0;
  const priority = PRIORITY_META[task.priority ?? "medium"];
  const overdue = task.bucket === "overdue";
  const dueLabel = formatDueLabel(task.planned_at ?? task.deadline_at, task.bucket, undefined, task.completed_at);
  const isMeeting = /синк|встреч|дейли|созвон/i.test(task.title);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", task.id);
        onDragStart?.();
      }}
      onDragEnd={() => onDragEnd?.()}
      onClick={() => onOpen(task.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(task.id);
        }
      }}
      className={`group relative flex cursor-pointer items-center gap-3 py-3 pl-3 pr-2 transition-colors sm:gap-4 sm:pl-4 sm:pr-3 duration-200 ${
        isRunning ? "bg-[var(--v2-brand-50)]/50" : "hover:bg-[var(--v2-ink-50)]/70"
      } ${completed ? "opacity-60" : ""} ${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <span
        aria-hidden
        className={`absolute bottom-2 left-0 top-2 w-[3px] rounded-r transition-opacity ${
          isRunning ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        style={{ background: isRunning ? "#3B6FF7" : priority.dot }}
      />

      <span
        className="-m-2.5 inline-flex shrink-0 p-2.5 sm:m-0 sm:p-0"
        onClick={(e) => {
          e.stopPropagation();
          if (e.target === e.currentTarget) onToggleDone(task.id);
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <TaskCheckbox checked={completed} onChange={() => onToggleDone(task.id)} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 max-sm:flex-wrap max-sm:gap-y-1">
          {isMeeting ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--v2-brand-100)] bg-[var(--v2-brand-50)] px-1.5 py-[2px] text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-brand-700)]">
              Встреча
            </span>
          ) : null}
          <h4
            className={`v2-tight min-w-0 text-[14.5px] font-medium max-sm:line-clamp-2 max-sm:break-words sm:truncate text-[var(--v2-ink-900)] ${
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

      <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <TimerButton running={isRunning} onClick={() => onToggleRun(task.id)} />
        <span ref={moreRef} className="inline-flex">
          <IconBtn
            title={onMoveToBucket ? "Перенести" : "Ещё"}
            className={`transition ${menuPos ? "opacity-100" : "opacity-0 group-hover:opacity-100"} ${
              onMoveToBucket ? "max-lg:h-10 max-lg:w-10 max-lg:opacity-100 [@media(hover:none)]:opacity-100" : "max-lg:hidden"
            }`}
            onClick={
              onMoveToBucket
                ? () => {
                    const rect = moreRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const top = rect.bottom + 6 + 260 > window.innerHeight ? Math.max(8, rect.top - 6 - 260) : rect.bottom + 6;
                    setMenuPos({ top, right: Math.max(8, window.innerWidth - rect.right) });
                  }
                : undefined
            }
          >
            <V2Icons.more className="h-4 w-4" />
          </IconBtn>
        </span>
        {menuPos && onMoveToBucket ? (
          <MoveMenu
            title={task.title}
            currentBucket={currentBucket}
            pos={menuPos}
            onPick={onMoveToBucket}
            onClose={() => setMenuPos(null)}
          />
        ) : null}
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
    <div className="mt-1.5 flex items-center gap-2.5 text-[12px] text-[var(--v2-ink-500)] max-sm:flex-wrap max-sm:gap-x-2 max-sm:gap-y-1">
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
