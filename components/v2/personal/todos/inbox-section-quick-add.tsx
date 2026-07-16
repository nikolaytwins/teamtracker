"use client";

import { usePersonalTodo } from "@/components/v2/personal/todos/personal-todo-context";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { InboxTodoSectionId } from "@/lib/v2/personal/todo-inbox-groups";
import { inboxSectionPriority } from "@/lib/v2/personal/todo-inbox-groups";
import type { PersonalTodoRow } from "@/lib/v2/personal/todo-types";
import type { V2TaskPriority } from "@/lib/v2/types";
import { useEffect, useRef, useState } from "react";

export function InboxSectionQuickAdd({
  sectionId,
  open,
  onClose,
  onCreated,
}: {
  sectionId: InboxTodoSectionId;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { inboxProjectId, bumpList, refreshBootstrap } = usePersonalTodo();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const priority = inboxSectionPriority(sectionId);

  useEffect(() => {
    if (open) {
      setValue("");
      setError(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, sectionId]);

  if (!open) return null;

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const title = value.trim();
    if (!title || saving) return;
    setSaving(true);
    setError(null);
    try {
      await fetchJson<{ todo: PersonalTodoRow }>("/api/v2/personal/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          project_id: inboxProjectId || null,
          priority: priority as V2TaskPriority | null,
          due_date: null,
          scheduled_date: null,
        }),
      });
      setValue("");
      onClose();
      bumpList();
      await refreshBootstrap();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать задачу");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="mb-3 overflow-hidden rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)]/50 p-2.5"
    >
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
          placeholder="Название задачи…"
          disabled={saving}
          className="v2-tight min-w-0 flex-1 rounded-lg border border-[var(--v2-ink-200)] bg-white px-3 py-2 text-[14px] text-[var(--v2-ink-900)] outline-none focus:border-[var(--v2-brand-400)] focus:ring-2 focus:ring-[var(--v2-brand-100)]"
        />
        <button
          type="submit"
          disabled={!value.trim() || saving}
          className="v2-tight shrink-0 rounded-lg bg-[var(--v2-ink-900)] px-3 py-2 text-[12.5px] font-medium text-white disabled:opacity-40"
        >
          {saving ? "…" : "Добавить"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--v2-ink-400)] hover:bg-white hover:text-[var(--v2-ink-700)]"
          title="Закрыть"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      </div>
      {error ? <p className="v2-tight mt-1.5 text-[12px] text-red-600">{error}</p> : null}
    </form>
  );
}
