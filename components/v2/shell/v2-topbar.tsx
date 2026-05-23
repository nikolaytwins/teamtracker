"use client";

import { V2Icons } from "@/components/v2/ui/icons";
import { V2NotificationsBell } from "@/components/v2/shell/notifications-bell";

export function V2Topbar({
  workspaceName,
  onNewTask,
  onOpenCommands,
  onOpenTask,
}: {
  workspaceName?: string;
  onNewTask?: () => void;
  onOpenCommands?: () => void;
  onOpenTask?: (taskId: string) => void;
}) {
  return (
    <div className="flex h-14 items-center gap-3 px-7">
      <div className="flex items-center gap-2 text-[13px] text-[var(--v2-ink-500)]">
        <span className="text-[var(--v2-ink-400)]">{workspaceName ?? "Студия"}</span>
        <span className="text-[var(--v2-ink-300)]">/</span>
        <span className="v2-tight font-medium text-[var(--v2-ink-900)]">Мои задачи</span>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenCommands}
          className="hidden h-9 items-center gap-2 rounded-xl bg-white/70 px-3 text-[12.5px] text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-card)] transition hover:text-[var(--v2-ink-900)] hover:shadow-[var(--v2-shadow-cardHv)] md:flex"
        >
          <V2Icons.command className="h-[15px] w-[15px]" /> Команды{" "}
          <span className="ml-1 rounded bg-[var(--v2-ink-100)]/80 px-1 py-px font-mono text-[10.5px] tracking-wider text-[var(--v2-ink-400)]">
            ⌘
          </span>
        </button>
        <V2NotificationsBell onOpenTask={onOpenTask} />
        <button
          type="button"
          onClick={onNewTask}
          className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-3.5 text-[12.5px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)]"
        >
          <V2Icons.plus className="h-4 w-4" />
          Новая задача
          <span className="ml-1 rounded border border-white/20 px-1 py-px font-mono text-[10.5px] tracking-wider text-white/60">
            N
          </span>
        </button>
      </div>
    </div>
  );
}