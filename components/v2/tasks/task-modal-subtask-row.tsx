"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { V2TaskRow } from "@/lib/v2/types";
import type { PortfolioMember } from "@/lib/v2/projects/portfolio-types";
import { MemberAvatar } from "@/components/v2/projects/project-atoms";
import { PRIORITY_META, V2Icons } from "@/components/v2/ui/icons";
import { TaskCheckbox } from "@/components/v2/ui/primitives";
import {
  InlineAssigneeEditor,
  InlineDeadlineEditor,
  InlinePlannedEditor,
  InlinePopover,
  InlinePriorityEditor,
  InlineTitleEditor,
  memberFromTeam,
} from "@/components/v2/tasks/task-inline-editors";
import { useState } from "react";

type Field = "priority" | "assignee" | "planned" | "deadline" | null;

export function TaskModalSubtaskRow({
  sub,
  team,
  onReload,
  onParentReload,
}: {
  sub: V2TaskRow;
  team: PortfolioMember[];
  onReload: () => Promise<void>;
  onParentReload?: () => void;
}) {
  const completed = !!sub.completed_at;
  const [editingTitle, setEditingTitle] = useState(false);
  const [openField, setOpenField] = useState<Field>(null);
  const member = memberFromTeam(sub.assignee_user_id, null, team);
  const pm = PRIORITY_META[sub.priority ?? "medium"];

  async function toggleComplete() {
    await fetchJson(`/api/v2/tasks/${sub.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", completed: !completed }),
    });
    await onReload();
    onParentReload?.();
  }

  const afterPatch = async () => {
    await onReload();
  };

  return (
    <div className="flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-[var(--v2-ink-50)]">
      <TaskCheckbox checked={completed} onChange={() => void toggleComplete()} />
      <div className="min-w-0 flex-1">
        {editingTitle ? (
          <InlineTitleEditor
            taskId={sub.id}
            title={sub.title}
            completed={completed}
            onReload={afterPatch}
            onDone={() => setEditingTitle(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            className={`v2-tight block w-full text-left text-[13px] ${completed ? "text-[var(--v2-ink-400)] line-through" : "text-[var(--v2-ink-800)]"}`}
          >
            {sub.title}
          </button>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenField((f) => (f === "priority" ? null : "priority"))}
              className="rounded-md px-1 py-0.5 hover:bg-[var(--v2-ink-100)]"
            >
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: pm.dot }} />
                <span className="v2-tight text-[11px] text-[var(--v2-ink-600)]">{pm.label}</span>
              </span>
            </button>
            <InlinePopover open={openField === "priority"} onClose={() => setOpenField(null)}>
              <InlinePriorityEditor taskId={sub.id} value={sub.priority} onReload={afterPatch} onClose={() => setOpenField(null)} />
            </InlinePopover>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenField((f) => (f === "assignee" ? null : "assignee"))}
              className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-[var(--v2-ink-100)]"
            >
              {member ? (
                <>
                  <MemberAvatar member={member} size={18} />
                  <span className="v2-tight text-[11px] text-[var(--v2-ink-600)]">{member.name.split(" ")[0]}</span>
                </>
              ) : (
                <span className="v2-tight text-[11px] text-[var(--v2-ink-400)]">—</span>
              )}
            </button>
            <InlinePopover open={openField === "assignee"} onClose={() => setOpenField(null)} className="min-w-[200px]">
              <InlineAssigneeEditor
                taskId={sub.id}
                value={sub.assignee_user_id}
                team={team}
                onReload={afterPatch}
                onClose={() => setOpenField(null)}
              />
            </InlinePopover>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenField((f) => (f === "planned" ? null : "planned"))}
              className="v2-tight rounded-md px-1 py-0.5 text-[11px] text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-100)]"
            >
              <V2Icons.cal className="mr-0.5 inline h-3 w-3" />
              {sub.planned_at ? "выполнение" : "без даты"}
            </button>
            <InlinePopover open={openField === "planned"} onClose={() => setOpenField(null)}>
              <InlinePlannedEditor taskId={sub.id} plannedAt={sub.planned_at} onReload={afterPatch} onClose={() => setOpenField(null)} />
            </InlinePopover>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenField((f) => (f === "deadline" ? null : "deadline"))}
              className="v2-tight rounded-md px-1 py-0.5 text-[11px] text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-100)]"
            >
              <V2Icons.clock className="mr-0.5 inline h-3 w-3" />
              дедлайн {sub.deadline_at ? "" : "—"}
            </button>
            <InlinePopover open={openField === "deadline"} onClose={() => setOpenField(null)}>
              <InlineDeadlineEditor taskId={sub.id} deadlineAt={sub.deadline_at} onReload={afterPatch} onClose={() => setOpenField(null)} />
            </InlinePopover>
          </div>
        </div>
      </div>
    </div>
  );
}
