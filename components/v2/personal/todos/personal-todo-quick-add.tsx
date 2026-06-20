"use client";

import { usePersonalTodo } from "@/components/v2/personal/todos/personal-todo-context";
import { V2Icons } from "@/components/v2/ui/icons";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  addDaysFromToday,
  parsePersonalQuickAdd,
  personalTodoTodayYmd,
} from "@/lib/v2/personal/todo-date";
import type { PersonalTodoRow } from "@/lib/v2/personal/todo-types";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type PersonalTodoQuickAddHandle = {
  focus: () => void;
};

type DateChip = "today" | "tomorrow" | "none";

export const PersonalTodoQuickAdd = forwardRef<
  PersonalTodoQuickAddHandle,
  {
    defaultProjectId?: string | null;
    onCreated?: (todo: PersonalTodoRow) => void;
    className?: string;
  }
>(function PersonalTodoQuickAdd({ defaultProjectId, onCreated, className = "" }, ref) {
  const { projects, inboxProjectId, refreshBootstrap, bumpList, registerQuickAdd } = usePersonalTodo();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [dateChip, setDateChip] = useState<DateChip | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveProjectId = projectId || defaultProjectId || inboxProjectId;

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  useEffect(() => {
    registerQuickAdd({ focus: () => inputRef.current?.focus() });
    return () => registerQuickAdd(null);
  }, [registerQuickAdd]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const raw = value.trim();
    if (!raw || saving) return;

    const parsed = parsePersonalQuickAdd(raw);
    if (!parsed.title) return;

    let due_date: string | null = parsed.due_date;
    let scheduled_date: string | null = parsed.scheduled_date;

    if (dateChip === "none") {
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
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetchJson<{ todo: PersonalTodoRow }>("/api/v2/personal/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: parsed.title,
          project_id: effectiveProjectId || null,
          priority: parsed.priority ?? undefined,
          due_date: dateChip === "none" ? null : due_date,
          scheduled_date: dateChip === "none" ? null : scheduled_date,
        }),
      });
      setValue("");
      setDateChip(null);
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
    <form
      onSubmit={(e) => void submit(e)}
      className={`sticky top-0 z-10 border-b border-[var(--v2-ink-100)] bg-white/95 px-6 py-3 backdrop-blur ${className}`}
    >
      <div className="v2-card flex flex-wrap items-center gap-2 px-3 py-2">
        <V2Icons.plus className="h-4 w-4 shrink-0 text-[var(--v2-ink-400)]" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Добавить задачу… (завтра, p1)"
          disabled={saving}
          className="v2-tight min-w-[180px] flex-1 bg-transparent text-[14px] text-[var(--v2-ink-900)] outline-none placeholder:text-[var(--v2-ink-400)]"
        />

        <select
          value={effectiveProjectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="v2-tight max-w-[160px] truncate rounded-lg border border-[var(--v2-ink-200)] bg-white px-2 py-1.5 text-[12px] text-[var(--v2-ink-700)] outline-none focus:border-[var(--v2-brand-400)]"
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
                    ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]"
                    : "text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-800)]"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <button
          type="submit"
          disabled={!value.trim() || saving}
          className="v2-tight rounded-lg bg-[var(--v2-ink-900)] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[var(--v2-ink-700)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "…" : "Добавить"}
        </button>
      </div>
      {error ? <p className="v2-tight mt-1.5 px-1 text-[12px] text-red-600">{error}</p> : null}
    </form>
  );
});
