"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { PRIORITY_META, V2Icons } from "@/components/v2/ui/icons";
import {
  HYPOTHESIS_OUTCOME_META,
  HYPOTHESIS_OUTCOMES,
  HYPOTHESIS_PRIORITIES,
  HYPOTHESIS_STATUS_META,
  HYPOTHESIS_STATUSES,
  applyHypothesisMove,
  parseQuickHypothesis,
  priorityLaneId,
  type Hypothesis,
  type HypothesisNote,
  type HypothesisOutcome,
  type HypothesisPriority,
  type HypothesisStatus,
  type HypothesisWithNotes,
} from "@/lib/v2/personal/hypotheses-meta";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";

const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const card = hits.find((hit) => !String(hit.id).startsWith("prio:"));
  if (card) return [card];
  if (hits.length) return hits;
  return rectIntersection(args);
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDay(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function sortNotes(notes: HypothesisNote[]) {
  return [...notes].sort((a, b) => {
    if (a.happened_on !== b.happened_on) return a.happened_on < b.happened_on ? 1 : -1;
    return a.created_at < b.created_at ? 1 : -1;
  });
}

function outcomeCounts(notes: HypothesisNote[]) {
  const counts: Record<HypothesisOutcome, number> = { worked: 0, missed: 0, mixed: 0, note: 0 };
  for (const note of notes) counts[note.outcome] += 1;
  return counts;
}

function Grip() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <circle cx="9" cy="7" r="1.15" />
      <circle cx="15" cy="7" r="1.15" />
      <circle cx="9" cy="12" r="1.15" />
      <circle cx="15" cy="12" r="1.15" />
      <circle cx="9" cy="17" r="1.15" />
      <circle cx="15" cy="17" r="1.15" />
    </svg>
  );
}

function StatusPill({ status }: { status: HypothesisStatus }) {
  const meta = HYPOTHESIS_STATUS_META[status];
  return (
    <span
      className="v2-tight inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md px-2 text-[11.5px] font-semibold"
      style={{ background: meta.soft, color: meta.ink }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.dot }} />
      {meta.label}
    </span>
  );
}

function HypothesisGhost({ hypothesis }: { hypothesis: HypothesisWithNotes }) {
  const priority = PRIORITY_META[hypothesis.priority];
  return (
    <div
      className="rounded-2xl bg-white p-4 shadow-[var(--v2-shadow-pop)]"
      style={{ borderLeft: `3px solid ${priority.dot}` }}
    >
      <div className="v2-tight text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
        {hypothesis.direction || "Без направления"}
      </div>
      <h3 className="v2-tight mt-1.5 line-clamp-3 text-[17px] font-semibold leading-[1.35] text-[var(--v2-ink-900)]">
        {hypothesis.title}
      </h3>
    </div>
  );
}

function HypothesisCard({
  hypothesis,
  canReorder,
  flashing,
  overlay,
  onOpen,
  suppressRef,
}: {
  hypothesis: HypothesisWithNotes;
  canReorder: boolean;
  flashing?: boolean;
  overlay?: boolean;
  onOpen?: () => void;
  suppressRef?: MutableRefObject<boolean>;
}) {
  const draggable = useDraggable({ id: hypothesis.id, disabled: !canReorder || overlay });
  const droppable = useDroppable({ id: hypothesis.id, disabled: !canReorder || overlay });
  const setRef = (node: HTMLDivElement | null) => {
    draggable.setNodeRef(node);
    droppable.setNodeRef(node);
  };
  const counts = outcomeCounts(hypothesis.notes);
  const hasJournal = hypothesis.notes.length > 0;
  const priority = PRIORITY_META[hypothesis.priority];

  return (
    <div
      ref={overlay ? undefined : setRef}
      data-hyp={hypothesis.id}
      tabIndex={0}
      onClick={() => {
        if (suppressRef?.current) return;
        onOpen?.();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen?.();
        }
      }}
      className={`rounded-2xl bg-white text-left shadow-[var(--v2-shadow-card)] transition ${
        overlay
          ? "shadow-[var(--v2-shadow-pop)]"
          : "cursor-pointer hover:shadow-[var(--v2-shadow-cardHv)]"
      } ${droppable.isOver && !draggable.isDragging ? "ring-2 ring-[var(--v2-brand-400)]" : ""} ${
        flashing ? "ring-2 ring-[var(--v2-brand-400)]" : ""
      } ${draggable.isDragging ? "opacity-40" : ""}`}
      style={{ borderLeft: `3px solid ${priority.dot}` }}
    >
      <div className="flex gap-1 p-4 pr-5">
        {canReorder && !overlay ? (
          <div
            className="mt-0.5 inline-flex h-8 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-[var(--v2-ink-300)] touch-none hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-600)] active:cursor-grabbing"
            aria-label="Перетащить"
            {...draggable.attributes}
            {...draggable.listeners}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Grip />
          </div>
        ) : (
          <span className="w-1 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="v2-tight text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
              {hypothesis.direction || "Без направления"}
            </div>
            <StatusPill status={hypothesis.status} />
          </div>
          <h3
            className="v2-tight mt-1.5 text-[17px] font-semibold leading-[1.35] text-[var(--v2-ink-900)]"
            style={{ textWrap: "pretty" }}
          >
            {hypothesis.title}
          </h3>
          {hypothesis.check_text ? (
            <p className="v2-tight mt-3 line-clamp-2 text-[13.5px] leading-relaxed text-[var(--v2-ink-600)]">
              <span className="font-semibold text-[var(--v2-ink-800)]">Проверить. </span>
              {hypothesis.check_text}
            </p>
          ) : null}
          {hypothesis.success_text ? (
            <p className="v2-tight mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-[var(--v2-ink-600)]">
              <span className="font-semibold text-[var(--v2-ink-800)]">Успех. </span>
              {hypothesis.success_text}
            </p>
          ) : null}
          <div className="v2-tight mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--v2-ink-500)]">
            {hasJournal ? (
              <>
                {counts.worked ? <span style={{ color: HYPOTHESIS_OUTCOME_META.worked.ink }}>Зашло {counts.worked}</span> : null}
                {counts.missed ? <span style={{ color: HYPOTHESIS_OUTCOME_META.missed.ink }}>Не зашло {counts.missed}</span> : null}
                {counts.mixed ? <span style={{ color: HYPOTHESIS_OUTCOME_META.mixed.ink }}>Смешанно {counts.mixed}</span> : null}
                {counts.note ? <span>Заметок {counts.note}</span> : null}
              </>
            ) : (
              <span>Пока без проверок</span>
            )}
            <span className="ml-auto text-[var(--v2-ink-400)]">Открыть</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriorityLane({
  priority,
  hypotheses,
  canReorder,
  flashId,
  onOpen,
  suppressRef,
}: {
  priority: HypothesisPriority;
  hypotheses: HypothesisWithNotes[];
  canReorder: boolean;
  flashId: string | null;
  onOpen: (id: string) => void;
  suppressRef: MutableRefObject<boolean>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: priorityLaneId(priority), disabled: !canReorder });
  const meta = PRIORITY_META[priority];
  if (!hypotheses.length && !canReorder) return null;

  return (
    <section
      ref={setNodeRef}
      className={`rounded-3xl px-1.5 py-2 ${isOver ? "bg-[var(--v2-brand-50)]/80" : ""}`}
    >
      <div className="mb-2 flex items-center gap-2 px-2">
        <span className="h-2 w-2 rounded-full" style={{ background: meta.dot }} />
        <h2 className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-800)]">{meta.label} приоритет</h2>
        <span className="v2-tnum text-[12px] text-[var(--v2-ink-400)]">{hypotheses.length}</span>
      </div>
      {hypotheses.length ? (
        <div className="flex flex-col gap-2.5">
          {hypotheses.map((hypothesis) => (
            <HypothesisCard
              key={hypothesis.id}
              hypothesis={hypothesis}
              canReorder={canReorder}
              flashing={flashId === hypothesis.id}
              onOpen={() => onOpen(hypothesis.id)}
              suppressRef={suppressRef}
            />
          ))}
        </div>
      ) : (
        <div className="v2-tight rounded-2xl border border-dashed border-[var(--v2-ink-200)] px-4 py-3 text-[13px] text-[var(--v2-ink-400)]">
          Перетащи сюда, чтобы поставить {meta.label.toLowerCase()} приоритет
        </div>
      )}
    </section>
  );
}

function HypothesisDrawer({
  item,
  onClose,
  onPatch,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onDelete,
}: {
  item: HypothesisWithNotes;
  onClose: () => void;
  onPatch: (id: string, patch: Record<string, string>) => Promise<void>;
  onCreateNote: (id: string, input: { body: string; outcome: HypothesisOutcome; happenedOn: string }) => Promise<void>;
  onUpdateNote: (
    id: string,
    noteId: string,
    patch: { body?: string; outcome?: HypothesisOutcome; happenedOn?: string },
  ) => Promise<void>;
  onDeleteNote: (id: string, noteId: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [direction, setDirection] = useState(item.direction);
  const [title, setTitle] = useState(item.title);
  const [check, setCheck] = useState(item.check_text);
  const [success, setSuccess] = useState(item.success_text);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<HypothesisOutcome | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [happenedOn, setHappenedOn] = useState(todayISO());
  const [noteSaving, setNoteSaving] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const commit = async () => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      setTitle(item.title);
      setLocalError("Нужна формулировка");
      return;
    }
    const patch: Record<string, string> = {};
    if (nextTitle !== item.title) patch.title = nextTitle;
    if (direction.trim() !== item.direction) patch.direction = direction.trim();
    if (check.trim() !== item.check_text) patch.checkText = check.trim();
    if (success.trim() !== item.success_text) patch.successText = success.trim();
    if (!Object.keys(patch).length) return;
    setSaving(true);
    setSaved(false);
    try {
      await onPatch(item.id, patch);
      setLocalError(null);
      setSaved(true);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const addNote = async () => {
    const body = noteBody.trim();
    if (!body || !outcome || noteSaving) return;
    setNoteSaving(true);
    setLocalError(null);
    try {
      await onCreateNote(item.id, { body, outcome, happenedOn });
      setNoteBody("");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Не удалось записать");
    } finally {
      setNoteSaving(false);
    }
  };

  const fieldClass =
    "v2-tight w-full resize-y rounded-xl bg-[var(--v2-ink-50)] px-3.5 py-3 text-[14.5px] leading-relaxed text-[var(--v2-ink-900)] outline-none placeholder:text-[var(--v2-ink-400)] focus:bg-white focus:shadow-[var(--v2-shadow-glow)]";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25">
      <button type="button" className="absolute inset-0" aria-label="Закрыть" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-[680px] flex-col bg-[#f7f8fb] shadow-[var(--v2-shadow-pop)]">
        <div className="flex items-center gap-2 border-b border-[var(--v2-ink-100)] bg-white px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="v2-tight inline-flex h-8 items-center rounded-lg px-2 text-[13px] font-medium text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-900)]"
          >
            ← К банку
          </button>
          <span className="v2-tight ml-auto text-[12px] text-[var(--v2-ink-400)]">
            {saving ? "Сохраняю…" : saved ? "Сохранено" : ""}
          </span>
          <select
            value={item.priority}
            onChange={(event) => {
              void onPatch(item.id, { priority: event.target.value }).catch((error: unknown) => {
                setLocalError(error instanceof Error ? error.message : "Не удалось сохранить");
              });
            }}
            className="h-8 cursor-pointer rounded-lg px-2 text-[12.5px] font-semibold outline-none"
            style={{
              background: PRIORITY_META[item.priority].soft,
              color: PRIORITY_META[item.priority].ink,
            }}
          >
            {HYPOTHESIS_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_META[priority].label}
              </option>
            ))}
          </select>
          <select
            value={item.status}
            onChange={(event) => {
              void onPatch(item.id, { status: event.target.value }).catch((error: unknown) => {
                setLocalError(error instanceof Error ? error.message : "Не удалось сохранить");
              });
            }}
            className="h-8 cursor-pointer rounded-lg px-2 text-[12.5px] font-semibold outline-none"
            style={{
              background: HYPOTHESIS_STATUS_META[item.status].soft,
              color: HYPOTHESIS_STATUS_META[item.status].ink,
            }}
          >
            {HYPOTHESIS_STATUSES.map((status) => (
              <option key={status} value={status}>
                {HYPOTHESIS_STATUS_META[status].label}
              </option>
            ))}
          </select>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {localError ? (
            <div className="v2-tight mb-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-800">{localError}</div>
          ) : null}

          <label className="block">
            <span className="v2-tight text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
              Направление
            </span>
            <input
              value={direction}
              onChange={(event) => setDirection(event.target.value)}
              onBlur={() => void commit()}
              placeholder="TwinLabs, Qmagic, курс…"
              className="v2-tight mt-1.5 h-10 w-full rounded-xl bg-white px-3.5 text-[14px] text-[var(--v2-ink-900)] shadow-[var(--v2-shadow-card)] outline-none placeholder:text-[var(--v2-ink-400)]"
            />
          </label>

          <label className="mt-4 block">
            <span className="v2-tight text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
              Гипотеза
            </span>
            <textarea
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => void commit()}
              rows={4}
              className={`${fieldClass} mt-1.5 bg-white shadow-[var(--v2-shadow-card)]`}
            />
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="v2-tight text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
                Что проверить
              </span>
              <textarea
                value={check}
                onChange={(event) => setCheck(event.target.value)}
                onBlur={() => void commit()}
                rows={5}
                placeholder="Один конкретный тест, без строительства всего"
                className={`${fieldClass} mt-1.5`}
              />
            </label>
            <label className="block">
              <span className="v2-tight text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
                Успех
              </span>
              <textarea
                value={success}
                onChange={(event) => setSuccess(event.target.value)}
                onBlur={() => void commit()}
                rows={5}
                placeholder="Какой ответ реальности считается достаточным"
                className={`${fieldClass} mt-1.5`}
              />
            </label>
          </div>

          <section className="mt-8">
            <h3 className="v2-tight text-[18px] font-semibold text-[var(--v2-ink-900)]">Журнал проверки</h3>
            <p className="v2-tight mt-1 text-[13px] text-[var(--v2-ink-500)]">
              Что тестировал, что зашло и что нет. Потом по этим отметкам можно смотреть аналитику.
            </p>

            <div className="mt-3 rounded-2xl bg-white p-3.5 shadow-[var(--v2-shadow-card)]">
              <div className="flex flex-wrap items-center gap-1.5">
                {HYPOTHESIS_OUTCOMES.map((key) => {
                  const meta = HYPOTHESIS_OUTCOME_META[key];
                  const active = outcome === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setOutcome(key)}
                      className="v2-tight h-8 rounded-lg px-2.5 text-[12.5px] font-semibold transition"
                      style={{
                        background: active ? meta.ink : meta.soft,
                        color: active ? "white" : meta.ink,
                      }}
                    >
                      {meta.label}
                    </button>
                  );
                })}
                <input
                  type="date"
                  value={happenedOn}
                  onChange={(event) => setHappenedOn(event.target.value)}
                  className="v2-tight ml-auto h-8 rounded-lg bg-[var(--v2-ink-50)] px-2 text-[12.5px] text-[var(--v2-ink-700)] outline-none"
                />
              </div>
              <textarea
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
                rows={3}
                placeholder="Что проверил, что зашло, что не зашло…"
                className={`${fieldClass} mt-2.5`}
              />
              <div className="mt-2.5 flex justify-end">
                <button
                  type="button"
                  disabled={!outcome || !noteBody.trim() || noteSaving}
                  onClick={() => void addNote()}
                  className="v2-tight inline-flex h-9 items-center rounded-xl bg-[var(--v2-ink-900)] px-3.5 text-[13px] font-medium text-white transition hover:bg-[var(--v2-ink-700)] disabled:opacity-40"
                >
                  {noteSaving ? "Записываю…" : "Записать"}
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {item.notes.length ? (
                item.notes.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    onUpdate={(patch) => onUpdateNote(item.id, note.id, patch)}
                    onDelete={() => onDeleteNote(item.id, note.id)}
                  />
                ))
              ) : (
                <p className="v2-tight px-1 py-4 text-[13.5px] text-[var(--v2-ink-400)]">
                  Пока пусто. Первая запись — это уже данные, а не ощущение.
                </p>
              )}
            </div>
          </section>

          <button
            type="button"
            onClick={() => void onDelete(item.id)}
            className="v2-tight mt-8 text-[12.5px] font-medium text-[var(--v2-ink-400)] hover:text-rose-600"
          >
            Удалить гипотезу
          </button>
        </div>
      </aside>
    </div>
  );
}

function NoteRow({
  note,
  onUpdate,
  onDelete,
}: {
  note: HypothesisNote;
  onUpdate: (patch: { body?: string; outcome?: HypothesisOutcome; happenedOn?: string }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  const [busy, setBusy] = useState(false);
  const meta = HYPOTHESIS_OUTCOME_META[note.outcome];

  useEffect(() => setBody(note.body), [note.body]);

  const saveBody = async () => {
    const next = body.trim();
    if (!next) {
      setBody(note.body);
      setEditing(false);
      return;
    }
    if (next === note.body) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await onUpdate({ body: next });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-2xl bg-white px-4 py-3.5 shadow-[var(--v2-shadow-card)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="v2-tnum text-[12px] text-[var(--v2-ink-400)]">{formatDay(note.happened_on)}</span>
        <select
          value={note.outcome}
          disabled={busy}
          onChange={(event) => void onUpdate({ outcome: event.target.value as HypothesisOutcome })}
          className="h-7 cursor-pointer rounded-md px-2 text-[12px] font-semibold outline-none"
          style={{ background: meta.soft, color: meta.ink }}
        >
          {HYPOTHESIS_OUTCOMES.map((key) => (
            <option key={key} value={key}>
              {HYPOTHESIS_OUTCOME_META[key].label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className="v2-tight ml-auto text-[12px] text-[var(--v2-ink-400)] hover:text-[var(--v2-ink-800)]"
        >
          {editing ? "Отмена" : "Изменить"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!confirm("Удалить запись?")) return;
            void onDelete();
          }}
          className="v2-tight text-[12px] text-[var(--v2-ink-400)] hover:text-rose-600"
        >
          Удалить
        </button>
      </div>
      {editing ? (
        <div className="mt-2">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            className="v2-tight w-full resize-y rounded-xl bg-[var(--v2-ink-50)] px-3 py-2.5 text-[14px] leading-relaxed text-[var(--v2-ink-900)] outline-none"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveBody()}
            className="v2-tight mt-2 h-8 rounded-lg bg-[var(--v2-ink-900)] px-3 text-[12.5px] font-medium text-white disabled:opacity-40"
          >
            Сохранить
          </button>
        </div>
      ) : (
        <p className="v2-tight mt-2 whitespace-pre-wrap text-[14.5px] leading-relaxed text-[var(--v2-ink-800)]" style={{ textWrap: "pretty" }}>
          {note.body}
        </p>
      )}
    </article>
  );
}

export function HypothesesClient() {
  const [items, setItems] = useState<HypothesisWithNotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<HypothesisStatus | "all">("all");
  const [draft, setDraft] = useState("");
  const [draftPriority, setDraftPriority] = useState<HypothesisPriority>("high");
  const [adding, setAdding] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const itemsRef = useRef(items);
  const suppressRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  itemsRef.current = items;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const load = useCallback(async () => {
    setError(null);
    try {
      const board = await fetchJson<{ hypotheses: HypothesisWithNotes[] }>("/api/v2/personal/hypotheses");
      setItems(
        board.hypotheses.map((hypothesis) => ({
          ...hypothesis,
          notes: sortNotes(hypothesis.notes ?? []),
        })),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить гипотезы");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!flashId) return;
    document.querySelector(`[data-hyp="${flashId}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [flashId]);

  const mergeHypothesis = useCallback((hypothesis: Hypothesis) => {
    setItems((prev) => prev.map((item) => (item.id === hypothesis.id ? { ...item, ...hypothesis, notes: item.notes } : item)));
  }, []);

  const patchHypothesis = useCallback(
    async (id: string, patch: Record<string, string>) => {
      const { hypothesis } = await fetchJson<{ hypothesis: Hypothesis }>(`/api/v2/personal/hypotheses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      mergeHypothesis(hypothesis);
    },
    [mergeHypothesis],
  );

  const addHypothesis = async () => {
    const parsed = parseQuickHypothesis(draft);
    if (!parsed || adding) return;
    setAdding(true);
    setError(null);
    try {
      const { hypothesis } = await fetchJson<{ hypothesis: Hypothesis }>("/api/v2/personal/hypotheses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: parsed.title,
          direction: parsed.direction,
          priority: draftPriority,
        }),
      });
      setItems((prev) => [{ ...hypothesis, notes: [] }, ...prev.filter((item) => item.id !== hypothesis.id)]);
      setDraft("");
      setFlashId(hypothesis.id);
      window.setTimeout(() => setFlashId((current) => (current === hypothesis.id ? null : current)), 1600);
      inputRef.current?.focus();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Не удалось добавить гипотезу");
    } finally {
      setAdding(false);
    }
  };

  const persistOrder = async (next: HypothesisWithNotes[]) => {
    try {
      await fetchJson("/api/v2/personal/hypotheses/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: next.map((item) => ({ id: item.id, priority: item.priority, sort_order: item.sort_order })),
        }),
      });
    } catch (orderError) {
      setError(orderError instanceof Error ? orderError.message : "Не удалось сохранить порядок");
      await load();
    }
  };

  const onDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const onDragEnd = (event: DragEndEvent) => {
    suppressRef.current = true;
    window.setTimeout(() => {
      suppressRef.current = false;
    }, 80);
    setActiveId(null);
    const overId = event.over ? String(event.over.id) : "";
    const next = applyHypothesisMove(itemsRef.current, String(event.active.id), overId);
    if (!next) return;
    setItems(next);
    void persistOrder(next);
  };

  const createNote = async (id: string, input: { body: string; outcome: HypothesisOutcome; happenedOn: string }) => {
    const { note } = await fetchJson<{ note: HypothesisNote }>(`/api/v2/personal/hypotheses/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes: sortNotes([note, ...item.notes.filter((row) => row.id !== note.id)]) } : item)),
    );
  };

  const updateNote = async (
    id: string,
    noteId: string,
    patch: { body?: string; outcome?: HypothesisOutcome; happenedOn?: string },
  ) => {
    const { note } = await fetchJson<{ note: HypothesisNote }>(`/api/v2/personal/hypotheses/${id}/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, notes: sortNotes(item.notes.map((row) => (row.id === note.id ? note : row))) } : item,
      ),
    );
  };

  const deleteNote = async (id: string, noteId: string) => {
    await fetchJson(`/api/v2/personal/hypotheses/${id}/notes/${noteId}`, { method: "DELETE" });
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, notes: item.notes.filter((row) => row.id !== noteId) } : item)));
  };

  const deleteHypothesis = async (id: string) => {
    if (!confirm("Удалить гипотезу и журнал проверок?")) return;
    await fetchJson(`/api/v2/personal/hypotheses/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((item) => item.id !== id));
    setOpenId(null);
  };

  const visible = useMemo(
    () => (statusFilter === "all" ? items : items.filter((item) => item.status === statusFilter)),
    [items, statusFilter],
  );
  const canReorder = statusFilter === "all" && !loading;
  const open = items.find((item) => item.id === openId) ?? null;
  const active = items.find((item) => item.id === activeId) ?? null;

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    for (const status of HYPOTHESIS_STATUSES) counts[status] = items.filter((item) => item.status === status).length;
    return counts;
  }, [items]);

  const journal = useMemo(() => {
    const counts = outcomeCounts(items.flatMap((item) => item.notes));
    return { ...counts, total: items.reduce((sum, item) => sum + item.notes.length, 0) };
  }, [items]);

  const grouped = (priority: HypothesisPriority) =>
    visible
      .filter((item) => item.priority === priority)
      .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-24 pt-6">
      <div className="mx-auto max-w-[980px]">
        <div className="mb-6 max-w-[68ch]">
          <h1 className="v2-tighter text-[42px] font-semibold leading-[1.02] text-[var(--v2-ink-900)]">Банк гипотез</h1>
          <p className="v2-tight mt-2.5 text-[14.5px] text-[var(--v2-ink-500)]" style={{ textWrap: "pretty" }}>
            Каждая карточка — одна проверка. Зайди внутрь и запиши, что тестировал, что зашло и что нет.
          </p>
        </div>

        {error ? (
          <div className="v2-tight mb-4 flex items-center gap-3 rounded-xl bg-rose-50 px-4 py-2.5 text-[13px] text-rose-800">
            <span className="flex-1">{error}</span>
            <button type="button" className="font-semibold underline" onClick={() => void load()}>
              Повторить
            </button>
          </div>
        ) : null}

        <form
          className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-white p-2 pl-4 shadow-[var(--v2-shadow-card)]"
          onSubmit={(event) => {
            event.preventDefault();
            void addHypothesis();
          }}
        >
          <V2Icons.plus className="h-4 w-4 shrink-0 text-[var(--v2-ink-400)]" />
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Новая гипотеза…  или  Направление — формулировка"
            className="v2-tight h-10 min-w-[220px] flex-1 bg-transparent text-[14.5px] text-[var(--v2-ink-900)] outline-none placeholder:text-[var(--v2-ink-400)]"
          />
          <div className="flex items-center gap-1">
            {HYPOTHESIS_PRIORITIES.map((priority) => {
              const meta = PRIORITY_META[priority];
              const activeChip = draftPriority === priority;
              return (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setDraftPriority(priority)}
                  className="v2-tight h-8 rounded-lg px-2.5 text-[12px] font-semibold"
                  style={{
                    background: activeChip ? meta.soft : "transparent",
                    color: activeChip ? meta.ink : "var(--v2-ink-400)",
                  }}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
          <button
            type="submit"
            disabled={!draft.trim() || adding}
            className="v2-tight inline-flex h-10 items-center rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-medium text-white transition hover:bg-[var(--v2-ink-700)] disabled:opacity-40"
          >
            {adding ? "Добавляю…" : "Добавить"}
          </button>
        </form>
        <p className="v2-tight mb-5 px-1 text-[12px] text-[var(--v2-ink-400)]">
          Enter добавляет карточку. Перетащи её, чтобы сменить порядок или переложить в другой приоритет.
        </p>

        <div className="mb-5 flex flex-wrap items-center gap-1.5">
          <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")} label="Все" count={statusCounts.all ?? 0} />
          {HYPOTHESIS_STATUSES.map((status) => (
            <FilterChip
              key={status}
              active={statusFilter === status}
              onClick={() => setStatusFilter(status)}
              label={HYPOTHESIS_STATUS_META[status].label}
              count={statusCounts[status] ?? 0}
            />
          ))}
          <span className="v2-tight ml-auto text-[12.5px] text-[var(--v2-ink-500)]">
            В журнале {journal.total}
            {journal.total ? ` · зашло ${journal.worked} · не зашло ${journal.missed}` : ""}
          </span>
        </div>

        {!canReorder && !loading ? (
          <p className="v2-tight mb-3 px-1 text-[12.5px] text-[var(--v2-ink-400)]">
            Порядок меняется, когда выбраны все статусы.
          </p>
        ) : null}

        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="h-28 animate-pulse rounded-2xl bg-white/70" />
            <div className="h-28 animate-pulse rounded-2xl bg-white/70" />
            <div className="h-28 animate-pulse rounded-2xl bg-white/70" />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={collision}
            onDragStart={onDragStart}
            onDragCancel={() => setActiveId(null)}
            onDragEnd={onDragEnd}
          >
            <div className="flex flex-col gap-4">
              {HYPOTHESIS_PRIORITIES.map((priority) => (
                <PriorityLane
                  key={priority}
                  priority={priority}
                  hypotheses={grouped(priority)}
                  canReorder={canReorder}
                  flashId={flashId}
                  onOpen={setOpenId}
                  suppressRef={suppressRef}
                />
              ))}
            </div>
            <DragOverlay>
              {active ? <HypothesisGhost hypothesis={active} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {open ? (
        <HypothesisDrawer
          key={open.id}
          item={open}
          onClose={() => setOpenId(null)}
          onPatch={patchHypothesis}
          onCreateNote={createNote}
          onUpdateNote={updateNote}
          onDeleteNote={deleteNote}
          onDelete={deleteHypothesis}
        />
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`v2-tight inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium transition ${
        active
          ? "bg-[var(--v2-ink-900)] text-white"
          : "bg-white text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-card)] hover:text-[var(--v2-ink-900)]"
      }`}
    >
      {label}
      <span className={`v2-tnum ${active ? "text-white/60" : "text-[var(--v2-ink-400)]"}`}>{count}</span>
    </button>
  );
}
