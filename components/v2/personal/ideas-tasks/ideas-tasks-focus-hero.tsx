"use client";

import { IdeasTasksDrawer } from "@/components/v2/personal/ideas-tasks/ideas-tasks-overlay";
import type { useWeekFocus } from "@/components/v2/personal/week-focus/use-week-focus";
import type { WeekFocusGoal } from "@/components/v2/personal/week-focus/use-week-focus";
import { appPath } from "@/lib/api-url";
import { weekFocusHeading, weekFocusOffsetLabel } from "@/lib/v2/personal/week-focus-client-utils";
import { useState } from "react";

function FocusSlotBlock({
  slot,
  goal,
  onDone,
  onEdit,
  onAdd,
  onRemove,
}: {
  slot: 0 | 1;
  goal: WeekFocusGoal | null;
  onDone: () => void;
  onEdit: () => void;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const label = slot === 0 ? "Основной фокус" : "Дополнительный";
  const done = Boolean(goal?.completed_at);

  if (!goal) {
    return (
      <div className="fx fx-empty">
        <span className="fx-k">{label}</span>
        <p>
          {slot === 0
            ? "Основной фокус не выбран. Назначь его сам или из задачи ниже."
            : "Не обязателен. Добавь, если основной точно закроется."}
        </p>
        <button
          type="button"
          className={`fx-new${slot === 1 ? " fx-new--gh" : ""}`}
          onClick={onAdd}
        >
          + {slot === 0 ? "Назначить фокус" : "Добавить второй"}
        </button>
      </div>
    );
  }

  return (
    <div className={`fx ${slot === 0 ? "fx--main" : "fx--sec"}${done ? " done" : ""}`}>
      <span className="fx-k">{label}</span>
      <span className="fx-t">{goal.title}</span>
      {goal.note ? <span className="fx-n">{goal.note}</span> : null}
      <span className="fx-f">
        <button type="button" className="fx-x tip" data-tip={done ? "Снять отметку" : "Отметить выполненным"} onClick={onDone}>
          {done ? "✓ сделан" : "✓ Сделан"}
        </button>
        <button type="button" className="fx-x tip" data-tip="Редактировать фокус" onClick={onEdit}>
          ✎ Изменить
        </button>
        <button type="button" className="fx-x tip" data-tip="Убрать фокус с недели" onClick={onRemove}>
          Снять
        </button>
      </span>
    </div>
  );
}

export function IdeasTasksFocusHero({
  weekOffset,
  onWeekOffsetChange,
  weekFocus,
}: {
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
  weekFocus: ReturnType<typeof useWeekFocus>;
}) {
  const { focus, error, goalBySlot, upsertSlot, toggleDone, updateGoal, removeGoal, isCurrentWeek } = weekFocus;
  const badge = weekFocusOffsetLabel(weekOffset);
  const heading = weekFocusHeading(weekOffset, focus?.label ?? "");
  const [drawer, setDrawer] = useState<{ slot: 0 | 1; isNew: boolean } | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNote, setEditNote] = useState("");

  function openDrawer(slot: 0 | 1, isNew: boolean) {
    const goal = goalBySlot(slot);
    setEditTitle(goal?.title ?? "");
    setEditNote(goal?.note ?? "");
    setDrawer({ slot, isNew });
  }

  async function saveDrawer() {
    if (!drawer) return;
    const title = editTitle.trim();
    if (!title) {
      setDrawer(null);
      return;
    }
    const goal = goalBySlot(drawer.slot);
    if (goal) await updateGoal(goal.id, { title, note: editNote.trim() });
    else await upsertSlot(drawer.slot, title, editNote.trim());
    setDrawer(null);
  }

  return (
    <>
      <section className="card hero" data-section="focus">
        <div className="hero-l">
          <div className="hero-top">
            <span className="kick">Фокус недели</span>
            <span
              className="wk-badge"
              style={{
                background: isCurrentWeek ? "var(--brand-50)" : "var(--ink-100)",
                color: isCurrentWeek ? "var(--brand-700)" : "var(--ink-500)",
              }}
            >
              {badge}
            </span>
          </div>
          <h1 className="hero-h1">{heading}</h1>
          <div className="wk-nav">
            <button
              type="button"
              className="wk-btn tip"
              data-tip="Прошлая неделя"
              disabled={weekOffset <= -12}
              onClick={() => onWeekOffsetChange(weekOffset - 1)}
            >
              ‹
            </button>
            <span className="wk-label tnum">{focus?.label ?? "…"}</span>
            <button
              type="button"
              className="wk-btn tip"
              data-tip="Следующая неделя"
              disabled={weekOffset >= 12}
              onClick={() => onWeekOffsetChange(weekOffset + 1)}
            >
              ›
            </button>
          </div>
          <p className="hero-sub">
            Один основной фокус и, если нужно, один дополнительный. То же самое видно на главной.
          </p>
          {error ? <p style={{ fontSize: 13, color: "#b42318" }}>{error}</p> : null}
          <div className="fxs">
            {([0, 1] as const).map((slot) => {
              const goal = goalBySlot(slot);
              return (
                <FocusSlotBlock
                  key={slot}
                  slot={slot}
                  goal={goal}
                  onAdd={() => openDrawer(slot, true)}
                  onEdit={() => openDrawer(slot, false)}
                  onDone={() => goal && void toggleDone(goal)}
                  onRemove={() => goal && void removeGoal(goal.id)}
                />
              );
            })}
          </div>
        </div>
        <div className="hero-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={appPath("/tasks-ideas/hero.png")} alt="" />
        </div>
      </section>

      <IdeasTasksDrawer
        open={Boolean(drawer)}
        title={
          drawer
            ? `${drawer.slot === 0 ? "Основной фокус" : "Дополнительный фокус"} · ${focus?.label ?? ""}`
            : ""
        }
        onClose={() => setDrawer(null)}
        footer={
          <>
            <button type="button" className="btn btn--pri" onClick={() => void saveDrawer()}>
              {drawer?.isNew ? "Назначить" : "Сохранить"}
            </button>
            <button type="button" className="btn btn--gh" onClick={() => setDrawer(null)}>
              Отмена
            </button>
          </>
        }
      >
        <div className="fld">
          <label>Фокус недели</label>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Что главное на этой неделе"
            autoFocus
          />
        </div>
        <div className="fld">
          <label>Пояснение</label>
          <input
            type="text"
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="Например: курс · дедлайн 26 авг."
          />
        </div>
        <p className="dr-note">
          Фокус привязан к неделе {focus?.label ?? ""}. Можно назначать заранее — переключай недели стрелками.
        </p>
      </IdeasTasksDrawer>
    </>
  );
}
