"use client";

import { usePersonalTodo } from "@/components/v2/personal/todos/personal-todo-context";
import { PriorityFlagPicker } from "@/components/v2/tasks/task-field-pickers";
import { V2Icons } from "@/components/v2/ui/icons";
import { IconBtn, TaskCheckbox } from "@/components/v2/ui/primitives";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { PersonalTodoRow } from "@/lib/v2/personal/todo-types";
import type { V2TaskPriority } from "@/lib/v2/types";
import { useCallback, useEffect, useState } from "react";

type DetailPayload = {
  todo: PersonalTodoRow;
  subtasks: PersonalTodoRow[];
};

export function PersonalTodoDetailDrawer({
  todoId,
  open,
  onClose,
  onUpdated,
}: {
  todoId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { projects, refreshBootstrap } = usePersonalTodo();
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!todoId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<DetailPayload>(`/api/v2/personal/todos/${todoId}`);
      setDetail(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить задачу");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [todoId]);

  useEffect(() => {
    if (open && todoId) {
      void loadDetail();
      setDeleteConfirm(false);
      setSubtaskTitle("");
    } else if (!open) {
      setDetail(null);
    }
  }, [open, todoId, loadDetail]);

  async function patchTodo(patch: Partial<PersonalTodoRow>) {
    if (!todoId) return;
    try {
      const res = await fetchJson<{ todo: PersonalTodoRow }>(`/api/v2/personal/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      setDetail((prev) => (prev ? { ...prev, todo: res.todo } : prev));
      onUpdated();
      await refreshBootstrap();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    }
  }

  async function toggleComplete() {
    if (!todoId || !detail) return;
    const completed = !detail.todo.completed_at;
    try {
      const res = await fetchJson<{ todo: PersonalTodoRow }>(`/api/v2/personal/todos/${todoId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      setDetail((prev) => (prev ? { ...prev, todo: res.todo } : prev));
      onUpdated();
      await refreshBootstrap();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обновить статус");
    }
  }

  async function toggleSubtaskComplete(sub: PersonalTodoRow) {
    const completed = !sub.completed_at;
    try {
      await fetchJson(`/api/v2/personal/todos/${sub.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      await loadDetail();
      onUpdated();
      await refreshBootstrap();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обновить подзадачу");
    }
  }

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!todoId || !subtaskTitle.trim()) return;
    try {
      await fetchJson("/api/v2/personal/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: subtaskTitle.trim(), parent_id: todoId }),
      });
      setSubtaskTitle("");
      await loadDetail();
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить подзадачу");
    }
  }

  async function confirmDelete() {
    if (!todoId) return;
    setDeleting(true);
    try {
      await fetchJson(`/api/v2/personal/todos/${todoId}`, { method: "DELETE" });
      onUpdated();
      onClose();
      await refreshBootstrap();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить");
      setDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  if (!open) return null;

  const todo = detail?.todo;
  const completed = !!todo?.completed_at;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={onClose} aria-label="Закрыть" />

      <aside className="relative flex h-full w-full max-w-[480px] flex-col bg-white shadow-[var(--v2-shadow-cardHv)]">
        <header className="flex shrink-0 items-center gap-2 border-b border-[var(--v2-ink-100)] px-4 py-3">
          {todo ? (
            <TaskCheckbox checked={completed} onChange={() => void toggleComplete()} />
          ) : (
            <span className="h-5 w-5" />
          )}
          <div className="min-w-0 flex-1">
            <p className="v2-tight text-[12px] font-medium text-[var(--v2-ink-500)]">Задача</p>
          </div>
          <IconBtn onClick={onClose} title="Закрыть">
            <span className="text-[18px] leading-none text-[var(--v2-ink-500)]">×</span>
          </IconBtn>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="py-12 text-center text-[13px] text-[var(--v2-ink-500)]">Загрузка…</div>
          ) : !todo ? (
            <div className="py-12 text-center text-[13px] text-[var(--v2-ink-500)]">{error ?? "Задача не найдена"}</div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="v2-tight mb-1.5 block text-[12px] font-medium text-[var(--v2-ink-500)]">Название</label>
                <input
                  type="text"
                  value={todo.title}
                  onChange={(e) => setDetail((prev) => (prev ? { ...prev, todo: { ...prev.todo, title: e.target.value } } : prev))}
                  onBlur={() => void patchTodo({ title: todo.title })}
                  className="v2-tight w-full rounded-xl border border-[var(--v2-ink-200)] px-3 py-2 text-[15px] font-medium text-[var(--v2-ink-900)] outline-none focus:border-[var(--v2-brand-400)]"
                />
              </div>

              <div>
                <label className="v2-tight mb-1.5 block text-[12px] font-medium text-[var(--v2-ink-500)]">Описание</label>
                <textarea
                  value={todo.description ?? ""}
                  rows={4}
                  onChange={(e) =>
                    setDetail((prev) => (prev ? { ...prev, todo: { ...prev.todo, description: e.target.value || null } } : prev))
                  }
                  onBlur={() => void patchTodo({ description: todo.description })}
                  placeholder="Добавьте детали…"
                  className="v2-tight w-full resize-none rounded-xl border border-[var(--v2-ink-200)] px-3 py-2 text-[14px] text-[var(--v2-ink-800)] outline-none focus:border-[var(--v2-brand-400)] placeholder:text-[var(--v2-ink-400)]"
                />
              </div>

              <div>
                <label className="v2-tight mb-2 block text-[12px] font-medium text-[var(--v2-ink-500)]">Приоритет</label>
                <PriorityFlagPicker
                  value={todo.priority}
                  onChange={(priority: V2TaskPriority) => void patchTodo({ priority })}
                  compact
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="v2-tight mb-1.5 block text-[12px] font-medium text-[var(--v2-ink-500)]">Срок</label>
                  <input
                    type="date"
                    value={todo.due_date ?? ""}
                    onChange={(e) => {
                      const due_date = e.target.value || null;
                      const patch = due_date
                        ? { due_date, scheduled_date: due_date }
                        : { due_date: null, scheduled_date: null };
                      setDetail((prev) => (prev ? { ...prev, todo: { ...prev.todo, ...patch } } : prev));
                      void patchTodo(patch);
                    }}
                    className="v2-tight w-full rounded-xl border border-[var(--v2-ink-200)] px-3 py-2 text-[13px] text-[var(--v2-ink-800)] outline-none focus:border-[var(--v2-brand-400)]"
                  />
                </div>
                <div>
                  <label className="v2-tight mb-1.5 block text-[12px] font-medium text-[var(--v2-ink-500)]">Проект</label>
                  <select
                    value={todo.project_id ?? ""}
                    onChange={(e) => {
                      const project_id = e.target.value || null;
                      const project = projects.find((p) => p.id === project_id);
                      setDetail((prev) =>
                        prev
                          ? {
                              ...prev,
                              todo: {
                                ...prev.todo,
                                project_id,
                                project_name: project?.name ?? null,
                                project_color: project?.color ?? null,
                              },
                            }
                          : prev
                      );
                      void patchTodo({ project_id });
                    }}
                    className="v2-tight w-full rounded-xl border border-[var(--v2-ink-200)] bg-white px-3 py-2 text-[13px] text-[var(--v2-ink-800)] outline-none focus:border-[var(--v2-brand-400)]"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <h3 className="v2-tight mb-2 text-[13px] font-semibold text-[var(--v2-ink-900)]">Подзадачи</h3>
                <div className="divide-y divide-[var(--v2-ink-100)]/70 rounded-xl border border-[var(--v2-ink-100)]">
                  {(detail.subtasks ?? []).map((sub) => (
                    <div key={sub.id} className="flex items-start gap-2 px-3 py-2">
                      <TaskCheckbox
                        checked={!!sub.completed_at}
                        onChange={() => void toggleSubtaskComplete(sub)}
                      />
                      <span
                        className={`v2-tight flex-1 text-[13px] ${
                          sub.completed_at ? "text-[var(--v2-ink-400)] line-through" : "text-[var(--v2-ink-800)]"
                        }`}
                      >
                        {sub.title}
                      </span>
                    </div>
                  ))}
                  <form onSubmit={(e) => void addSubtask(e)} className="flex items-center gap-2 px-3 py-2">
                    <V2Icons.plus className="h-4 w-4 shrink-0 text-[var(--v2-ink-400)]" />
                    <input
                      type="text"
                      value={subtaskTitle}
                      onChange={(e) => setSubtaskTitle(e.target.value)}
                      placeholder="Добавить подзадачу…"
                      className="v2-tight min-w-0 flex-1 bg-transparent text-[13px] text-[var(--v2-ink-800)] outline-none placeholder:text-[var(--v2-ink-400)]"
                    />
                  </form>
                </div>
              </div>

              {error ? <p className="v2-tight text-[12px] text-red-600">{error}</p> : null}

              <div className="border-t border-[var(--v2-ink-100)] pt-4">
                {deleteConfirm ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="v2-tight text-[13px] text-[var(--v2-ink-600)]">Удалить задачу?</span>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => void confirmDelete()}
                      className="v2-tight rounded-lg bg-red-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting ? "…" : "Удалить"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(false)}
                      className="v2-tight rounded-lg px-3 py-1.5 text-[12px] font-medium text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)]"
                    >
                      Отмена
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(true)}
                    className="v2-tight inline-flex items-center gap-1.5 text-[13px] font-medium text-red-600 hover:underline"
                  >
                    <V2Icons.trash className="h-4 w-4" />
                    Удалить задачу
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
