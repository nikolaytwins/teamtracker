"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import { gradientForUser, initialsFromName } from "@/lib/v2/projects/portfolio-utils";
import type { PortfolioMember } from "@/lib/v2/projects/portfolio-types";
import { fromDateInputValue, toDateInputValue } from "@/lib/v2/format";
import { PRIORITY_META, V2Icons } from "@/components/v2/ui/icons";
import type { V2TaskPriority } from "@/lib/v2/types";
import { useEffect, useRef, useState, type ReactNode } from "react";

export async function patchTask(
  taskId: string,
  body: Record<string, unknown>,
  onReload?: () => Promise<void>
) {
  await fetchJson(`/api/v2/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await onReload?.();
}

export function InlinePopover({
  open,
  onClose,
  children,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={`absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-[var(--v2-ink-200)] bg-white p-2 shadow-[var(--v2-shadow-pop)] ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function InlinePriorityEditor({
  taskId,
  value,
  onReload,
  onClose,
}: {
  taskId: string;
  value: V2TaskPriority;
  onReload?: () => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function pick(priority: V2TaskPriority) {
    if (priority === value || saving) return;
    setSaving(true);
    try {
      await patchTask(taskId, { priority }, onReload);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-0.5">
      {(["urgent", "high", "medium", "low"] as V2TaskPriority[]).map((key) => {
        const m = PRIORITY_META[key];
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            disabled={saving}
            onClick={() => void pick(key)}
            className={`v2-tight flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-[var(--v2-ink-50)] ${active ? "bg-[var(--v2-brand-50)]" : ""}`}
          >
            <V2Icons.flag className="h-3.5 w-3.5 shrink-0" style={{ color: m.dot }} />
            <span className="text-[12px] font-medium" style={{ color: active ? m.ink : "var(--v2-ink-700)" }}>
              {m.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function InlineAssigneeEditor({
  taskId,
  value,
  team,
  onReload,
  onClose,
}: {
  taskId: string;
  value: string | null;
  team: PortfolioMember[];
  onReload?: () => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function pick(userId: string | null) {
    if (userId === value || saving) return;
    setSaving(true);
    try {
      await patchTask(taskId, { assigneeUserId: userId }, onReload);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-h-[240px] overflow-y-auto">
      <button
        type="button"
        disabled={saving}
        onClick={() => void pick(null)}
        className={`v2-tight flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] transition hover:bg-[var(--v2-ink-50)] ${value === null ? "bg-[var(--v2-brand-50)] font-medium text-[var(--v2-brand-700)]" : "text-[var(--v2-ink-500)]"}`}
      >
        Без ответственного
      </button>
      {team.map((m) => {
        const active = value === m.userId;
        return (
          <button
            key={m.userId}
            type="button"
            disabled={saving}
            onClick={() => void pick(m.userId)}
            className={`v2-tight flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-[var(--v2-ink-50)] ${active ? "bg-[var(--v2-brand-50)]" : ""}`}
          >
            <span
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ background: m.gradient }}
            >
              {m.initials}
            </span>
            <span className="truncate text-[12px] font-medium text-[var(--v2-ink-800)]">{m.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export function InlineDeadlineEditor({
  taskId,
  deadlineAt,
  onReload,
  onClose,
}: {
  taskId: string;
  deadlineAt: string | null;
  onReload?: () => Promise<void>;
  onClose: () => void;
}) {
  const [local, setLocal] = useState(toDateInputValue(deadlineAt));
  const [saving, setSaving] = useState(false);

  async function save(value: string) {
    const next = value.trim() ? fromDateInputValue(value) : null;
    const prev = deadlineAt;
    if (next === prev || (!next && !prev)) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await patchTask(taskId, { deadlineAt: next }, onReload);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 p-1">
      <input
        type="date"
        autoFocus
        disabled={saving}
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          void save(e.target.value);
        }}
        className="v2-input w-full text-[12px]"
      />
      <button
        type="button"
        disabled={saving}
        onClick={() => {
          setLocal("");
          void save("");
        }}
        className="v2-tight w-full rounded-lg px-2 py-1.5 text-[12px] text-[var(--v2-ink-500)] transition hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-900)]"
      >
        Без даты
      </button>
    </div>
  );
}

export function InlineTitleEditor({
  taskId,
  title,
  completed,
  onReload,
  onDone,
}: {
  taskId: string;
  title: string;
  completed: boolean;
  onReload?: () => Promise<void>;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState(title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(title);
  }, [title]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  async function commit() {
    const next = draft.trim();
    if (!next || next === title) {
      onDone();
      return;
    }
    setSaving(true);
    try {
      await patchTask(taskId, { title: next }, onReload);
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <input
      ref={inputRef}
      disabled={saving}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => void commit()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void commit();
        }
        if (e.key === "Escape") {
          setDraft(title);
          onDone();
        }
      }}
      className={`v2-tight min-w-0 flex-1 rounded-md border border-[var(--v2-brand-300)] bg-white px-2 py-0.5 text-[13.5px] outline-none ring-2 ring-[var(--v2-brand-100)] ${completed ? "text-[var(--v2-ink-400)] line-through" : "font-medium text-[var(--v2-ink-900)]"}`}
    />
  );
}

export function memberFromTeam(
  assigneeUserId: string | null,
  assigneeName: string | null,
  team: PortfolioMember[]
): PortfolioMember | null {
  if (!assigneeUserId) return null;
  const found = team.find((m) => m.userId === assigneeUserId);
  if (found) return found;
  if (!assigneeName) return null;
  return {
    userId: assigneeUserId,
    name: assigneeName,
    initials: initialsFromName(assigneeName),
    gradient: gradientForUser(assigneeUserId),
  };
}
