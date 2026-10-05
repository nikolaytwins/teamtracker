"use client";

import "./plan-schedule-design.css";
import {
  createPlanItemApi,
  deletePlanItemApi,
  updatePlanItemApi,
} from "@/lib/v2/agency/plan/plan-api-client";
import {
  modeCssClass,
  normalizePlanWorkStatus,
  parseChecklistDrag,
  PLAN_CHECKLIST_MIME,
  PLAN_WORK_STATUS_UI,
  PLAN_WORK_STATUSES,
  workStatusWrite,
  type WeekChecklistId,
} from "@/lib/v2/agency/plan/plan-calendar-logic";
import type { PlanDayMode, PlanItemRow, PlanWorkStatus } from "@/lib/v2/agency/plan/plan-types";
import { addDays, toYmd } from "@/lib/v2/agency/plan/plan-utils";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";

const WD = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
const MON = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];
const VKEY = "tt-plan-schedule-view";

function Icon({
  name,
  className = "svgi",
}: {
  name: "check" | "star" | "next" | "del" | "plus";
  className?: string;
}) {
  const fillStar = name === "star";
  return (
    <svg
      className={`${className}${fillStar ? " svgi--fill" : ""}`}
      viewBox="0 0 24 24"
      aria-hidden
    >
      {name === "check" ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : null}
      {name === "star" ? (
        <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
      ) : null}
      {name === "next" ? (
        <>
          <path d="M5 12h13" />
          <path d="M13 6l6 6-6 6" />
        </>
      ) : null}
      {name === "del" ? (
        <>
          <path d="M5 7h14" />
          <path d="M10 7V5h4v2" />
          <path d="M7 7l1 12h8l1-12" />
        </>
      ) : null}
      {name === "plus" ? (
        <>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </>
      ) : null}
    </svg>
  );
}

type SchKind = "task" | "event" | "prio";

function itemKind(item: PlanItemRow): SchKind {
  if (item.kind === "call" || item.kind === "personal") return "event";
  if (item.priority === 1) return "prio";
  return "task";
}

function fmtText(t: string) {
  const m = t.match(/^(.{6,}?[.!?»])\s+([\s\S]+)$/);
  if (m && t.length > 56) {
    return (
      <>
        {m[1]} <span className="more">{m[2]}</span>
      </>
    );
  }
  return t;
}

function dm(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  return `${dt.getDate()} ${MON[dt.getMonth()]}`;
}

function normTime(v: string) {
  const m = v.trim().match(/^(\d{1,2})(?:[:.\s](\d{2}))?$/);
  if (!m) return "";
  const h = +m[1]!;
  const mi = +(m[2] || 0);
  if (h > 23 || mi > 59) return "";
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

/** `14:00 встреча` / `14 встреча` / `14-16 работа` / `14:00–16:30 созвон` */
function parseComposeTime(raw: string): {
  title: string;
  time: string;
  endTime: string;
  asEvent: boolean;
} {
  const v = raw.trim();
  const range = v.match(
    /^(\d{1,2}(?:[:.]\d{2})?)\s*[-–—]\s*(\d{1,2}(?:[:.]\d{2})?)\s+(.+)$/
  );
  if (range) {
    const time = normTime(range[1]!);
    const endTime = normTime(range[2]!);
    if (time && endTime) {
      return { title: range[3]!.trim(), time, endTime, asEvent: true };
    }
  }
  const single = v.match(/^(\d{1,2}(?:[:.]\d{2})?)\s+(.+)$/);
  if (single) {
    const time = normTime(single[1]!);
    if (time) return { title: single[2]!.trim(), time, endTime: "", asEvent: true };
  }
  return { title: v, time: "", endTime: "", asEvent: false };
}

function eventTimeLabel(item: PlanItemRow) {
  const start = item.event_time?.trim() || "";
  const dur = item.duration_label?.trim() || "";
  if (dur.includes("–") || dur.includes("-")) return dur;
  if (start && /^\d{1,2}:\d{2}$/.test(dur)) return `${start}–${dur}`;
  return start || "днём";
}

/** Поле «время»: `14`, `14:00`, `14-16`, `14:00–16:30` */
function parseTimeField(raw: string): { time: string; endTime: string } {
  const v = raw.trim();
  if (!v) return { time: "", endTime: "" };
  const range = v.match(/^(\d{1,2}(?:[:.]\d{2})?)\s*[-–—]\s*(\d{1,2}(?:[:.]\d{2})?)$/);
  if (range) {
    const time = normTime(range[1]!);
    const endTime = normTime(range[2]!);
    if (time && endTime) return { time, endTime };
  }
  return { time: normTime(v), endTime: "" };
}

function dayList(todayKey: string, items: PlanItemRow[]) {
  const lastItem = items.reduce((m, i) => (i.plan_date && i.plan_date > m ? i.plan_date : m), "");
  const last = lastItem && lastItem > addDaysIso(todayKey, 20) ? lastItem : addDaysIso(todayKey, 20);
  const out: string[] = [];
  for (let s = addDaysIso(todayKey, -1); s <= last; s = addDaysIso(s, 1)) out.push(s);
  return out;
}

function addDaysIso(s: string, n: number) {
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  dt.setDate(dt.getDate() + n);
  return toYmd(dt);
}

export function PlanScheduleBoard({
  items,
  todayKey,
  modes,
  onChanged,
  onToast,
  externalDragKind,
  onExternalDrop,
}: {
  items: PlanItemRow[];
  todayKey: string;
  modes?: Map<string, PlanDayMode>;
  onChanged: () => Promise<void>;
  onToast: (msg: string, undo?: () => void) => void;
  externalDragKind?: "checklist" | "mark" | "new" | "move" | "backlog" | "kanban" | null;
  onExternalDrop?: (day: string, payload?: { kind: "checklist"; id: WeekChecklistId }) => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(4);
  const [draft, setDraft] = useState<Record<string, SchKind>>({});
  const [compose, setCompose] = useState<Record<string, string>>({});
  const [eventTime, setEventTime] = useState<Record<string, string>>({});
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [rangeLabel, setRangeLabel] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropDay, setDropDay] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);
  const undoSnap = useRef<PlanItemRow[] | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const focusCompose = useCallback((day: string) => {
    setOpenDay(day);
    requestAnimationFrame(() => {
      inputRefs.current[day]?.focus();
    });
  }, []);

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(VKEY) || "{}") as { cols?: number };
      if (v.cols === 3 || v.cols === 4 || v.cols === 5) setCols(v.cols);
    } catch {
      /* ignore */
    }
  }, []);

  const days = useMemo(() => dayList(todayKey, items), [todayKey, items]);

  const byDay = useMemo(() => {
    const map = new Map<string, PlanItemRow[]>();
    for (const it of items) {
      if (!it.plan_date) continue;
      const list = map.get(it.plan_date) ?? [];
      list.push(it);
      map.set(it.plan_date, list);
    }
    return map;
  }, [items]);

  const colW = useCallback(() => {
    const c = boardRef.current?.querySelector(".col") as HTMLElement | null;
    return c ? c.offsetWidth + 14 : 300;
  }, []);

  const updRange = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const colsEl = [...board.querySelectorAll<HTMLElement>(".col")];
    if (!colsEl.length) return;
    const i = Math.round(board.scrollLeft / colW());
    const a = colsEl[i];
    const b = colsEl[Math.min(colsEl.length - 1, i + cols - 1)];
    if (!a || !b) return;
    const da = new Date(a.dataset.day + "T12:00:00");
    const db = new Date(b.dataset.day + "T12:00:00");
    if (da.getMonth() === db.getMonth()) {
      setRangeLabel(`${da.getDate()}–${db.getDate()} ${MON[db.getMonth()]} ${db.getFullYear()}`);
    } else {
      setRangeLabel(`${dm(a.dataset.day!)} – ${dm(b.dataset.day!)}`);
    }
  }, [colW, cols]);

  const goToday = useCallback(
    (smooth: boolean) => {
      const board = boardRef.current;
      const el = board?.querySelector(`.col[data-day="${todayKey}"]`) as HTMLElement | null;
      if (!board || !el) return;
      board.style.scrollBehavior = smooth ? "smooth" : "auto";
      board.scrollLeft = el.offsetLeft - board.offsetLeft - 4;
      board.style.scrollBehavior = "";
      requestAnimationFrame(updRange);
    },
    [todayKey, updRange]
  );

  useEffect(() => {
    const board = boardRef.current;
    if (board) board.style.setProperty("--cols", String(cols));
    localStorage.setItem(VKEY, JSON.stringify({ cols }));
    updRange();
  }, [cols, updRange, days.length]);

  useEffect(() => {
    goToday(false);
  }, [goToday]);

  const run = async (action: () => Promise<unknown>, msg: string, snap?: PlanItemRow[]) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      await onChanged();
      if (snap) {
        undoSnap.current = snap;
        onToast(msg, () => {
          /* parent reload is source of truth — toast undo just notifies */
          onToast("Обновите страницу, если нужно откатить");
        });
      } else onToast(msg);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка");
      await onChanged().catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const submit = async (day: string) => {
    let v = (compose[day] || "").trim();
    if (!v) return;
    let kind = draft[day] || "task";
    let time = "";
    let endTime = "";
    const parsed = parseComposeTime(v);
    if (parsed.asEvent && parsed.title) {
      kind = "event";
      time = parsed.time;
      endTime = parsed.endTime;
      v = parsed.title;
    } else if (v.startsWith("!")) {
      kind = "prio";
      v = v.slice(1).trim();
    }
    if (kind === "event" && !time) {
      const fromField = parseTimeField(eventTime[day] || "");
      time = fromField.time;
      endTime = fromField.endTime;
    }
    if (!v) return;
    setCompose((c) => ({ ...c, [day]: "" }));
    setEventTime((t) => ({ ...t, [day]: "" }));
    setOpenDay(null);
    await run(async () => {
      if (kind === "event") {
        await createPlanItemApi({
          kind: "call",
          title: v,
          plan_date: day,
          event_time: time || null,
          duration_label: endTime ? `${time}–${endTime}` : null,
          priority: 2,
        });
      } else if (kind === "prio") {
        await createPlanItemApi({ kind: "task", title: v, plan_date: day, priority: 1 });
      } else {
        await createPlanItemApi({ kind: "task", title: v, plan_date: day, priority: 3 });
      }
    }, "Добавлено");
  };

  const patchStatus = (item: PlanItemRow, status: PlanWorkStatus) =>
    run(
      () => updatePlanItemApi(item.id, workStatusWrite(status, item.completed_at)),
      status === "done" ? "Готово" : status === "doing" ? "В работе" : "К выполнению"
    );

  const toggleDone = (item: PlanItemRow) => patchStatus(item, item.completed_at ? "todo" : "done");

  const onDrop = async (day: string, e?: DragEvent) => {
    const checklistId = parseChecklistDrag(
      e?.dataTransfer.getData(PLAN_CHECKLIST_MIME) || e?.dataTransfer.getData("text/plain")
    );
    if (
      checklistId ||
      externalDragKind === "checklist" ||
      externalDragKind === "mark" ||
      externalDragKind === "new" ||
      externalDragKind === "move" ||
      externalDragKind === "backlog"
    ) {
      setDropDay(null);
      onExternalDrop?.(day, checklistId ? { kind: "checklist", id: checklistId } : undefined);
      return;
    }
    if (!dragId) return;
    const it = items.find((i) => i.id === dragId);
    setDragId(null);
    setDropDay(null);
    if (!it || it.plan_date === day) return;
    await run(() => updatePlanItemApi(it.id, { plan_date: day }), `Перенесено на ${dm(day)}`);
  };

  return (
    <div className="plan-sch">
      <div className="bar">
        <div className="bar-t" id="range">
          {rangeLabel.split(" ").length > 1 ? (
            <>
              {rangeLabel.replace(/\s+\d{4}$/, "")} <span>{rangeLabel.match(/\d{4}$/)?.[0]}</span>
            </>
          ) : (
            rangeLabel
          )}
        </div>
        <div className="seg" id="cols">
          {([3, 4, 5] as const).map((n) => (
            <button
              key={n}
              type="button"
              data-c={n}
              className={cols === n ? "on" : ""}
              onClick={() => setCols(n)}
            >
              {n === 3 ? "3 дня" : n === 4 ? "4 дня" : "5 дней"}
            </button>
          ))}
        </div>
        <div className="nav">
          <button
            type="button"
            className="nb"
            aria-label="Назад"
            onClick={() => boardRef.current?.scrollBy({ left: -colW(), behavior: "smooth" })}
          >
            <svg className="svgi" viewBox="0 0 24 24">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button type="button" className="nb" onClick={() => goToday(true)}>
            Сегодня
          </button>
          <button
            type="button"
            className="nb"
            aria-label="Вперёд"
            onClick={() => boardRef.current?.scrollBy({ left: colW(), behavior: "smooth" })}
          >
            <svg className="svgi" viewBox="0 0 24 24">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className="board"
        ref={boardRef}
        onScroll={() => updRange()}
        onDragOver={(e) => {
          const c = (e.target as HTMLElement).closest(".col") as HTMLElement | null;
          if (!c) return;
          const types = Array.from(e.dataTransfer.types);
          const fromHint =
            types.includes(PLAN_CHECKLIST_MIME) ||
            types.includes("text/plain") ||
            Boolean(externalDragKind);
          if (!dragId && !fromHint) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = dragId ? "move" : "copy";
          setDropDay(c.dataset.day || null);
          const r = boardRef.current!.getBoundingClientRect();
          if (e.clientX > r.right - 60) boardRef.current!.scrollLeft += 12;
          if (e.clientX < r.left + 60) boardRef.current!.scrollLeft -= 12;
        }}
      >
        {days.map((d) => {
          const dt = new Date(d + "T12:00:00");
          const list = byDay.get(d) ?? [];
          const pr = list.filter((i) => itemKind(i) === "prio");
          const ev = list
            .filter((i) => itemKind(i) === "event")
            .sort((a, b) => (a.event_time || "99").localeCompare(b.event_time || "99"));
          const tk = list
            .filter((i) => itemKind(i) === "task")
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id.localeCompare(b.id));
          const wk = dt.getDay() % 6 === 0;
          const k = draft[d] || "task";
          const empty = !pr.length && !ev.length && !tk.length;
          const dayMode = modes?.get(d) ?? null;
          const modeCls = modeCssClass(dayMode);
          const modeLabel =
            dayMode === "strategy" ? "Стратегия" : dayMode === "creative" ? "Творческий" : dayMode === "rest" ? "Выходной" : "";

          return (
            <section
              key={d}
              className={`col${wk ? " wknd" : ""}${d === todayKey ? " today" : ""}${d < todayKey ? " past" : ""}${dropDay === d ? " drop" : ""}${modeCls ? ` mode-${modeCls}` : ""}`}
              data-day={d}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void onDrop(d, e);
              }}
            >
              <div
                className="ch"
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest(".ch-add")) return;
                  focusCompose(d);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    focusCompose(d);
                  }
                }}
              >
                <span className="ch-n">{dt.getDate()}</span>
                <span className="ch-m">
                  <span className="ch-w">{WD[dt.getDay()]}</span>
                  <span className="ch-mo">{MON[dt.getMonth()]}</span>
                  {modeLabel ? <span className={`ch-mode ch-mode--${modeCls}`}>{modeLabel}</span> : null}
                </span>
                <span className="ch-sp" />
                <button
                  type="button"
                  className="ch-add"
                  data-add={d}
                  title="Добавить"
                  aria-label="Добавить"
                  onClick={(e) => {
                    e.stopPropagation();
                    focusCompose(d);
                  }}
                >
                  <Icon name="plus" />
                </button>
              </div>

              <div
                className="cb"
                onClick={(e) => {
                  const t = e.target as HTMLElement;
                  if (t.closest(".it") || t.closest(".gl") || t.closest("button")) return;
                  focusCompose(d);
                }}
              >
                {pr.length ? (
                  <div className="grp">
                    {pr.map((i) => (
                      <ItemCard
                        key={i.id}
                        item={i}
                        kind="prio"
                        editing={editingId === i.id}
                        editText={editText}
                        onEditStart={() => {
                          setEditingId(i.id);
                          setEditText(i.title);
                        }}
                        onEditChange={setEditText}
                        onEditCancel={() => setEditingId(null)}
                        onEditSave={async (text) => {
                          setEditingId(null);
                          if (text && text !== i.title) {
                            await run(() => updatePlanItemApi(i.id, { title: text }), "Сохранено");
                          }
                        }}
                        onDragStart={() => setDragId(i.id)}
                        onDragEnd={() => {
                          setDragId(null);
                          setDropDay(null);
                        }}
                        onDone={() => void toggleDone(i)}
                        onStatus={(status) => void patchStatus(i, status)}
                        onNext={() =>
                          run(
                            () => updatePlanItemApi(i.id, { plan_date: addDaysIso(d, 1), completed_at: null }),
                            `Перенесено на ${dm(addDaysIso(d, 1))}`
                          )
                        }
                        onDel={() => run(() => deletePlanItemApi(i.id), "Удалено")}
                        onTogglePrio={() =>
                          run(
                            () => updatePlanItemApi(i.id, { priority: 3 }),
                            "Убрано из главного"
                          )
                        }
                      />
                    ))}
                  </div>
                ) : null}
                {ev.length ? (
                  <div className="grp">
                    <div className="gl">События</div>
                    {ev.map((i) => (
                      <ItemCard
                        key={i.id}
                        item={i}
                        kind="event"
                        editing={editingId === i.id}
                        editText={editText}
                        onEditStart={() => {
                          setEditingId(i.id);
                          setEditText(i.title);
                        }}
                        onEditChange={setEditText}
                        onEditCancel={() => setEditingId(null)}
                        onEditSave={async (text) => {
                          setEditingId(null);
                          if (!text) return;
                          const parsed = parseComposeTime(text);
                          await run(
                            () =>
                              updatePlanItemApi(i.id, {
                                title: parsed.asEvent ? parsed.title : text,
                                event_time: parsed.asEvent ? parsed.time : i.event_time,
                                duration_label: parsed.asEvent
                                  ? parsed.endTime
                                    ? `${parsed.time}–${parsed.endTime}`
                                    : null
                                  : i.duration_label,
                              }),
                            "Сохранено"
                          );
                        }}
                        onDragStart={() => setDragId(i.id)}
                        onDragEnd={() => {
                          setDragId(null);
                          setDropDay(null);
                        }}
                        onDone={() => void toggleDone(i)}
                        onNext={() =>
                          run(
                            () => updatePlanItemApi(i.id, { plan_date: addDaysIso(d, 1), completed_at: null }),
                            `Перенесено на ${dm(addDaysIso(d, 1))}`
                          )
                        }
                        onDel={() => run(() => deletePlanItemApi(i.id), "Удалено")}
                      />
                    ))}
                  </div>
                ) : null}
                {tk.length ? (
                  <div className="grp">
                    <div className="gl">Задачи</div>
                    {tk.map((i) => (
                      <ItemCard
                        key={i.id}
                        item={i}
                        kind="task"
                        editing={editingId === i.id}
                        editText={editText}
                        onEditStart={() => {
                          setEditingId(i.id);
                          setEditText(i.title);
                        }}
                        onEditChange={setEditText}
                        onEditCancel={() => setEditingId(null)}
                        onEditSave={async (text) => {
                          setEditingId(null);
                          if (text && text !== i.title) {
                            await run(() => updatePlanItemApi(i.id, { title: text }), "Сохранено");
                          }
                        }}
                        onDragStart={() => setDragId(i.id)}
                        onDragEnd={() => {
                          setDragId(null);
                          setDropDay(null);
                        }}
                        onDone={() => void toggleDone(i)}
                        onStatus={(status) => void patchStatus(i, status)}
                        onNext={() =>
                          run(
                            () => updatePlanItemApi(i.id, { plan_date: addDaysIso(d, 1), completed_at: null }),
                            `Перенесено на ${dm(addDaysIso(d, 1))}`
                          )
                        }
                        onDel={() => run(() => deletePlanItemApi(i.id), "Удалено")}
                        onTogglePrio={() =>
                          run(() => updatePlanItemApi(i.id, { priority: 1 }), "В главное")
                        }
                      />
                    ))}
                  </div>
                ) : null}
                {empty ? <div className="zero">Свободный день</div> : null}
              </div>

              <div
                className={`cmp${compose[d] || openDay === d ? " open" : ""}`}
                data-day={d}
              >
                <div className="cmp-row">
                  <Icon name="plus" />
                  <input
                    ref={(el) => {
                      inputRefs.current[d] = el;
                    }}
                    className="tx"
                    placeholder="14:00 встреча · 14–16 работа"
                    value={compose[d] || ""}
                    onFocus={() => setOpenDay(d)}
                    onBlur={() => {
                      // Дать клику по «Задача/Событие» сработать до закрытия
                      window.setTimeout(() => {
                        const active = document.activeElement;
                        const cmp = inputRefs.current[d]?.closest(".cmp");
                        if (cmp && active && cmp.contains(active)) return;
                        if (!(compose[d] || "").trim()) setOpenDay((cur) => (cur === d ? null : cur));
                      }, 0);
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCompose((c) => ({ ...c, [d]: val }));
                      if (parseComposeTime(val).asEvent) {
                        setDraft((dr) => ({ ...dr, [d]: "event" }));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void submit(d);
                      }
                      if (e.key === "Escape") {
                        setCompose((c) => ({ ...c, [d]: "" }));
                        setOpenDay(null);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                  />
                </div>
                <div className="cmp-opts">
                  {(["task", "event", "prio"] as const).map((kk) => (
                    <button
                      key={kk}
                      type="button"
                      className={`ko${k === kk ? " on" : ""}`}
                      data-k={kk}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setDraft((dr) => ({ ...dr, [d]: kk }));
                        setOpenDay(d);
                        inputRefs.current[d]?.focus();
                      }}
                    >
                      <i />
                      {kk === "task" ? "Задача" : kk === "event" ? "Событие" : "Главное"}
                    </button>
                  ))}
                  <input
                    className="tmi"
                    placeholder="14 или 14–16"
                    maxLength={11}
                    hidden={k !== "event"}
                    value={eventTime[d] || ""}
                    onFocus={() => setOpenDay(d)}
                    onChange={(e) => setEventTime((t) => ({ ...t, [d]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void submit(d);
                      }
                    }}
                  />
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ItemCard({
  item,
  kind,
  editing,
  editText,
  onEditStart,
  onEditChange,
  onEditCancel,
  onEditSave,
  onDragStart,
  onDragEnd,
  onDone,
  onStatus,
  onNext,
  onDel,
  onTogglePrio,
}: {
  item: PlanItemRow;
  kind: SchKind;
  editing: boolean;
  editText: string;
  onEditStart: () => void;
  onEditChange: (v: string) => void;
  onEditCancel: () => void;
  onEditSave: (text: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDone: () => void;
  onStatus?: (status: PlanWorkStatus) => void;
  onNext: () => void;
  onDel: () => void;
  onTogglePrio?: () => void;
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  useEffect(() => {
    if (!statusOpen) return;
    function onDoc(e: MouseEvent) {
      if (!(e.target instanceof Element) || e.target.closest(".st-wrap")) return;
      setStatusOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [statusOpen]);
  const done = !!item.completed_at;
  const status = normalizePlanWorkStatus(item.work_status, item.completed_at);
  const statusUi = PLAN_WORK_STATUS_UI[status];
  const cls =
    kind === "prio"
      ? `it pr${done ? " done" : ""}${status === "doing" && !done ? " st-doing" : ""}`
      : kind === "event"
        ? `it ev${done ? " done" : ""}`
        : `it tk${done ? " done" : ""} st-${status}`;

  return (
    <div
      className={cls}
      draggable={!editing && !statusOpen}
      onDragStart={(e) => {
        onDragStart();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", item.id);
        (e.currentTarget as HTMLElement).classList.add("dragging");
      }}
      onDragEnd={(e) => {
        (e.currentTarget as HTMLElement).classList.remove("dragging");
        onDragEnd();
      }}
    >
      {kind === "prio" ? (
        <div className="it-k">
          <button type="button" className={`ck${done ? " on" : ""}`} aria-label="Готово" onClick={() => void onDone()}>
            <Icon name="check" />
          </button>
          Главное
        </div>
      ) : null}
      {kind === "event" ? (
        <div className={`ev-tm${item.event_time || item.duration_label ? "" : " nt"}`}>
          {eventTimeLabel(item)}
        </div>
      ) : null}
      {kind === "task" ? (
        <button type="button" className={`ck${done ? " on" : ""}`} aria-label="Готово" onClick={() => void onDone()}>
          <Icon name="check" />
        </button>
      ) : null}
      <div className="it-b">
        {editing ? (
          <div
            className="it-t"
            contentEditable
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: editText.replace(/</g, "&lt;") }}
            ref={(el) => {
              if (!el || el.dataset.focused) return;
              el.dataset.focused = "1";
              el.focus();
              const r = document.createRange();
              r.selectNodeContents(el);
              r.collapse(false);
              const sel = getSelection();
              sel?.removeAllRanges();
              sel?.addRange(r);
            }}
            onBlur={(e) => {
              const cancel = e.currentTarget.dataset.cancel === "1";
              const v = e.currentTarget.textContent?.trim() || "";
              if (!cancel) onEditSave(v);
              else onEditCancel();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLElement).blur();
              }
              if (e.key === "Escape") {
                (e.target as HTMLElement).dataset.cancel = "1";
                (e.target as HTMLElement).blur();
              }
            }}
          />
        ) : (
          <div className="it-t" onClick={onEditStart}>
            {fmtText(item.title)}
          </div>
        )}
        {onStatus ? (
          <div className={`st-wrap${statusOpen ? " open" : ""}`}>
            <button
              type="button"
              className={`st st--${statusUi.css}`}
              onClick={(e) => {
                e.stopPropagation();
                setStatusOpen((v) => !v);
              }}
            >
              {statusUi.label}
            </button>
            {statusOpen ? (
              <div className="st-m" onClick={(e) => e.stopPropagation()}>
                {PLAN_WORK_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={s === status ? "on" : ""}
                    onClick={() => {
                      setStatusOpen(false);
                      onStatus(s);
                    }}
                  >
                    {PLAN_WORK_STATUS_UI[s].label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="it-a">
        {kind !== "event" ? (
          <button
            type="button"
            className="ib"
            title={kind === "prio" ? "Убрать из главного" : "Сделать главным"}
            onClick={() => onTogglePrio && void onTogglePrio()}
          >
            {kind === "prio" ? <Icon name="star" /> : <Icon name="star" />}
          </button>
        ) : (
          <button type="button" className="ib" title="Отметить" onClick={() => void onDone()}>
            <Icon name="check" />
          </button>
        )}
        <button type="button" className="ib" title="На завтра" onClick={() => void onNext()}>
          <Icon name="next" />
        </button>
        <button type="button" className="ib del" title="Удалить" onClick={() => void onDel()}>
          <Icon name="del" />
        </button>
      </div>
    </div>
  );
}
