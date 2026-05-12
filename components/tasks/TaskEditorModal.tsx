"use client";

import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import { parseExecutionDatesFromJson } from "@/lib/pm-subtasks-shared";
import type { PmSubtaskWithCard } from "@/lib/pm-subtasks";
import { IMPORTANCE_OPTIONS, type ImportanceKey } from "@/lib/statuses";

type TeamUser = { id: string; displayName: string; avatarUrl?: string | null };

type CardOption = { id: string; name: string };

export type TaskModalStatusKey = "not_started" | "in_progress" | "awaiting_approval" | "completed";

const TASK_STATUS_OPTIONS: { key: TaskModalStatusKey; label: string }[] = [
  { key: "not_started", label: "Не начато" },
  { key: "in_progress", label: "В работе" },
  { key: "awaiting_approval", label: "На согласовании" },
  { key: "completed", label: "Завершено" },
];

function deadlineInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function deadlineToApi(ymd: string): string | null {
  const t = ymd.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  return `${t}T12:00:00.000Z`;
}

type Props = {
  mode: "create" | "edit";
  /** Режим create: текущая подзадача не нужна. Режим edit: данные задачи. */
  subtask: PmSubtaskWithCard | null;
  cards: CardOption[];
  teamUsers: TeamUser[];
  canSave: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function TaskEditorModal({ mode, subtask, cards, teamUsers, canSave, onClose, onSaved }: Props) {
  const [cardId, setCardId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [deadlineYmd, setDeadlineYmd] = useState("");
  const [executionDates, setExecutionDates] = useState<string[]>([]);
  const [pendingExecYmd, setPendingExecYmd] = useState("");
  const [taskStatus, setTaskStatus] = useState<TaskModalStatusKey>("not_started");
  const [importance, setImportance] = useState<"" | ImportanceKey>("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cardName = useMemo(() => {
    if (!subtask) return "";
    return cards.find((c) => c.id === subtask.card_id)?.name ?? subtask.card_name;
  }, [subtask, cards]);

  useEffect(() => {
    setErr(null);
    if (mode === "edit" && subtask) {
      setCardId(subtask.card_id);
      setTitle(subtask.title);
      setDescription(subtask.description ?? "");
      setAssigneeId(subtask.assignee_user_id ?? "");
      setDeadlineYmd(deadlineInputValue(subtask.deadline_at));
      setExecutionDates(parseExecutionDatesFromJson(subtask.execution_dates_json));
      setPendingExecYmd("");
      setTaskStatus(subtask.completed_at ? "completed" : (subtask.work_status as TaskModalStatusKey) ?? "not_started");
      setImportance(subtask.importance ?? "");
    } else {
      setCardId(cards[0]?.id ?? "");
      setTitle("");
      setDescription("");
      setAssigneeId("");
      setDeadlineYmd("");
      setExecutionDates([]);
      setPendingExecYmd("");
      setTaskStatus("not_started");
      setImportance("");
    }
  }, [mode, subtask, cards]);

  async function handleSave() {
    if (!canSave) return;
    const t = title.trim();
    if (!t) {
      setErr("Укажите название задачи");
      return;
    }
    const cid = cardId.trim();
    if (!cid) {
      setErr("Выберите проект");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const deadlineAt = deadlineYmd.trim() ? deadlineToApi(deadlineYmd) : null;
      const imp = importance || null;

      if (mode === "create") {
        const r = await fetch(apiUrl(`/api/cards/${cid}/subtasks`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: t,
            description: description.trim() || null,
            assigneeUserId: assigneeId || null,
            deadlineAt,
            executionDates,
            importance: imp,
            workStatus: taskStatus === "completed" ? "not_started" : taskStatus,
          }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(typeof data.error === "string" ? data.error : "Не удалось создать");
        const created = data.subtask as { id?: string } | undefined;
        if (taskStatus === "completed" && created?.id) {
          const r2 = await fetch(apiUrl(`/api/cards/${cid}/subtasks/${created.id}`), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskStatus: "completed" }),
          });
          const d2 = await r2.json().catch(() => ({}));
          if (!r2.ok) throw new Error(typeof d2.error === "string" ? d2.error : "Не удалось отметить завершение");
        }
      } else if (subtask) {
        const r = await fetch(apiUrl(`/api/cards/${subtask.card_id}/subtasks/${subtask.id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: t,
            description: description.trim() || null,
            assigneeUserId: assigneeId || null,
            deadlineAt,
            executionDates,
            importance: imp,
            taskStatus,
          }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(typeof data.error === "string" ? data.error : "Не удалось сохранить");
      }
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  const disabledFields = !canSave || saving;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 sm:items-center" role="presentation" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-elevated)]"
        role="dialog"
        aria-modal
        aria-labelledby="task-editor-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <div>
            <h2 id="task-editor-title" className="text-base font-semibold text-[var(--text)]">
              {mode === "create" ? "Новая задача" : "Задача"}
            </h2>
            {mode === "edit" && subtask ? (
              <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                Проект: <span className="font-medium text-[var(--text)]">{cardName}</span>
              </p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]" aria-label="Закрыть">
            ✕
          </button>
        </div>

        <div className="max-h-[min(70vh,560px)] overflow-y-auto px-4 py-4 sm:px-5">
          {!canSave ? (
            <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
              Просмотр: изменять задачи могут пользователи с доступом к доске проектов.
            </p>
          ) : null}
          {err ? <p className="mb-3 text-sm font-medium text-[var(--danger)]">{err}</p> : null}

          <div className="space-y-4">
            {mode === "create" ? (
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Проект</span>
                <select className="tt-select mt-1 w-full py-2 text-sm" value={cardId} disabled={disabledFields} onChange={(e) => setCardId(e.target.value)}>
                  {cards.length === 0 ? (
                    <option value="">Нет проектов</option>
                  ) : (
                    cards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
            ) : null}

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Название</span>
              <input
                type="text"
                value={title}
                disabled={disabledFields}
                onChange={(e) => setTitle(e.target.value)}
                className="tt-input mt-1 w-full py-2 text-sm"
                placeholder="Название задачи"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Описание</span>
              <textarea
                value={description}
                disabled={disabledFields}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="tt-input mt-1 w-full resize-y py-2 text-sm"
                placeholder="Описание, детали, ссылки…"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Ответственный</span>
              <select className="tt-select mt-1 w-full py-2 text-sm" value={assigneeId} disabled={disabledFields} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Не назначен</option>
                {teamUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Дедлайн</span>
              <input type="date" className="tt-input mt-1 w-full py-2 text-sm" value={deadlineYmd} disabled={disabledFields} onChange={(e) => setDeadlineYmd(e.target.value)} />
            </label>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Даты выполнения</span>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {executionDates.map((d) => (
                  <button
                    key={d}
                    type="button"
                    disabled={disabledFields}
                    onClick={() => setExecutionDates((prev) => prev.filter((x) => x !== d))}
                    className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--danger-soft)] disabled:opacity-50"
                  >
                    {d} ×
                  </button>
                ))}
                <input
                  type="date"
                  className="tt-input max-w-[10rem] py-1 text-xs"
                  value={pendingExecYmd}
                  disabled={disabledFields}
                  onChange={(e) => setPendingExecYmd(e.target.value)}
                />
                <button
                  type="button"
                  disabled={disabledFields || !pendingExecYmd.trim()}
                  onClick={() => {
                    const ymd = pendingExecYmd.trim().slice(0, 10);
                    if (!ymd) return;
                    setExecutionDates((prev) => [...new Set([...prev, ymd])].sort());
                    setPendingExecYmd("");
                  }}
                  className="rounded-lg bg-[var(--primary)]/90 px-2 py-1 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-40"
                >
                  + дата
                </button>
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Статус задачи</span>
              <select className="tt-select mt-1 w-full py-2 text-sm" value={taskStatus} disabled={disabledFields} onChange={(e) => setTaskStatus(e.target.value as TaskModalStatusKey)}>
                {TASK_STATUS_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Приоритет</span>
              <select className="tt-select mt-1 w-full py-2 text-sm" value={importance} disabled={disabledFields} onChange={(e) => setImportance((e.target.value || "") as "" | ImportanceKey)}>
                <option value="">Без приоритета</option>
                {IMPORTANCE_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] px-4 py-3 sm:px-5">
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]">
            Закрыть
          </button>
          {canSave ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40"
            >
              {saving ? "Сохранение…" : mode === "create" ? "Создать" : "Сохранить"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
