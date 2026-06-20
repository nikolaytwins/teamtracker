"use client";

import { isBurningProject, projectForTask } from "@/components/v2/inbox/inbox-meta";
import { HealthDot, PriorityDot } from "@/components/v2/projects/project-atoms";
import { HEALTH_META, PRIORITY_META } from "@/components/v2/projects/portfolio-meta";
import { ProjectChip, TimerButton } from "@/components/v2/ui/primitives";
import type { PortfolioProject } from "@/lib/v2/projects/portfolio-types";
import type { V2TaskWithMeta } from "@/lib/v2/types";

export function InboxTaskCard({
  task,
  projectsById,
  dragging = false,
  draggable = false,
  onDragStart,
  onDragEnd,
  onPromote,
  onOpen,
  compact = false,
  running = false,
  onToggleRun,
}: {
  task: V2TaskWithMeta;
  projectsById: Map<string, PortfolioProject>;
  dragging?: boolean;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onPromote?: () => void;
  onOpen?: () => void;
  compact?: boolean;
  running?: boolean;
  onToggleRun?: () => void;
}) {
  const project = projectForTask(task, projectsById);
  const burning = project ? isBurningProject(project.health) : false;
  const showProjectPriority = !!project;
  const healthDot = project?.health ?? null;
  const stripeColor = burning && healthDot ? HEALTH_META[healthDot].dot : "transparent";

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
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
      } ${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${
        dragging ? "scale-[0.98] opacity-50" : ""} ${
        burning && project?.health === "critical" ? "ring-1 ring-red-200/80" : ""
      } ${burning && project?.health === "at_risk" ? "ring-1 ring-amber-200/80" : ""}`}
    >
      <span
        aria-hidden
        className="absolute bottom-0 left-0 top-0 w-[3px]"
        style={{ background: stripeColor, opacity: burning ? 1 : 0 }}
      />
      <div className={compact ? "p-2.5 pl-3.5" : "p-3.5 pl-4"}>
        <div className="flex items-start gap-2">
          <h4 className={`v2-tight min-w-0 flex-1 font-semibold leading-[1.3] text-[var(--v2-ink-900)] ${compact ? "text-[13px]" : "text-[14px]"}`}>
            {task.title}
          </h4>
          {onToggleRun ? (
            <TimerButton running={running} onClick={onToggleRun} />
          ) : null}
          {healthDot && burning ? <HealthDot health={healthDot} /> : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {task.project_name ? (
            <ProjectChip
              name={task.project_name}
              short={task.project_short_name}
              bg={task.project_color_bg}
              tint={task.project_color_tint}
              ink={task.project_color_ink}
              size="sm"
            />
          ) : (
            <span className="text-[11px] text-[var(--v2-ink-400)]">Без проекта</span>
          )}
          {showProjectPriority && project ? (
            <span
              className="v2-tight inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium"
              style={{
                background: `${PRIORITY_META[project.priority].dot}18`,
                color: PRIORITY_META[project.priority].dot,
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: PRIORITY_META[project.priority].dot }} />
              {PRIORITY_META[project.priority].label} проект
            </span>
          ) : null}
          {!showProjectPriority && task.priority !== "medium" ? (
            <PriorityDot priority={task.priority} />
          ) : null}
        </div>

        {task.assignee_name ? (
          <div className="mt-1.5 text-[11px] text-[var(--v2-ink-500)]">{task.assignee_name}</div>
        ) : null}

        {onPromote ? (
          <button
            type="button"
            className="mt-2.5 text-[11px] font-medium text-[var(--v2-brand-600)] opacity-0 transition hover:underline group-hover:opacity-100"
            onClick={onPromote}
          >
            → В список задач
          </button>
        ) : null}
      </div>
    </div>
  );
}
