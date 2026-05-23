"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  fromDateInputValue,
  fromDatetimeLocalValue,
  todayDatetimeLocal,
  toDatetimeLocalValue,
} from "@/lib/v2/format";
import { parseQuickTaskInput } from "@/lib/v2/nlp/parse-task";
import type { V2ProjectRow, V2TaskPriority, V2TaskWithMeta } from "@/lib/v2/types";
import { AssigneeAvatarPicker, PriorityFlagPicker } from "@/components/v2/tasks/task-field-pickers";
import { ProjectChip } from "@/components/v2/ui/primitives";
import { useEffect, useMemo, useState } from "react";

type Member = { user_id: string; display_name: string; role?: string };

export type LockedProjectHint = {
  name: string;
  shortName?: string | null;
  colorBg?: string | null;
  colorTint?: string | null;
  colorInk?: string | null;
};

type DuePreset = "none" | "today_eod" | "today_16" | "tomorrow" | "week";

function dueFromPreset(preset: DuePreset): string {
  const now = new Date();
  if (preset === "none") return "";
  if (preset === "today_eod") return todayDatetimeLocal(23, 59);
  if (preset === "today_16") return todayDatetimeLocal(16, 0);
  if (preset === "tomorrow") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    return toDatetimeLocalValue(d.toISOString());
  }
  if (preset === "week") {
    const d = new Date(now);
    const day = d.getDay();
    const daysUntilFriday = day <= 5 ? 5 - day : 5 + (7 - day);
    d.setDate(d.getDate() + daysUntilFriday);
    d.setHours(18, 0, 0, 0);
    return toDatetimeLocalValue(d.toISOString());
  }
  return "";
}

export function NewTaskModal({
  open,
  onClose,
  onCreated,
  projects,
  members,
  defaultProjectId,
  lockedProject,
  workMonth,
  initialTitle,
  currentUserId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (task: V2TaskWithMeta) => void;
  projects: V2ProjectRow[];
  members: Member[];
  defaultProjectId?: string | null;
  lockedProject?: LockedProjectHint | null;
  workMonth?: string | null;
  initialTitle?: string;
  currentUserId?: string;
}) {
  const teamProjects = useMemo(() => projects.filter((p) => p.scope === "team"), [projects]);
  const assigneeMembers = useMemo(() => members.filter((m) => m.role !== "client"), [members]);
  const projectLocked = Boolean(defaultProjectId);

  const lockedProjectOption = useMemo(() => {
    if (!defaultProjectId) return null;
    const fromList = teamProjects.find((p) => p.id === defaultProjectId);
    if (fromList) {
      return {
        id: fromList.id,
        name: fromList.name,
        short_name: fromList.short_name,
        color_bg: fromList.color_bg,
        color_tint: fromList.color_tint,
        color_ink: fromList.color_ink,
      };
    }
    if (lockedProject) {
      return {
        id: defaultProjectId,
        name: lockedProject.name,
        short_name: lockedProject.shortName,
        color_bg: lockedProject.colorBg,
        color_tint: lockedProject.colorTint,
        color_ink: lockedProject.colorInk,
      };
    }
    return null;
  }, [defaultProjectId, teamProjects, lockedProject]);

  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [plannedLocal, setPlannedLocal] = useState("");
  const [dueLocal, setDueLocal] = useState("");
  const [duePreset, setDuePreset] = useState<DuePreset>("none");
  const [priority, setPriority] = useState<V2TaskPriority>("medium");
  const [estimateHours, setEstimateHours] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle ?? "");
    setProjectId(defaultProjectId ?? teamProjects[0]?.id ?? "");
    setPlannedLocal("");
    setDueLocal("");
    setDuePreset("none");
    setPriority("medium");
    setEstimateHours("");
    setAssigneeId(currentUserId ?? assigneeMembers[0]?.user_id ?? null);
    setError(null);
  }, [open, defaultProjectId, initialTitle, currentUserId, teamProjects, assigneeMembers]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function applyPreset(preset: DuePreset) {
    setDuePreset(preset);
    setDueLocal(dueFromPreset(preset));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const raw = title.trim();
    if (!raw) {
      setError("Введите название задачи");
      return;
    }

    const finalProjectId = defaultProjectId ?? (projectId || null);

    setSaving(true);
    setError(null);
    try {
      const parsed = parseQuickTaskInput(raw);
      const finalTitle = parsed.title || raw;
      const deadlineAt = dueLocal
        ? fromDatetimeLocalValue(dueLocal)
        : duePreset !== "none"
          ? fromDatetimeLocalValue(dueFromPreset(duePreset))
          : parsed.deadlineAt;
      const plannedAt = plannedLocal ? fromDateInputValue(plannedLocal) : null;

      const task = await fetchJson<{ task: V2TaskWithMeta }>("/api/v2/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: finalTitle,
          scope: "team",
          projectId: finalProjectId,
          assigneeUserId: assigneeId || undefined,
          plannedAt,
          deadlineAt,
          priority,
          estimateHours: estimateHours ? Number(estimateHours) : undefined,
          workMonth: workMonth ? workMonth.slice(0, 7) : undefined,
        }),
      });
      onCreated?.(task.task);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать задачу");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center bg-black/35 pt-[10vh] sm:pt-[12vh]">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Закрыть" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-task-title"
        className="relative flex max-h-[88vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--v2-shadow-pop)]"
      >
        <div className="relative border-b border-[var(--v2-ink-100)] px-5 py-4">
          <div className="v2-dotgrid pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 id="new-task-title" className="v2-tight text-[17px] font-semibold text-[var(--v2-ink-900)]">
                Новая задача
              </h2>
              {projectLocked && lockedProjectOption ? (
                <div className="mt-2">
                  <ProjectChip
                    name={lockedProjectOption.name}
                    short={lockedProjectOption.short_name}
                    bg={lockedProjectOption.color_bg}
                    tint={lockedProjectOption.color_tint}
                    ink={lockedProjectOption.color_ink}
                  />
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-50)]"
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={(e) => void submit(e)} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">{error}</div>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-[var(--v2-ink-600)]">Название</span>
            <input
              autoFocus
              className="v2-input text-[15px]"
              placeholder="Например: Презентация концептов · завтра в 16:00"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <span className="mt-1 block text-[11px] text-[var(--v2-ink-400)]">
              Можно указать срок в тексте — «завтра», «в пятницу в 15:00»
            </span>
          </label>

          {!projectLocked ? (
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-[var(--v2-ink-600)]">Проект</span>
              <select className="v2-input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Без проекта</option>
                {teamProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div>
            <span className="mb-1.5 block text-[12px] font-medium text-[var(--v2-ink-600)]">Ответственный</span>
            <AssigneeAvatarPicker
              members={assigneeMembers}
              value={assigneeId}
              onChange={setAssigneeId}
              allowEmpty={false}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-[12px]">
              <span className="text-[var(--v2-ink-600)]">Дата выполнения</span>
              <input
                type="date"
                className="v2-input mt-1.5 w-full"
                value={plannedLocal}
                onChange={(e) => setPlannedLocal(e.target.value)}
              />
            </label>
            <label className="block text-[12px]">
              <span className="text-[var(--v2-ink-600)]">Оценка, ч</span>
              <input
                type="number"
                min={0}
                step={0.5}
                className="v2-input mt-1.5 w-full"
                placeholder="4"
                value={estimateHours}
                onChange={(e) => setEstimateHours(e.target.value)}
              />
            </label>
          </div>

          <div>
            <span className="mb-1.5 block text-[12px] font-medium text-[var(--v2-ink-600)]">Срок (дедлайн)</span>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {(
                [
                  ["none", "Без срока"],
                  ["today_16", "Сегодня 16:00"],
                  ["today_eod", "До конца дня"],
                  ["tomorrow", "Завтра"],
                  ["week", "На неделе"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={`rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition ${
                    duePreset === key
                      ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]"
                      : "bg-[var(--v2-ink-50)] text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-100)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="datetime-local"
              className="v2-input"
              value={dueLocal}
              onChange={(e) => {
                setDueLocal(e.target.value);
                setDuePreset("none");
              }}
            />
          </div>

          <div>
            <span className="mb-1.5 block text-[12px] font-medium text-[var(--v2-ink-600)]">Приоритет</span>
            <PriorityFlagPicker value={priority} onChange={setPriority} />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--v2-ink-100)] pt-4">
            <button type="button" onClick={onClose} className="v2-input px-4 py-2 text-[13px]">
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="v2-btn-primary px-4 py-2 text-[13px] disabled:opacity-60"
            >
              {saving ? "Создаём…" : "Создать задачу"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
