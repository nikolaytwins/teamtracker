"use client";

import { apiUrl } from "@/lib/api-url";
import { parseExecutionDatesFromJson } from "@/lib/pm-subtasks-shared";
import { useCallback, useEffect, useState } from "react";

const DROP_UNASSIGNED = "__unassigned__";
const SUBTASK_DRAG_MIME = "application/x-team-tracker-subtask";

type TeamUser = { id: string; displayName: string; avatarUrl?: string | null };

export type SubtaskDto = {
  id: string;
  title: string;
  estimated_hours: number | null;
  completed_at: string | null;
  assignee_user_id: string | null;
  phase_id: string | null;
  deadline_at: string | null;
  execution_dates_json: string | null;
  executionDates?: string[];
  trackedSeconds?: number;
};

type PhaseLite = { id: string; title: string };

function formatTracked(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} ч ${m} м`;
  if (m > 0) return `${m} м`;
  return s > 0 ? `${s} с` : "0";
}

function deadlineInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function userInitial(name: string): string {
  const t = name.trim();
  return t ? t.charAt(0).toUpperCase() : "?";
}

export function ProjectSubtasksPanel({
  cardId,
  onChanged,
}: {
  cardId: string;
  onChanged?: () => void;
}) {
  const [phases, setPhases] = useState<PhaseLite[]>([]);
  const [subtasks, setSubtasks] = useState<SubtaskDto[]>([]);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPhaseId, setQuickPhaseId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [newExecDate, setNewExecDate] = useState<Record<string, string>>({});
  const [dropHoverKey, setDropHoverKey] = useState<string | null>(null);
  const [newPhaseTitle, setNewPhaseTitle] = useState("");
  const [phaseAdding, setPhaseAdding] = useState(false);
  const [expandedEditIds, setExpandedEditIds] = useState<Set<string>>(() => new Set());

  const toggleExpanded = useCallback((id: string, on: boolean) => {
    setExpandedEditIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const reload = useCallback(async () => {
    if (!cardId) return;
    setErr(null);
    try {
      const [pr, sr, ur] = await Promise.all([
        fetch(apiUrl(`/api/cards/${cardId}/phases`)),
        fetch(apiUrl(`/api/cards/${cardId}/subtasks`)),
        fetch(apiUrl("/api/team/users")),
      ]);
      const pdata = await pr.json();
      const sdata = await sr.json();
      const udata = await ur.json();
      if (!pr.ok) throw new Error(pdata.error || "Этапы");
      if (!sr.ok) throw new Error(sdata.error || "Подзадачи");
      const ph: PhaseLite[] = Array.isArray(pdata.phases)
        ? pdata.phases.map((p: { id?: string; title?: string }) => ({
            id: String(p.id ?? ""),
            title: String(p.title ?? ""),
          }))
        : [];
      setPhases(ph.filter((p) => p.id));
      const subs = Array.isArray(sdata.subtasks) ? (sdata.subtasks as SubtaskDto[]) : [];
      setSubtasks(
        subs.map((s) => ({
          ...s,
          executionDates: s.executionDates ?? parseExecutionDatesFromJson(s.execution_dates_json),
        }))
      );
      if (ur.ok && Array.isArray(udata.users)) {
        setUsers(
          udata.users.map((u: { id?: string; displayName?: string; avatarUrl?: string | null }) => ({
            id: String(u.id ?? ""),
            displayName: String(u.displayName ?? ""),
            avatarUrl: u.avatarUrl ?? null,
          }))
        );
      } else {
        setUsers([]);
      }
      setQuickPhaseId((prev) => {
        if (prev && ph.some((p) => p.id === prev)) return prev;
        return ph[0]?.id ?? "";
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  async function patchSub(id: string, body: Record<string, unknown>) {
    setBusy(true);
    try {
      const r = await fetch(apiUrl(`/api/cards/${cardId}/subtasks/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Не сохранилось");
      await reload();
      onChanged?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function addProjectPhase(e: React.FormEvent) {
    e.preventDefault();
    const title = newPhaseTitle.trim();
    if (!title || phaseAdding) return;
    setPhaseAdding(true);
    setErr(null);
    try {
      const r = await fetch(apiUrl(`/api/cards/${cardId}/phases`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Не удалось создать этап");
      setNewPhaseTitle("");
      await reload();
      onChanged?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPhaseAdding(false);
    }
  }

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(apiUrl(`/api/cards/${cardId}/subtasks`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          phaseId: quickPhaseId || null,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Не добавилось");
      setQuickTitle("");
      await reload();
      onChanged?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  const subsForPhase = (phaseId: string | null) =>
    subtasks.filter((s) => (phaseId == null ? !s.phase_id : s.phase_id === phaseId));

  function dropKeyForPhase(phaseId: string | null): string {
    return phaseId == null ? DROP_UNASSIGNED : phaseId;
  }

  function handleDragStartSub(e: React.DragEvent, subtaskId: string) {
    e.dataTransfer.setData(SUBTASK_DRAG_MIME, subtaskId);
    e.dataTransfer.setData("text/plain", subtaskId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOverZone(e: React.DragEvent, key: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropHoverKey(key);
  }

  function handleDropOnZone(e: React.DragEvent, targetPhaseId: string | null) {
    e.preventDefault();
    setDropHoverKey(null);
    const sid =
      e.dataTransfer.getData(SUBTASK_DRAG_MIME) || e.dataTransfer.getData("text/plain").trim();
    if (!sid) return;
    const cur = subtasks.find((x) => x.id === sid);
    const nextPhase = targetPhaseId;
    if (cur && (cur.phase_id ?? null) === (nextPhase ?? null)) return;
    void patchSub(sid, { phaseId: nextPhase });
  }

  const renderSubRow = (s: SubtaskDto) => {
    const exec = s.executionDates ?? parseExecutionDatesFromJson(s.execution_dates_json);
    const addDateKey = s.id;
    const pendingDate = newExecDate[addDateKey] ?? "";
    const canDrag = !busy && !s.completed_at;
    const expanded = expandedEditIds.has(s.id);
    const assignee = s.assignee_user_id ? users.find((u) => u.id === s.assignee_user_id) : undefined;
    const phaseTitle = s.phase_id ? phases.find((p) => p.id === s.phase_id)?.title : null;

    return (
      <div
        key={s.id}
        draggable={canDrag}
        onDragStart={canDrag ? (e) => handleDragStartSub(e, s.id) : undefined}
        className={`rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3 text-sm shadow-sm ${
          canDrag ? "cursor-grab active:cursor-grabbing" : ""
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {canDrag ? (
            <span
              className="shrink-0 cursor-grab select-none text-[var(--muted-foreground)] active:cursor-grabbing"
              title="Перетащите на другой этап"
              aria-hidden
            >
              ⋮⋮
            </span>
          ) : null}
          <button
            type="button"
            aria-checked={Boolean(s.completed_at)}
            role="checkbox"
            disabled={busy}
            onClick={() => void patchSub(s.id, { completed: !s.completed_at })}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
              s.completed_at
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--border)] bg-[var(--surface)] text-transparent hover:border-[var(--primary)]/50"
            }`}
          >
            ✓
          </button>
          {expanded ? (
            <input
              key={`${s.id}-t`}
              type="text"
              defaultValue={s.title}
              disabled={busy || Boolean(s.completed_at)}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== s.title) void patchSub(s.id, { title: v });
              }}
              className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm font-medium text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-60"
            />
          ) : (
            <span
              className={`min-w-0 flex-1 font-medium leading-snug ${
                s.completed_at ? "text-[var(--muted-foreground)] line-through" : "text-[var(--text)]"
              }`}
            >
              {s.title}
            </span>
          )}
          {!expanded && assignee ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--surface-2)] py-0.5 pl-0.5 pr-2">
              {assignee.avatarUrl ? (
                <img
                  src={assignee.avatarUrl}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--border)] text-[10px] font-semibold text-[var(--text)]">
                  {userInitial(assignee.displayName)}
                </span>
              )}
              <span className="max-w-[7rem] truncate text-[11px] text-[var(--muted-foreground)]">{assignee.displayName}</span>
            </span>
          ) : null}
          {!s.completed_at ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => toggleExpanded(s.id, !expanded)}
              className="ml-auto shrink-0 rounded-lg border border-[var(--border)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] disabled:opacity-40"
            >
              {expanded ? "Свернуть" : "Детали"}
            </button>
          ) : null}
        </div>
        {!expanded ? (
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[var(--muted-foreground)]">
            {phaseTitle ? <span>Этап: {phaseTitle}</span> : null}
            {s.deadline_at ? <span>До {deadlineInputValue(s.deadline_at)}</span> : null}
            {s.estimated_hours != null ? <span>Оценка {s.estimated_hours} ч</span> : null}
            <span className="tabular-nums">Факт {formatTracked(s.trackedSeconds ?? 0)}</span>
          </div>
        ) : (
          <div className="mt-3 space-y-3 border-t border-[var(--border)]/70 pt-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-[11px] text-[var(--muted-foreground)]">
                Ответственный
                <select
                  className="tt-select mt-0.5 w-full py-1.5 text-xs"
                  value={s.assignee_user_id ?? ""}
                  disabled={busy || Boolean(s.completed_at)}
                  onChange={(e) => void patchSub(s.id, { assigneeUserId: e.target.value || null })}
                >
                  <option value="">—</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[11px] text-[var(--muted-foreground)]">
                Дедлайн
                <input
                  type="date"
                  className="tt-input mt-0.5 w-full py-1.5 text-xs"
                  value={deadlineInputValue(s.deadline_at)}
                  disabled={busy || Boolean(s.completed_at)}
                  onChange={(e) =>
                    void patchSub(s.id, { deadlineAt: e.target.value ? `${e.target.value}T12:00:00.000Z` : null })
                  }
                />
              </label>
              <label className="block text-[11px] text-[var(--muted-foreground)]">
                Оценка, ч
                <input
                  type="number"
                  step={0.25}
                  min={0}
                  className="tt-input mt-0.5 w-full py-1.5 text-xs tabular-nums"
                  defaultValue={s.estimated_hours ?? ""}
                  disabled={busy || Boolean(s.completed_at)}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    const n = v === "" ? null : Number(v);
                    if (n !== null && Number.isNaN(n)) return;
                    if (n !== s.estimated_hours) void patchSub(s.id, { estimatedHours: n });
                  }}
                />
              </label>
              <div className="text-[11px] text-[var(--muted-foreground)]">
                <div>Факт (трекер)</div>
                <div className="mt-0.5 tabular-nums text-[var(--text)]">{formatTracked(s.trackedSeconds ?? 0)}</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                Даты выполнения
              </span>
              {exec.map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={busy || Boolean(s.completed_at)}
                  onClick={() => {
                    const next = exec.filter((x) => x !== d);
                    void patchSub(s.id, { executionDates: next });
                  }}
                  className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--text)] hover:bg-[var(--danger-soft)] disabled:opacity-50"
                  title="Убрать дату"
                >
                  {d} ×
                </button>
              ))}
              <input
                type="date"
                className="tt-input max-w-[9.5rem] py-1 text-[11px]"
                value={pendingDate}
                disabled={busy || Boolean(s.completed_at)}
                onChange={(e) => setNewExecDate((prev) => ({ ...prev, [addDateKey]: e.target.value }))}
              />
              <button
                type="button"
                disabled={busy || Boolean(s.completed_at) || !pendingDate}
                onClick={() => {
                  const ymd = pendingDate.trim().slice(0, 10);
                  if (!ymd) return;
                  const next = [...new Set([...exec, ymd])].sort();
                  void patchSub(s.id, { executionDates: next });
                  setNewExecDate((prev) => ({ ...prev, [addDateKey]: "" }));
                }}
                className="rounded-lg bg-[var(--primary)]/90 px-2 py-1 text-[11px] font-semibold text-white hover:brightness-110 disabled:opacity-40"
              >
                + дата
              </button>
            </div>
            <label className="block text-[11px] text-[var(--muted-foreground)]">
              Этап проекта (только ваши этапы)
              <select
                className="tt-select mt-0.5 max-w-full py-1.5 text-xs"
                value={s.phase_id ?? ""}
                disabled={busy || Boolean(s.completed_at)}
                onChange={(e) => void patchSub(s.id, { phaseId: e.target.value || null })}
              >
                <option value="">Без этапа</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <p className="text-sm text-[var(--muted-foreground)] py-2">Загрузка подзадач…</p>;
  }

  return (
    <div className="space-y-4 border-t border-[var(--border)] pt-4" onDragEnd={() => setDropHoverKey(null)}>
      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}

      <form onSubmit={(e) => void addProjectPhase(e)} className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--border)]/80 bg-[var(--surface-2)]/30 p-3">
        <label className="min-w-[12rem] flex-1 text-[11px] font-medium text-[var(--muted-foreground)]">
          Новый этап проекта
          <input
            type="text"
            value={newPhaseTitle}
            onChange={(e) => setNewPhaseTitle(e.target.value)}
            placeholder="Например: Согласование макета"
            className="tt-input mt-0.5 w-full py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={phaseAdding || !newPhaseTitle.trim()}
          className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-40"
        >
          {phaseAdding ? "…" : "Добавить этап"}
        </button>
      </form>

      <form onSubmit={(e) => void addSubtask(e)} className="flex flex-wrap items-end gap-2 rounded-xl bg-[var(--surface-2)]/40 p-3">
        <label className="min-w-[8rem] flex-1 text-[11px] text-[var(--muted-foreground)]">
          Подзадача
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Сначала этап — затем подзадача"
            className="tt-input mt-0.5 w-full py-2 text-sm"
          />
        </label>
        <label className="min-w-[10rem] text-[11px] text-[var(--muted-foreground)]">
          Этап
          <select
            className="tt-select mt-0.5 w-full py-2 text-sm"
            value={quickPhaseId}
            onChange={(e) => setQuickPhaseId(e.target.value)}
          >
            <option value="">Без этапа</option>
            {phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={busy || !quickTitle.trim()}
          className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-40"
        >
          Добавить
        </button>
      </form>

      {phases.length === 0 && subsForPhase(null).length === 0 ? (
        <p className="text-xs text-[var(--muted-foreground)]">
          Создайте этап выше, затем добавляйте подзадачи. Без этапа подзадачи останутся в блоке «Без этапа».
        </p>
      ) : null}

      {phases.map((p) => {
        const list = subsForPhase(p.id);
        const dk = dropKeyForPhase(p.id);
        const isHover = dropHoverKey === dk;
        return (
          <div
            key={p.id}
            onDragOver={(e) => handleDragOverZone(e, dk)}
            onDrop={(e) => handleDropOnZone(e, p.id)}
            className={`rounded-xl p-2 transition-[box-shadow,background] ${
              isHover ? "bg-[var(--primary-soft)]/15 ring-2 ring-[var(--primary)]/40" : ""
            }`}
          >
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{p.title}</h4>
            {list.length === 0 ? (
              <p className="mb-2 min-h-[2.5rem] rounded-lg border border-dashed border-[var(--border)] px-2 py-4 text-center text-xs text-[var(--muted-foreground)]">
                Нет подзадач — перетащите сюда из другого этапа.
              </p>
            ) : (
              <div className="space-y-2">{list.map(renderSubRow)}</div>
            )}
          </div>
        );
      })}

      {subsForPhase(null).length > 0 || phases.length > 0 ? (
        <div
          onDragOver={(e) => handleDragOverZone(e, DROP_UNASSIGNED)}
          onDrop={(e) => handleDropOnZone(e, null)}
          className={`rounded-xl p-2 transition-[box-shadow,background] ${
            dropHoverKey === DROP_UNASSIGNED ? "bg-[var(--primary-soft)]/15 ring-2 ring-[var(--primary)]/40" : ""
          }`}
        >
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Без этапа</h4>
          {subsForPhase(null).length === 0 ? (
            <p className="mb-2 min-h-[2.5rem] rounded-lg border border-dashed border-[var(--border)] px-2 py-4 text-center text-xs text-[var(--muted-foreground)]">
              Подзадачи без этапа — перетащите сюда, чтобы снять привязку к этапу.
            </p>
          ) : (
            <div className="space-y-2">{subsForPhase(null).map(renderSubRow)}</div>
          )}
        </div>
      ) : null}

      {subtasks.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">Подзадач пока нет.</p> : null}
    </div>
  );
}
