"use client";

import Image from "next/image";
import { useState } from "react";
import {
  weekFocusHeading,
  weekFocusOffsetLabel,
} from "@/lib/v2/personal/week-focus-client-utils";
import { useWeekFocus, type WeekFocusGoal } from "@/components/v2/personal/week-focus/use-week-focus";

const HERO_BLUE = "#2d5eef";

function FocusEditForm({
  initialTitle,
  initialNote,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialTitle: string;
  initialNote: string;
  submitLabel: string;
  onSubmit: (title: string, note: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [note, setNote] = useState(initialNote);

  return (
    <form
      className="mt-2 flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const t = title.trim();
        if (!t) return;
        onSubmit(t, note.trim());
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Фокус недели"
        className="v2-tight h-11 rounded-xl border-[1.5px] border-[var(--v2-ink-200)] bg-white px-3.5 text-[15px] outline-none focus:border-[var(--v2-brand-500)]"
        autoFocus
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Уточнение (необязательно)"
        className="v2-tight h-10 rounded-xl border-[1.5px] border-[var(--v2-ink-200)] bg-white px-3.5 text-[14px] outline-none focus:border-[var(--v2-brand-500)]"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!title.trim()}
          className="v2-tight h-10 rounded-xl bg-[var(--v2-brand-600)] px-4 text-[14px] font-semibold text-white disabled:opacity-45"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="v2-tight h-10 rounded-xl px-3 text-[14px] text-[var(--v2-ink-500)] hover:text-[var(--v2-ink-900)]"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}

function FocusSlot({
  slot,
  label,
  goal,
  variant,
  onAdd,
  onEdit,
  onToggle,
  onRemove,
}: {
  slot: 0 | 1;
  label: string;
  goal: WeekFocusGoal | null;
  variant: "hero" | "card";
  onAdd: (title: string, note: string) => void;
  onEdit: (goalId: string, title: string, note: string) => void;
  onToggle: (goal: WeekFocusGoal) => void;
  onRemove: (goalId: string) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "add">("view");
  const done = Boolean(goal?.completed_at);
  const isMain = slot === 0;

  if (mode === "add" || (mode === "edit" && goal)) {
    return (
      <div
        className={`rounded-2xl px-5 py-4 ${
          variant === "hero"
            ? isMain
              ? "text-white"
              : "border border-white/20 bg-white/10 text-white backdrop-blur-sm"
            : "border-[1.5px] border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)]"
        }`}
        style={
          variant === "hero" && isMain
            ? { background: HERO_BLUE, boxShadow: "0 12px 32px -16px rgba(45,94,239,0.75)" }
            : undefined
        }
      >
        <span
          className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
            variant === "hero" ? "text-white/65" : "text-[var(--v2-ink-500)]"
          }`}
        >
          {label}
        </span>
        <FocusEditForm
          initialTitle={mode === "edit" && goal ? goal.title : ""}
          initialNote={mode === "edit" && goal ? goal.note : ""}
          submitLabel={mode === "edit" ? "Сохранить" : "Назначить"}
          onSubmit={(title, note) => {
            if (mode === "edit" && goal) onEdit(goal.id, title, note);
            else onAdd(title, note);
            setMode("view");
          }}
          onCancel={() => setMode("view")}
        />
      </div>
    );
  }

  if (!goal) {
    return (
      <div
        className={`rounded-2xl px-5 py-5 ${
          variant === "hero"
            ? isMain
              ? "border border-dashed border-white/35 bg-white/8 text-white"
              : "border border-dashed border-white/25 bg-white/5 text-white/90"
            : "border-[1.5px] border-dashed border-[var(--v2-ink-200)] bg-white"
        }`}
      >
        <span
          className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
            variant === "hero" ? "text-white/60" : "text-[var(--v2-ink-500)]"
          }`}
        >
          {label}
        </span>
        <p
          className={`v2-tight mt-2 text-[14.5px] leading-snug ${
            variant === "hero" ? "text-white/75" : "text-[var(--v2-ink-500)]"
          }`}
        >
          {isMain
            ? "Основной фокус не выбран. Назначь его сам или из задачи ниже."
            : "Не обязателен. Добавь, если основной точно закроется."}
        </p>
        <button
          type="button"
          onClick={() => setMode("add")}
          className={`v2-tight mt-3 inline-flex h-10 items-center rounded-xl px-4 text-[14px] font-semibold transition ${
            variant === "hero"
              ? isMain
                ? "bg-white text-[var(--v2-brand-700)] hover:bg-white/92"
                : "border border-white/30 bg-white/10 text-white hover:bg-white/18"
              : "bg-[var(--v2-brand-600)] text-white hover:bg-[var(--v2-brand-700)]"
          }`}
        >
          + {isMain ? "Назначить фокус" : "Добавить второй"}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group relative rounded-2xl px-5 py-[18px] transition ${
        variant === "hero"
          ? done
            ? "bg-[#1a3fb8] text-white"
            : isMain
              ? "text-white"
              : "border border-white/20 bg-white/10 text-white backdrop-blur-sm"
          : done
            ? "bg-[#2d5eef] text-white shadow-[0_10px_26px_-14px_rgba(45,94,239,0.7)]"
            : isMain
              ? "bg-[var(--v2-brand-50)]"
              : "border-[1.5px] border-[var(--v2-ink-200)] bg-white"
      }`}
      style={
        variant === "hero" && isMain && !done
          ? { background: HERO_BLUE, boxShadow: "0 12px 32px -16px rgba(45,94,239,0.75)" }
          : undefined
      }
    >
      <span
        className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
          variant === "hero" || done ? "text-white/65" : "text-[var(--v2-ink-500)]"
        }`}
      >
        {label}
      </span>
      <p
        className={`v2-tight mt-1.5 text-[17px] font-semibold leading-snug tracking-[-0.018em] ${
          variant === "hero" || done ? "text-white" : "text-[var(--v2-ink-900)]"
        } ${done ? "line-through opacity-85" : ""}`}
      >
        {goal.title}
      </p>
      {goal.note ? (
        <p
          className={`v2-tight mt-1 text-[13.5px] ${
            variant === "hero" || done ? "text-white/70" : "text-[var(--v2-ink-500)]"
          }`}
        >
          {goal.note}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onToggle(goal)}
          className={`v2-tight rounded-lg px-2.5 py-1 text-[12.5px] font-medium transition ${
            variant === "hero" || done
              ? "bg-white/15 text-white hover:bg-white/25"
              : "bg-[var(--v2-ink-100)] text-[var(--v2-ink-700)] hover:bg-[var(--v2-ink-200)]"
          }`}
        >
          {done ? "✓ сделан" : "✓ Сделан"}
        </button>
        <button
          type="button"
          onClick={() => setMode("edit")}
          className={`v2-tight rounded-lg px-2.5 py-1 text-[12.5px] font-medium transition ${
            variant === "hero" || done
              ? "bg-white/15 text-white hover:bg-white/25"
              : "bg-[var(--v2-ink-100)] text-[var(--v2-ink-700)] hover:bg-[var(--v2-ink-200)]"
          }`}
        >
          ✎ Изменить
        </button>
        <button
          type="button"
          onClick={() => void onRemove(goal.id)}
          className={`v2-tight rounded-lg px-2.5 py-1 text-[12.5px] font-medium transition ${
            variant === "hero" || done
              ? "bg-white/15 text-white hover:bg-white/25"
              : "bg-[var(--v2-ink-100)] text-[var(--v2-ink-700)] hover:bg-[var(--v2-ink-200)]"
          }`}
        >
          Снять
        </button>
      </div>
    </div>
  );
}

export function WeekFocusSection({
  variant,
  weekOffset,
  onWeekOffsetChange,
  weekFocusHook,
}: {
  variant: "hero" | "card";
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
  weekFocusHook?: ReturnType<typeof useWeekFocus>;
}) {
  const internal = useWeekFocus(weekOffset);
  const hook = weekFocusHook ?? internal;
  const { focus, error, goalBySlot, upsertSlot, toggleDone, updateGoal, removeGoal, isCurrentWeek } = hook;
  const badge = weekFocusOffsetLabel(weekOffset);
  const heading = weekFocusHeading(weekOffset, focus?.label ?? "");

  const nav = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={weekOffset <= -12}
        onClick={() => onWeekOffsetChange(weekOffset - 1)}
        className={`inline-flex h-[38px] w-[38px] items-center justify-center rounded-xl border-[1.5px] text-[16px] transition disabled:opacity-35 ${
          variant === "hero"
            ? "border-white/30 bg-white/10 text-white hover:bg-white/18"
            : "border-[var(--v2-ink-200)] bg-white text-[var(--v2-ink-600)] hover:border-[var(--v2-brand-500)] hover:text-[var(--v2-brand-600)]"
        }`}
        title="Прошлая неделя"
      >
        ‹
      </button>
      <span
        className={`v2-tnum min-w-[170px] text-center text-[16px] font-semibold tracking-[-0.02em] ${
          variant === "hero" ? "text-white" : "text-[var(--v2-ink-900)]"
        }`}
      >
        {focus?.label ?? "…"}
      </span>
      <button
        type="button"
        disabled={weekOffset >= 12}
        onClick={() => onWeekOffsetChange(weekOffset + 1)}
        className={`inline-flex h-[38px] w-[38px] items-center justify-center rounded-xl border-[1.5px] text-[16px] transition disabled:opacity-35 ${
          variant === "hero"
            ? "border-white/30 bg-white/10 text-white hover:bg-white/18"
            : "border-[var(--v2-ink-200)] bg-white text-[var(--v2-ink-600)] hover:border-[var(--v2-brand-500)] hover:text-[var(--v2-brand-600)]"
        }`}
        title="Следующая неделя"
      >
        ›
      </button>
    </div>
  );

  const slots = (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {([0, 1] as const).map((slot) => (
        <FocusSlot
          key={slot}
          slot={slot}
          label={slot === 0 ? "Основной фокус" : "Дополнительный"}
          goal={goalBySlot(slot)}
          variant={variant}
          onAdd={(title, note) => void upsertSlot(slot, title, note)}
          onEdit={(id, title, note) => void updateGoal(id, { title, note })}
          onToggle={(g) => void toggleDone(g)}
          onRemove={(id) => void removeGoal(id)}
        />
      ))}
    </div>
  );

  if (variant === "hero") {
    return (
      <section className="relative overflow-hidden rounded-[20px] bg-[#1e4fd4] text-white">
        <div className="relative z-[1] grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
          <div className="px-7 py-7 lg:px-8 lg:py-8">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-white/55">
                Фокус недели
              </span>
              <span
                className="rounded-[7px] px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em]"
                style={{
                  background: isCurrentWeek ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
                  color: isCurrentWeek ? "#fff" : "rgba(255,255,255,0.65)",
                }}
              >
                {badge}
              </span>
              <div className="ml-auto">{nav}</div>
            </div>
            <h1 className="v2-tight mb-5 text-[34px] font-semibold leading-[1.08] tracking-[-0.032em] text-white">
              {heading}
            </h1>
            {error ? <p className="v2-tight mb-3 text-[13px] text-red-200">{error}</p> : null}
            {slots}
          </div>
          <div className="relative hidden min-h-[280px] lg:block">
            <Image
              src="/tasks-ideas/hero.png"
              alt=""
              fill
              className="object-cover object-right"
              sizes="420px"
              priority
            />
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#1e4fd4] to-transparent" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="v2-card px-7 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="v2-tight text-[24px] font-semibold tracking-[-0.028em] text-[var(--v2-ink-900)]">
          Фокус недели
        </h2>
        <span
          className="rounded-[7px] px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em]"
          style={{
            background: isCurrentWeek ? "var(--v2-brand-50)" : "var(--v2-ink-100)",
            color: isCurrentWeek ? "var(--v2-brand-700)" : "var(--v2-ink-500)",
          }}
        >
          {badge}
        </span>
        <div className="ml-auto">{nav}</div>
      </div>
      {error ? <p className="v2-tight mb-3 text-[13px] text-red-600">{error}</p> : null}
      {slots}
    </section>
  );
}
