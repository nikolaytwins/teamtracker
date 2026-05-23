"use client";

import { V2FileUploadDropzone } from "@/components/v2/ui/file-upload-dropzone";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  fmtDuration,
  fromDateInputValue,
  fromDatetimeLocalValue,
  toDateInputValue,
  toDatetimeLocalValue,
} from "@/lib/v2/format";
import type { V2TaskLinkRow, V2TaskFileRow } from "@/lib/v2/tasks/task-detail";
import type { V2TaskRow, V2TaskWithMeta } from "@/lib/v2/types";
import { AssigneeAvatarPicker, PriorityFlagPicker } from "@/components/v2/tasks/task-field-pickers";
import { TaskCardChat, type TaskComment } from "@/components/v2/tasks/task-card-chat";
import { PRIORITY_META, V2Icons } from "@/components/v2/ui/icons";
import { PriorityDot, ProjectChip, TaskCheckbox, TimerButton } from "@/components/v2/ui/primitives";
import { useCallback, useEffect, useMemo, useState } from "react";

type Detail = {
  task: V2TaskWithMeta;
  comments: TaskComment[];
  links: V2TaskLinkRow[];
  files: V2TaskFileRow[];
  subtasks: V2TaskRow[];
};

type ProjectOption = {
  id: string;
  name: string;
  short_name?: string | null;
  color_bg?: string | null;
  color_tint?: string | null;
  color_ink?: string | null;
};

function linkInitial(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "").slice(0, 1).toUpperCase();
  } catch {
    return "L";
  }
}

export function TaskCardModal({
  taskId,
  open,
  onClose,
  onUpdated,
  members,
  projects,
  runningTaskId,
  onToggleTimer,
  lockedProjectId,
  lockedProject,
}: {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  members: Array<{ user_id: string; display_name: string; role?: string }>;
  projects: ProjectOption[];
  runningTaskId: string | null;
  onToggleTimer: (id: string) => void;
  lockedProjectId?: string | null;
  lockedProject?: {
    name: string;
    shortName?: string | null;
    colorBg?: string | null;
    colorTint?: string | null;
    colorInk?: string | null;
  };
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [replyTo, setReplyTo] = useState<TaskComment | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const data = await fetchJson<Detail>(`/api/v2/tasks/${taskId}/detail`);
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (!open || !taskId) {
      setDetail(null);
      setReplyTo(null);
      setCommentDraft("");
      return;
    }
    void loadDetail();
  }, [open, taskId, loadDetail]);

  const assigneeMembers = useMemo(() => members.filter((m) => m.role !== "client"), [members]);

  const projectOptions = useMemo(() => {
    const map = new Map(projects.map((p) => [p.id, p]));
    if (lockedProjectId && lockedProject && !map.has(lockedProjectId)) {
      map.set(lockedProjectId, {
        id: lockedProjectId,
        name: lockedProject.name,
        short_name: lockedProject.shortName,
        color_bg: lockedProject.colorBg,
        color_tint: lockedProject.colorTint,
        color_ink: lockedProject.colorInk,
      });
    }
    const t = detail?.task;
    if (t?.project_id && t.project_name && !map.has(t.project_id)) {
      map.set(t.project_id, {
        id: t.project_id,
        name: t.project_name,
        short_name: t.project_short_name,
        color_bg: t.project_color_bg,
        color_tint: t.project_color_tint,
        color_ink: t.project_color_ink,
      });
    }
    return [...map.values()];
  }, [projects, lockedProjectId, lockedProject, detail?.task]);

  if (!open || !taskId) return null;

  const t = detail?.task;
  const completed = !!t?.completed_at;
  const lockedProjectOption =
    lockedProjectId && projectOptions.find((p) => p.id === lockedProjectId);

  async function patch(fields: Record<string, unknown>) {
    if (!taskId) return;
    setSaving(true);
    try {
      await fetchJson(`/api/v2/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      onUpdated();
      await loadDetail();
    } finally {
      setSaving(false);
    }
  }

  async function toggleComplete() {
    if (!taskId || !t) return;
    setSaving(true);
    try {
      await fetchJson(`/api/v2/tasks/${taskId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", completed: !completed }),
      });
      onUpdated();
      await loadDetail();
    } finally {
      setSaving(false);
    }
  }

  async function toggleSubtaskComplete(sub: V2TaskRow) {
    const done = !!sub.completed_at;
    await fetchJson(`/api/v2/tasks/${sub.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", completed: !done }),
    });
    onUpdated();
    await loadDetail();
  }

  async function sendComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentDraft.trim() || !taskId) return;
    setSaving(true);
    try {
      await fetchJson(`/api/v2/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: commentDraft.trim(),
          parentCommentId: replyTo?.id ?? null,
        }),
      });
      setCommentDraft("");
      setReplyTo(null);
      onUpdated();
      await loadDetail();
    } finally {
      setSaving(false);
    }
  }

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!subtaskTitle.trim() || !taskId) return;
    setSaving(true);
    try {
      await fetchJson(`/api/v2/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: subtaskTitle.trim() }),
      });
      setSubtaskTitle("");
      onUpdated();
      await loadDetail();
    } finally {
      setSaving(false);
    }
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkUrl.trim() || !taskId) return;
    setSaving(true);
    try {
      await fetchJson(`/api/v2/tasks/${taskId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkUrl.trim(), title: linkTitle.trim() || undefined }),
      });
      setLinkUrl("");
      setLinkTitle("");
      await loadDetail();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button type="button" className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={onClose} aria-label="Закрыть" />

      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-[var(--v2-shadow-pop)]"
      >
        {/* Header */}
        <div className="relative border-b border-[var(--v2-ink-100)] px-6 py-5">
          <div className="v2-dotgrid pointer-events-none absolute inset-0 opacity-50" />
          <div className="relative flex items-start gap-3">
            {t ? (
              <TaskCheckbox checked={completed} onChange={() => void toggleComplete()} />
            ) : (
              <span className="h-5 w-5" />
            )}
            <div className="min-w-0 flex-1">
              {t ? (
                <>
                  <input
                    className="v2-tight w-full border-0 bg-transparent text-[22px] font-semibold leading-tight text-[var(--v2-ink-900)] outline-none placeholder:text-[var(--v2-ink-400)]"
                    defaultValue={t.title}
                    onBlur={(e) => e.target.value !== t.title && void patch({ title: e.target.value })}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {lockedProjectId && lockedProjectOption ? (
                      <ProjectChip
                        name={lockedProjectOption.name}
                        short={lockedProjectOption.short_name}
                        bg={lockedProjectOption.color_bg}
                        tint={lockedProjectOption.color_tint}
                        ink={lockedProjectOption.color_ink}
                      />
                    ) : t.project_name ? (
                      <ProjectChip
                        name={t.project_name}
                        short={t.project_short_name}
                        bg={t.project_color_bg}
                        tint={t.project_color_tint}
                        ink={t.project_color_ink}
                      />
                    ) : null}
                    <PriorityDot priority={t.priority} />
                    {t.assignee_name ? (
                      <span className="v2-tight text-[12px] text-[var(--v2-ink-600)]">{t.assignee_name}</span>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-[var(--v2-ink-500)]">{loading ? "Загрузка…" : "Задача не найдена"}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {t ? (
                <>
                  <TimerButton running={runningTaskId === t.id} onClick={() => onToggleTimer(t.id)} />
                  <span className="v2-tnum hidden text-[12px] text-[var(--v2-ink-500)] sm:inline">
                    {fmtDuration(t.logged_seconds)}
                    {t.estimate_seconds ? ` / ${fmtDuration(t.estimate_seconds)}` : ""}
                  </span>
                </>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-100)]"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {t && detail ? (
          <>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
              {/* Main column */}
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <section className="mb-6">
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">
                    Описание
                  </h4>
                  <textarea
                    className="v2-input min-h-[100px] w-full resize-y text-[13.5px] leading-relaxed"
                    placeholder="Добавьте описание задачи…"
                    defaultValue={t.description ?? ""}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val !== (t.description ?? "")) void patch({ description: val || null });
                    }}
                  />
                </section>

                <section className="mb-6">
                  <h4 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">
                    <V2Icons.tasks className="h-3.5 w-3.5" />
                    Подзадачи
                    <span className="v2-tnum font-normal normal-case tracking-normal text-[var(--v2-ink-400)]">
                      {detail.subtasks.filter((s) => s.completed_at).length}/{detail.subtasks.length}
                    </span>
                  </h4>
                  <div className="space-y-1 rounded-xl border border-[var(--v2-ink-100)] p-2">
                    {detail.subtasks.length === 0 ? (
                      <p className="px-2 py-3 text-[13px] text-[var(--v2-ink-400)]">Нет подзадач</p>
                    ) : (
                      detail.subtasks.map((s) => (
                        <div key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--v2-ink-50)]">
                          <TaskCheckbox
                            checked={!!s.completed_at}
                            onChange={() => void toggleSubtaskComplete(s)}
                          />
                          <span
                            className={`v2-tight flex-1 text-[13px] ${s.completed_at ? "text-[var(--v2-ink-400)] line-through" : "text-[var(--v2-ink-800)]"}`}
                          >
                            {s.title}
                          </span>
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: PRIORITY_META[s.priority].dot }}
                          />
                        </div>
                      ))
                    )}
                    <form onSubmit={addSubtask} className="mt-1 flex gap-2 border-t border-[var(--v2-ink-100)] pt-2">
                      <input
                        className="v2-input flex-1 text-[13px]"
                        placeholder="Новая подзадача…"
                        value={subtaskTitle}
                        onChange={(e) => setSubtaskTitle(e.target.value)}
                      />
                      <button type="submit" disabled={!subtaskTitle.trim()} className="v2-btn-primary shrink-0 px-3 disabled:opacity-40">
                        <V2Icons.plus className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </section>

                <section className="mb-6">
                  <h4 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">
                    <V2Icons.link className="h-3.5 w-3.5" />
                    Ссылки
                  </h4>
                  <div className="rounded-xl border border-[var(--v2-ink-100)]">
                    {detail.links.length === 0 ? (
                      <p className="px-4 py-3 text-[13px] text-[var(--v2-ink-400)]">Нет ссылок</p>
                    ) : (
                      detail.links.map((l) => (
                        <a
                          key={l.id}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 border-b border-[var(--v2-ink-100)] px-4 py-3 last:border-0 hover:bg-[var(--v2-ink-50)]"
                        >
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--v2-brand-50)] text-[12px] font-bold text-[var(--v2-brand-700)]">
                            {linkInitial(l.url)}
                          </span>
                          <span className="v2-tight min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--v2-ink-900)]">
                            {l.title || l.url}
                          </span>
                          <V2Icons.arrowExt className="h-4 w-4 shrink-0 text-[var(--v2-ink-400)]" />
                        </a>
                      ))
                    )}
                    <form onSubmit={addLink} className="flex flex-wrap gap-2 border-t border-[var(--v2-ink-100)] p-3">
                      <input className="v2-input min-w-[140px] flex-1 text-[13px]" placeholder="URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
                      <input className="v2-input min-w-[100px] flex-1 text-[13px]" placeholder="Название" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} />
                      <button type="submit" disabled={!linkUrl.trim()} className="v2-btn-primary shrink-0 px-3 disabled:opacity-40">
                        Добавить
                      </button>
                    </form>
                  </div>
                </section>

                <section>
                  <h4 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">
                    <V2Icons.folder className="h-3.5 w-3.5" />
                    Файлы
                  </h4>
                  <div className="rounded-xl border border-[var(--v2-ink-100)]">
                    {detail.files.length === 0 ? (
                      <p className="px-4 py-3 text-[13px] text-[var(--v2-ink-400)]">Нет файлов</p>
                    ) : (
                      detail.files.map((f) => (
                        <a
                          key={f.id}
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 border-b border-[var(--v2-ink-100)] px-4 py-3 last:border-0 hover:bg-[var(--v2-ink-50)]"
                        >
                          <span className="inline-flex h-9 w-8 items-center justify-center rounded-md bg-[var(--v2-ink-100)] text-[9px] font-bold uppercase text-[var(--v2-ink-600)]">
                            {(f.kind ?? f.name.split(".").pop() ?? "file").slice(0, 3)}
                          </span>
                          <span className="v2-tight min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--v2-ink-900)]">
                            {f.name}
                          </span>
                          <V2Icons.download className="h-4 w-4 shrink-0 text-[var(--v2-ink-400)]" />
                        </a>
                      ))
                    )}
                    {taskId ? (
                      <div className="border-t border-[var(--v2-ink-100)] p-3">
                        <V2FileUploadDropzone
                          compact
                          uploadPath={`/api/v2/tasks/${taskId}/files`}
                          onUploaded={loadDetail}
                        />
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>

              {/* Sidebar */}
              <aside className="w-full shrink-0 border-t border-[var(--v2-ink-100)] bg-[var(--v2-ink-50)]/30 px-6 py-5 lg:w-[280px] lg:border-l lg:border-t-0">
                <div className="space-y-5">
                  {!lockedProjectId && (
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">Проект</span>
                      <select
                        className="v2-input mt-1.5 w-full text-[13px]"
                        value={t.project_id ?? ""}
                        onChange={(e) => void patch({ projectId: e.target.value || null })}
                      >
                        <option value="">—</option>
                        {projectOptions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">Ответственный</span>
                    <div className="mt-2">
                      <AssigneeAvatarPicker
                        members={assigneeMembers}
                        value={t.assignee_user_id}
                        onChange={(userId) => {
                          if (userId !== t.assignee_user_id) void patch({ assigneeUserId: userId });
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <label className="text-[12px]">
                      <span className="text-[var(--v2-ink-500)]">Дата выполнения</span>
                      <input
                        type="date"
                        className="v2-input mt-1 w-full"
                        defaultValue={toDateInputValue(t.planned_at)}
                        onBlur={(e) => {
                          const next = fromDateInputValue(e.target.value);
                          const cur = t.planned_at ? toDateInputValue(t.planned_at) : "";
                          if ((next && toDateInputValue(next) !== cur) || (!next && cur)) void patch({ plannedAt: next });
                        }}
                      />
                    </label>
                    <label className="text-[12px]">
                      <span className="text-[var(--v2-ink-500)]">Дедлайн</span>
                      <input
                        type="datetime-local"
                        className="v2-input mt-1 w-full"
                        defaultValue={toDatetimeLocalValue(t.deadline_at)}
                        onBlur={(e) => void patch({ deadlineAt: fromDatetimeLocalValue(e.target.value) })}
                      />
                    </label>
                    <label className="text-[12px]">
                      <span className="text-[var(--v2-ink-500)]">Оценка (ч)</span>
                      <input
                        type="number"
                        step="0.5"
                        className="v2-input mt-1 w-full"
                        defaultValue={t.estimate_seconds ? t.estimate_seconds / 3600 : ""}
                        onBlur={(e) => void patch({ estimateHours: Number(e.target.value) || null })}
                      />
                    </label>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">Приоритет</span>
                    <div className="mt-2">
                      <PriorityFlagPicker
                        value={t.priority}
                        onChange={(priority) => {
                          if (priority !== t.priority) void patch({ priority });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </aside>
            </div>

            <TaskCardChat
              comments={detail.comments}
              draft={commentDraft}
              onDraftChange={setCommentDraft}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              onReply={setReplyTo}
              onSubmit={sendComment}
              saving={saving}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
