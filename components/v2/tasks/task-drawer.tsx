"use client";

import { apiUrl } from "@/lib/api-url";
import { fmtDuration, fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/v2/format";
import type { V2TaskPriority, V2TaskRow, V2TaskWithMeta } from "@/lib/v2/types";
import { ProjectChip, TimerButton } from "@/components/v2/ui/primitives";
import { PRIORITY_META, V2Icons } from "@/components/v2/ui/icons";
import { useEffect, useState } from "react";

type Detail = {
  task: V2TaskWithMeta;
  comments: Array<{ id: string; author_name: string; body: string; created_at: string }>;
  subtasks: V2TaskRow[];
};

export function TaskDrawer({
  taskId,
  open,
  onClose,
  onUpdated,
  members,
  projects,
  runningTaskId,
  onToggleTimer,
}: {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  members: Array<{ user_id: string; display_name: string }>;
  projects: Array<{ id: string; name: string }>;
  runningTaskId: string | null;
  onToggleTimer: (id: string) => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [comment, setComment] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !taskId) {
      setDetail(null);
      return;
    }
    fetch(apiUrl(`/api/v2/tasks/${taskId}/detail`), { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setDetail(d as Detail))
      .catch(() => setDetail(null));
  }, [open, taskId]);

  if (!open || !taskId) return null;

  const t = detail?.task;

  async function patch(fields: Record<string, unknown>) {
    if (!taskId) return;
    setSaving(true);
    await fetch(apiUrl(`/api/v2/tasks/${taskId}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
      credentials: "include",
    });
    setSaving(false);
    onUpdated();
    const res = await fetch(apiUrl(`/api/v2/tasks/${taskId}/detail`), { credentials: "include" });
    setDetail((await res.json()) as Detail);
  }

  async function sendComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim() || !taskId) return;
    await fetch(apiUrl(`/api/v2/tasks/${taskId}/comments`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment }),
      credentials: "include",
    });
    setComment("");
    onUpdated();
    const res = await fetch(apiUrl(`/api/v2/tasks/${taskId}/detail`), { credentials: "include" });
    setDetail((await res.json()) as Detail);
  }

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!subtaskTitle.trim() || !taskId) return;
    await fetch(apiUrl(`/api/v2/tasks/${taskId}/subtasks`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: subtaskTitle }),
      credentials: "include",
    });
    setSubtaskTitle("");
    onUpdated();
    const res = await fetch(apiUrl(`/api/v2/tasks/${taskId}/detail`), { credentials: "include" });
    setDetail((await res.json()) as Detail);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/20" onClick={onClose} aria-label="Закрыть" />
      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold tracking-tight">{t?.title ?? "Загрузка…"}</h2>
          <button type="button" onClick={onClose} className="text-[var(--v2-ink-500)] hover:text-[var(--v2-ink-900)]">
            ✕
          </button>
        </div>

        {t && (
          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            <div className="flex items-center gap-3">
              <TimerButton running={runningTaskId === t.id} onClick={() => onToggleTimer(t.id)} />
              <span className="text-sm tabular-nums text-[var(--v2-ink-600)]">
                {fmtDuration(t.logged_seconds)} / {t.estimate_seconds ? fmtDuration(t.estimate_seconds) : "—"}
              </span>
            </div>

            <label className="block text-sm">
              <span className="text-[var(--v2-ink-500)]">Название</span>
              <input
                className="v2-input mt-1"
                defaultValue={t.title}
                onBlur={(e) => e.target.value !== t.title && patch({ title: e.target.value })}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="text-[var(--v2-ink-500)]">Проект</span>
                <select
                  className="v2-input mt-1"
                  value={t.project_id ?? ""}
                  onChange={(e) => patch({ projectId: e.target.value || null })}
                >
                  <option value="">—</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-[var(--v2-ink-500)]">Ответственный</span>
                <select
                  className="v2-input mt-1"
                  value={t.assignee_user_id ?? ""}
                  onChange={(e) => patch({ assigneeUserId: e.target.value || null })}
                >
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.display_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="text-[var(--v2-ink-500)]">Дедлайн</span>
                <input
                  type="datetime-local"
                  className="v2-input mt-1"
                  defaultValue={toDatetimeLocalValue(t.deadline_at)}
                  onBlur={(e) => patch({ deadlineAt: fromDatetimeLocalValue(e.target.value) })}
                />
              </label>
              <label className="text-sm">
                <span className="text-[var(--v2-ink-500)]">Оценка (ч)</span>
                <input
                  type="number"
                  step="0.5"
                  className="v2-input mt-1"
                  defaultValue={t.estimate_seconds ? t.estimate_seconds / 3600 : ""}
                  onBlur={(e) => patch({ estimateHours: Number(e.target.value) || null })}
                />
              </label>
            </div>

            <label className="text-sm">
              <span className="text-[var(--v2-ink-500)]">Приоритет</span>
              <select
                className="v2-input mt-1"
                value={t.priority}
                onChange={(e) => patch({ priority: e.target.value as V2TaskPriority })}
              >
                {Object.entries(PRIORITY_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Подзадачи</h3>
              <ul className="mb-2 space-y-1">
                {(detail?.subtasks ?? []).map((s) => (
                  <li key={s.id} className="text-sm text-[var(--v2-ink-700)]">
                    · {s.title}
                  </li>
                ))}
              </ul>
              <form onSubmit={addSubtask} className="flex gap-2">
                <input className="v2-input" placeholder="Новая подзадача" value={subtaskTitle} onChange={(e) => setSubtaskTitle(e.target.value)} />
                <button type="submit" className="v2-btn-primary shrink-0">
                  +
                </button>
              </form>
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold">
                <V2Icons.chat className="h-4 w-4" /> Комментарии
              </h3>
              <ul className="mb-3 max-h-40 space-y-2 overflow-y-auto">
                {(detail?.comments ?? []).map((c) => (
                  <li key={c.id} className="rounded-lg bg-[var(--v2-ink-50)] px-3 py-2 text-sm">
                    <div className="font-medium text-[var(--v2-ink-800)]">{c.author_name}</div>
                    <div className="text-[var(--v2-ink-600)]">{c.body}</div>
                  </li>
                ))}
              </ul>
              <form onSubmit={sendComment} className="flex gap-2">
                <input className="v2-input" placeholder="Написать…" value={comment} onChange={(e) => setComment(e.target.value)} />
                <button type="submit" className="v2-btn-primary shrink-0" disabled={saving}>
                  →
                </button>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
