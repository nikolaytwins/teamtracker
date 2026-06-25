"use client";

import { usePersonalTodo } from "@/components/v2/personal/todos/personal-todo-context";
import { PRIORITY_META, V2Icons } from "@/components/v2/ui/icons";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  addDaysFromToday,
  parsePersonalQuickAdd,
  personalTodoTodayYmd,
} from "@/lib/v2/personal/todo-date";
import type { PersonalTodoRow } from "@/lib/v2/personal/todo-types";
import type { PersonalTodoView } from "@/lib/v2/personal/todo-types";
import type { V2TaskPriority } from "@/lib/v2/types";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type PersonalTodoQuickAddHandle = {
  focus: () => void;
};

type DateChip = "today" | "tomorrow" | "none";

const PRIORITIES: V2TaskPriority[] = ["urgent", "high", "medium", "low"];

export const PersonalTodoQuickAdd = forwardRef<
  PersonalTodoQuickAddHandle,
  {
    defaultProjectId?: string | null;
    view?: PersonalTodoView;
    onCreated?: (todo: PersonalTodoRow) => void;
    className?: string;
  }
>(function PersonalTodoQuickAdd({ defaultProjectId, view, onCreated, className = "" }, ref) {
  const {
    projects,
    inboxProjectId,
    refreshBootstrap,
    bumpList,
    registerQuickAdd,
    parentCandidates,
    subtaskParentId,
    setSubtaskParentId,
  } = usePersonalTodo();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [dateChip, setDateChip] = useState<DateChip | null>(view === "today" ? "today" : null);
  const [priority, setPriority] = useState<V2TaskPriority | null>(null);
  const [localParentId, setLocalParentId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveProjectId = projectId || defaultProjectId || inboxProjectId;
  const effectiveParentId = subtaskParentId || localParentId || null;
  const isSubtask = Boolean(effectiveParentId);
  const parentTitle = parentCandidates.find((p) => p.id === effectiveParentId)?.title;

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  useEffect(() => {
    registerQuickAdd({ focus: () => inputRef.current?.focus() });
    return () => registerQuickAdd(null);
  }, [registerQuickAdd]);

  useEffect(() => {
    if (view === "today" && dateChip === null) setDateChip("today");
  }, [view, dateChip]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const raw = value.trim();
    if (!raw || saving) return;

    const parsed = parsePersonalQuickAdd(raw);
    if (!parsed.title) return;

    const resolvedPriority = parsed.priority ?? priority ?? null;

    let due_date: string | null = parsed.due_date;
    let scheduled_date: string | null = parsed.scheduled_date;

    if (isSubtask) {
      due_date = null;
      scheduled_date = null;
    } else if (dateChip === "none") {
      due_date = null;
      scheduled_date = null;
    } else if (!due_date && !scheduled_date && dateChip) {
      if (dateChip === "today") {
        due_date = personalTodoTodayYmd();
        scheduled_date = due_date;
      } else if (dateChip === "tomorrow") {
        due_date = addDaysFromToday(1);
        scheduled_date = due_date;
      }
    } else if (view === "today" && !due_date && !scheduled_date && dateChip === "today") {
      due_date = personalTodoTodayYmd();
      scheduled_date = due_date;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetchJson<{ todo: PersonalTodoRow }>("/api/v2/personal/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: parsed.title,
          project_id: isSubtask ? null : effectiveProjectId || null,
          parent_id: effectiveParentId,
          priority: resolvedPriority,
          due_date: isSubtask ? null : dateChip === "none" ? null : due_date,
          scheduled_date: isSubtask ? null : dateChip === "none" ? null : scheduled_date,
        }),
      });
      setValue("");
      setDateChip(view === "today" ? "today" : null);
      setPriority(null);
      setLocalParentId("");
      setSubtaskParentId(null);
      onCreated?.(res.todo);
      bumpList();
      await refreshBootstrap();
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать задачу");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className={`px-6 pb-5 ${className}`}>
      {isSubtask && parentTitle ? (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--v2-brand-200)] bg-[var(--v2-brand-50)]/80 px-3 py-2">
          <span className="v2-tight text-[12px] text-[var(--v2-brand-800)]">
            Подзадача к: <strong>{parentTitle}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              setSubtaskParentId(null);
              setLocalParentId("");
            }}
            className="v2-tight ml-auto text-[11px] font-medium text-[var(--v2-brand-700)] underline"
          >
            Отменить
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border-2 border-[var(--v2-brand-200)] bg-gradient-to-b from-[var(--v2-brand-50)]/40 to-white p-3 shadow-[var(--v2-shadow-soft)] ring-1 ring-[var(--v2-brand-100)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--v2-ink-900)] text-white">
            <V2Icons.plus className="h-4 w-4" />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={isSubtask ? "Текст подзадачи…" : "Новая задача… (завтра, p1)"}
            disabled={saving}
            className="v2-tight min-w-[200px] flex-1 bg-transparent text-[15px] font-medium text-[var(--v2-ink-900)] outline-none placeholder:font-normal placeholder:text-[var(--v2-ink-400)]"
          />
          <button
            type="submit"
            disabled={!value.trim() || saving}
            className="v2-tight shrink-0 rounded-xl bg-[var(--v2-ink-900)] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[var(--v2-ink-700)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "…" : isSubtask ? "Добавить подзадачу" : "Добавить"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--v2-ink-100)]/80 pt-3">
          <div className="flex flex-wrap items-center gap-1">
            <span className="v2-tight mr-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--v2-ink-400)]">
              Приоритет
            </span>
            {PRIORITIES.map((p) => {
              const m = PRIORITY_META[p];
              const active = priority === p;
              return (
                <button
                  key={p}
                  type="button"
                  title={m.label}
                  onClick={() => setPriority(active ? null : p)}
                  className={`v2-tight inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition ${
                    active
                      ? "border-[var(--v2-ink-300)] bg-white shadow-sm"
                      : "border-transparent text-[var(--v2-ink-500)] hover:bg-white/80"
                  }`}
                >
                  <V2Icons.flag className="h-3.5 w-3.5" style={{ color: m.dot }} />
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              );
            })}
          </div>

          {!isSubtask ? (
            <>
              <select
                value={effectiveProjectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="v2-tight max-w-[140px] truncate rounded-lg border border-[var(--v2-ink-200)] bg-white px-2 py-1.5 text-[12px] text-[var(--v2-ink-700)] outline-none focus:border-[var(--v2-brand-400)]"
                aria-label="Проект"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1">
                {(
                  [
                    { key: "today" as const, label: "Сегодня" },
                    { key: "tomorrow" as const, label: "Завтра" },
                    { key: "none" as const, label: "Без даты" },
                  ] as const
                ).map((chip) => {
                  const active = dateChip === chip.key;
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setDateChip(active ? null : chip.key)}
                      className={`v2-tight rounded-lg px-2 py-1 text-[11.5px] font-medium transition ${
                        active
                          ? "bg-[var(--v2-brand-100)] text-[var(--v2-brand-800)]"
                          : "text-[var(--v2-ink-500)] hover:bg-white hover:text-[var(--v2-ink-800)]"
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {!isSubtask && parentCandidates.length > 0 ? (
            <select
              value={localParentId}
              onChange={(e) => {
                setLocalParentId(e.target.value);
                setSubtaskParentId(e.target.value || null);
              }}
              className="v2-tight max-w-[180px] truncate rounded-lg border border-[var(--v2-ink-200)] bg-white px-2 py-1.5 text-[12px] text-[var(--v2-ink-700)] outline-none focus:border-[var(--v2-brand-400)]"
              aria-label="Подзадача к"
            >
              <option value="">Не подзадача</option>
              {parentCandidates.map((p) => (
                <option key={p.id} value={p.id}>
                  ↳ {p.title}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>
      {error ? <p className="v2-tight mt-2 text-[12px] text-red-600">{error}</p> : null}
    </form>
  );
});
