"use client";

import type { ProjectDetailPayload } from "@/lib/v2/projects/project-detail-types";
import type { PortfolioKanbanStatus } from "@/lib/v2/projects/portfolio-types";
import { fmtRubShort, pluralRu } from "@/lib/v2/projects/portfolio-utils";
import { ProjectActionsMenu } from "@/components/v2/projects/delete-project-dialog";
import {
  AvatarStack,
  BudgetBar,
  ProjectBadge,
  StatusBadge,
} from "@/components/v2/projects/project-atoms";
import { PRIORITY_META, V2Icons } from "@/components/v2/ui/icons";

type BadgeProject = {
  shortName: string | null;
  name: string;
  colorBg: string | null;
  colorInk: string | null;
  colorTint: string | null;
};

function fmtTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function ProgressRing({
  value,
  total,
  size = 72,
  stroke = 8,
  color = "#3B6FF7",
}: {
  value: number;
  total: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#E4E4E7" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        style={{ transition: "stroke-dashoffset .9s cubic-bezier(.2,.7,.2,1)" }}
      />
    </svg>
  );
}

export function ProjectDetailHeader({
  detail,
  badgeProject,
  runningTaskId,
  runningTaskTitle,
  suggestedTask,
  elapsed,
  onToggleTimer,
  onEditProject,
  onEditMembers,
  canDelete,
  onDeleteRequest,
}: {
  detail: ProjectDetailPayload;
  badgeProject: BadgeProject;
  runningTaskId: string | null;
  runningTaskTitle?: string | null;
  suggestedTask?: { id: string; title: string } | null;
  elapsed: number;
  onToggleTimer: () => void;
  onEditProject?: () => void;
  onEditMembers?: () => void;
  canDelete?: boolean;
  onDeleteRequest?: () => void;
}) {
  const tasksPct = detail.tasksTotal > 0 ? detail.tasksDone / detail.tasksTotal : 0;
  const budgetPct = detail.budget > 0 ? detail.spent / detail.budget : 0;
  const overBudget = detail.spent > detail.budget;
  const isCritical = detail.health === "critical";
  const stripeColor = isCritical ? "#3B6FF7" : detail.health === "at_risk" ? "#F59E0B" : "#10B981";
  const kanbanStatus = detail.kanbanStatus as PortfolioKanbanStatus;
  const pm = PRIORITY_META[detail.priority];

  const runningTask = runningTaskId
    ? (detail.tasks.find((t) => t.id === runningTaskId) ??
        detail.tasks.flatMap((t) => t.subtasks).find((s) => s.id === runningTaskId) ??
        (runningTaskTitle ? { id: runningTaskId, title: runningTaskTitle } : null))
    : null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white shadow-[var(--v2-shadow-soft)]">
      <div className="v2-dotgrid pointer-events-none absolute inset-0 opacity-70" />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-[460px] w-[460px] rounded-full"
        style={{
          background: isCritical
            ? "radial-gradient(closest-side, rgba(59,111,247,0.18), transparent 70%)"
            : "radial-gradient(closest-side, rgba(59,111,247,0.10), transparent 70%)",
        }}
      />
      <span aria-hidden className="absolute bottom-0 left-0 top-0 w-[3px]" style={{ background: stripeColor }} />

      <div className="relative p-7">
        <div className="flex items-start gap-5">
          <ProjectBadge project={badgeProject} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2 text-[12px] text-[var(--v2-ink-500)]">
              <span className="v2-tight font-medium">{detail.category}</span>
              {detail.contractRef ? (
                <>
                  <span className="text-[var(--v2-ink-300)]">·</span>
                  <span className="v2-tight">{detail.contractRef}</span>
                </>
              ) : null}
              <span className="text-[var(--v2-ink-300)]">·</span>
              <span className="v2-tight">
                старт {detail.startedAt} · {detail.durationDays} {pluralRu(detail.durationDays, ["день", "дня", "дней"])}
              </span>
            </div>
            <div className="flex flex-wrap items-start gap-3">
              <h1 className="v2-tighter text-[34px] font-semibold leading-[1.05] text-[var(--v2-ink-900)]">{detail.name}</h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <StatusBadge status={kanbanStatus} />
                {detail.engagementType === "retainer" ? (
                  <span className="v2-tight inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-[2px] text-[11.5px] font-medium text-violet-700">
                    Постоянный
                    {detail.workMonthLabel ? ` · ${detail.workMonthLabel}` : ""}
                  </span>
                ) : (
                  <span className="v2-tight inline-flex items-center gap-1 rounded-md bg-[var(--v2-ink-100)]/70 px-1.5 py-[2px] text-[11.5px] font-medium text-[var(--v2-ink-600)]">
                    Разовый
                  </span>
                )}
                {detail.clientAccessEnabled ? (
                  <span className="v2-tight inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-[2px] text-[11.5px] font-medium text-emerald-700">
                    Доступ клиента
                  </span>
                ) : null}
                {isCritical ? (
                  <span className="v2-tight inline-flex items-center gap-1.5 rounded-full bg-[var(--v2-brand-50)] py-[3px] pl-2 pr-2.5 text-[12px] font-medium text-[var(--v2-brand-700)]">
                    <span className="v2-livedot relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--v2-brand-500)] text-[var(--v2-brand-500)]" />
                    Критично
                  </span>
                ) : null}
                <span
                  className="v2-tight inline-flex items-center gap-1 rounded-md px-1.5 py-[2px] text-[11.5px] font-medium"
                  style={{ background: pm.soft, color: pm.ink }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: pm.dot }} />
                  {pm.label}
                </span>
                {detail.deadlineDays != null && detail.deadlineDays >= 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--v2-ink-100)]/70 px-1.5 py-[2px] text-[11.5px] text-[var(--v2-ink-500)]">
                    <V2Icons.flame className="h-3 w-3 text-[var(--v2-brand-500)]" />
                    {detail.deadlineDays} {pluralRu(detail.deadlineDays, ["день", "дня", "дней"])} до релиза
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="-mt-1 flex items-center gap-1.5">
            {onEditProject ? (
              <button
                type="button"
                onClick={onEditProject}
                className="v2-tight inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-3.5 text-[12.5px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)]"
              >
                <V2Icons.edit className="h-[15px] w-[15px]" />
                Редактировать
              </button>
            ) : null}
            <button
              type="button"
              className="v2-tight inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[12.5px] text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
            >
              <V2Icons.share className="h-[15px] w-[15px] text-[var(--v2-ink-500)]" /> Поделиться
            </button>
            <ProjectActionsMenu
              projectName={detail.name}
              canDelete={Boolean(canDelete && onDeleteRequest)}
              onEditRequest={onEditProject}
              onDeleteRequest={() => onDeleteRequest?.()}
            />
          </div>
        </div>

        <div className="mt-7 grid grid-cols-12 gap-4">
          <div className="col-span-12 flex items-center gap-4 rounded-2xl bg-white/70 p-4 shadow-[var(--v2-shadow-card)] backdrop-blur md:col-span-3">
            <div className="relative">
              <ProgressRing value={detail.tasksDone} total={detail.tasksTotal} />
              <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <div className="v2-tnum v2-tighter text-[16px] font-semibold text-[var(--v2-ink-900)]">
                  {Math.round(tasksPct * 100)}
                  <span className="text-[11px] text-[var(--v2-ink-400)]">%</span>
                </div>
              </div>
            </div>
            <div className="min-w-0 leading-tight">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">Прогресс</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="v2-tnum v2-tighter text-[22px] font-semibold leading-none text-[var(--v2-ink-900)]">{detail.tasksDone}</span>
                <span className="v2-tnum text-[13px] leading-none text-[var(--v2-ink-400)]">/ {detail.tasksTotal}</span>
                <span className="ml-1 text-[11.5px] text-[var(--v2-ink-500)]">задач</span>
              </div>
            </div>
          </div>

          <div className="col-span-12 rounded-2xl bg-white/70 p-4 shadow-[var(--v2-shadow-card)] backdrop-blur md:col-span-3">
            <div className="flex items-center justify-between">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">Часов потрачено</div>
              <span className="v2-tight text-[10.5px] text-[var(--v2-ink-400)]">сегодня +{detail.hoursToday}ч</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="v2-tnum v2-tighter text-[22px] font-semibold leading-none text-[var(--v2-ink-900)]">{detail.loggedHours}</span>
              <span className="v2-tnum text-[13px] leading-none text-[var(--v2-ink-400)]">ч</span>
            </div>
          </div>

          <div className="col-span-12 rounded-2xl bg-white/70 p-4 shadow-[var(--v2-shadow-card)] backdrop-blur md:col-span-3">
            <div className="flex items-center justify-between">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">Финансы</div>
              <span className={`v2-tnum text-[10.5px] ${overBudget ? "font-semibold text-red-600" : "text-[var(--v2-ink-400)]"}`}>
                {Math.round(budgetPct * 100)}%
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={`v2-tnum v2-tighter text-[22px] font-semibold leading-none ${overBudget ? "text-red-600" : "text-[var(--v2-ink-900)]"}`}>
                {fmtRubShort(detail.spent)}
              </span>
              <span className="v2-tnum text-[13px] leading-none text-[var(--v2-ink-400)]">/ {fmtRubShort(detail.budget)} ₽</span>
            </div>
            <div className="mt-3">
              <BudgetBar spent={detail.spent} budget={detail.budget} />
            </div>
          </div>

          <div className="relative col-span-12 overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--v2-brand-600)] to-[var(--v2-brand-700)] p-4 text-white md:col-span-3">
            <div className="absolute -bottom-10 -right-10 h-[180px] w-[180px] rounded-full bg-white/10" />
            <div className="relative">
              {runningTaskId ? (
                <>
                  <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/80">
                    <span className="v2-livedot relative inline-flex h-1.5 w-1.5 rounded-full bg-white text-white" />
                    Таймер идёт
                  </div>
                  <div className="v2-tnum v2-tighter mt-1.5 font-mono text-[26px] leading-none">{fmtTimer(elapsed)}</div>
                  <div className="mt-1 truncate text-[11.5px] text-white/80">
                    {runningTask?.title ?? runningTaskTitle ?? "Задача"}
                  </div>
                  <button
                    type="button"
                    onClick={onToggleTimer}
                    className="v2-tight mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-[12px] font-medium text-[var(--v2-brand-700)] shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-brand-50)]"
                  >
                    <V2Icons.pause className="h-[13px] w-[13px]" /> Пауза
                  </button>
                </>
              ) : (
                <>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/80">Дедлайн</div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <div className="v2-tnum v2-tighter text-[22px] font-semibold leading-none">{detail.deadlineLabel}</div>
                  </div>
                  {detail.deadlineDays != null ? (
                    <div className="mt-1 text-[11.5px] text-white/80">
                      через {detail.deadlineDays} {pluralRu(detail.deadlineDays, ["день", "дня", "дней"])}
                      {detail.releaseLabel !== "—" ? ` · релиз ${detail.releaseLabel}` : ""}
                    </div>
                  ) : null}
                  {suggestedTask ? (
                    <div className="mt-2 truncate text-[11.5px] text-white/75">Задача: {suggestedTask.title}</div>
                  ) : (
                    <div className="mt-2 text-[11.5px] text-white/60">Нет открытых задач</div>
                  )}
                  <button
                    type="button"
                    onClick={onToggleTimer}
                    disabled={!suggestedTask}
                    className="v2-tight mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-white text-[12.5px] font-medium text-[var(--v2-brand-700)] shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-brand-50)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <V2Icons.play className="h-[14px] w-[14px] translate-x-px" /> Запустить таймер
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <AvatarStack members={detail.team} size={32} max={5} />
          <div className="leading-tight">
            <div className="v2-tight text-[12.5px] font-medium text-[var(--v2-ink-800)]">
              Команда · {detail.team.length} {pluralRu(detail.team.length, ["человек", "человека", "человек"])}
            </div>
            {detail.team.length > 0 ? (
              <div className="text-[11.5px] text-[var(--v2-ink-500)]">
                {detail.team
                  .slice(0, 2)
                  .map((m) => m.name.split(" ")[0])
                  .join(" · ")}
              </div>
            ) : null}
          </div>
          {detail.canManageMembers && onEditMembers ? (
            <button
              type="button"
              onClick={onEditMembers}
              className="v2-tight ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--v2-ink-200)] px-3 text-[12px] font-medium text-[var(--v2-ink-700)] transition hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-900)]"
            >
              <V2Icons.edit className="h-3.5 w-3.5" />
              Участники
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
