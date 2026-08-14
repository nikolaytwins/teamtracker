"use client";

import { appPath } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { TimeDoc, TimeEntry, TimeMode, TimeProject } from "@/lib/v2/personal/seeds/time-seed";
import { V2Icons } from "@/components/v2/ui/icons";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

function IcClose(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className}>
      <path d="m6.5 6.5 11 11m0-11-11 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IcBolt(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className}>
      <path
        d="M13.5 3.5 6 13.2h4.6L10 20.5l7.6-9.8H13l.5-7.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TK({ children, cls = "text-[var(--v2-ink-400)]" }: { children: React.ReactNode; cls?: string }) {
  return (
    <span className={`font-mono text-[10.5px] uppercase tracking-[0.16em] ${cls}`}>{children}</span>
  );
}

function fmtRub(n: number) {
  return n.toLocaleString("ru") + " ₽";
}

function fmtDur(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

function parseDurInput(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  if (t.includes(":")) {
    const [h, m] = t.split(":");
    const hh = Number(h);
    const mm = Number(m);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return Math.max(0, hh * 60 + mm);
  }
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 60);
}

function monthLabel(d = new Date()) {
  return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function inCurrentMonth(iso: string, now = new Date()) {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

type MonthStats = {
  founder: number;
  reactive: number;
  interruptions: number;
  days: number;
  split: [string, number][];
};

function computeMonthStats(projectId: string, entries: TimeEntry[], fallbackSplit: [string, number][]): MonthStats {
  const pe = entries.filter((e) => e.projectId === projectId && inCurrentMonth(e.at));
  const founder = pe.reduce((s, e) => s + e.durationMin, 0) / 60;
  const reactiveEntries = pe.filter((e) => e.mode === "reactive");
  const reactive = reactiveEntries.reduce((s, e) => s + e.durationMin, 0) / 60;
  const days = new Set(reactiveEntries.map((e) => e.at.slice(0, 10))).size;
  const byAct = new Map<string, number>();
  for (const e of pe) {
    byAct.set(e.activity, (byAct.get(e.activity) ?? 0) + e.durationMin / 60);
  }
  const split: [string, number][] =
    byAct.size > 0
      ? [...byAct.entries()]
          .map(([k, v]) => [k, Math.round(v * 10) / 10] as [string, number])
          .sort((a, b) => b[1] - a[1])
      : fallbackSplit;
  return {
    founder: Math.round(founder * 10) / 10,
    reactive: Math.round(reactive * 10) / 10,
    interruptions: reactiveEntries.length,
    days,
    split,
  };
}

function TSect({
  title,
  sub,
  right,
  children,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-14">
      <div className="mb-5 flex items-end gap-5">
        <div>
          <h2 className="v2-tight text-[21px] font-medium text-[var(--v2-ink-900)]">{title}</h2>
          {sub ? (
            <p className="v2-tight mt-1.5 max-w-[74ch] text-[14px] text-[var(--v2-ink-500)]" style={{ textWrap: "pretty" }}>
              {sub}
            </p>
          ) : null}
        </div>
        {right ? <div className="ml-auto shrink-0 pb-1">{right}</div> : null}
      </div>
      {children}
    </section>
  );
}

const fieldCls =
  "mt-1.5 h-11 w-full rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3.5 text-[14.5px] text-[var(--v2-ink-900)] outline-none transition placeholder:text-[var(--v2-ink-400)] focus:border-[var(--v2-brand-400)] focus:bg-white v2-tight";
const labCls = "text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]";
const selCls =
  "h-9 cursor-pointer appearance-none rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3 text-[13px] text-[var(--v2-ink-800)] outline-none transition focus:border-[var(--v2-brand-400)] focus:bg-white v2-tight";

export function PersonalTimeClient() {
  const [doc, setDoc] = useState<TimeDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [proj, setProj] = useState("agency");
  const [manual, setManual] = useState(false);
  const [addProject, setAddProject] = useState(false);
  const [editNote, setEditNote] = useState(false);
  const [entryFilter, setEntryFilter] = useState<"all" | string>("all");
  const [timerSec, setTimerSec] = useState(0);
  const [timerProj, setTimerProj] = useState("hire");
  const [timerActivity, setTimerActivity] = useState("Strategy");
  const [timerMode, setTimerMode] = useState<TimeMode>("planned");
  const [timerTask, setTimerTask] = useState("Подготовить позиционирование");

  const saveDoc = useCallback(async (next: TimeDoc) => {
    setDoc(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetchJson<{ doc: TimeDoc }>("/api/v2/personal/life-docs/time", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc: next }),
      });
      setDoc(res.doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchJson<{ doc: TimeDoc }>("/api/v2/personal/life-docs/time");
        if (cancelled) return;
        setDoc(res.doc);
        if (res.doc.projects[0]) setProj(res.doc.projects[0].id);
        if (res.doc.running) {
          setTimerProj(res.doc.running.projectId);
          setTimerActivity(res.doc.running.activity);
          setTimerMode(res.doc.running.mode);
          setTimerTask(res.doc.running.task);
          const elapsed = Math.max(0, Math.floor((Date.now() - new Date(res.doc.running.startedAt).getTime()) / 1000));
          setTimerSec(elapsed);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const running = !!doc?.running;

  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => setTimerSec((s) => s + 1), 1000);
    return () => clearInterval(i);
  }, [running]);

  const monthEntries = useMemo(() => (doc ? doc.entries.filter((e) => inCurrentMonth(e.at)) : []), [doc]);

  const attention = useMemo(() => {
    if (!doc) return [];
    return doc.projects
      .map((p) => {
        const h = monthEntries.filter((e) => e.projectId === p.id).reduce((s, e) => s + e.durationMin, 0) / 60;
        return { id: p.id, h: Math.round(h * 10) / 10 };
      })
      .filter((a) => a.h > 0)
      .sort((a, b) => b.h - a.h);
  }, [doc, monthEntries]);

  const economics = useMemo(() => {
    if (!doc) return [];
    return doc.projects
      .filter((p) => p.money && (p.profit ?? 0) > 0)
      .map((p) => {
        const st = computeMonthStats(p.id, doc.entries, p.split);
        const per = st.founder > 0 ? Math.round((p.profit ?? 0) / st.founder) : 0;
        const reactiveShare = st.founder ? Math.round((st.reactive / st.founder) * 100) : 0;
        return {
          id: p.id,
          name: p.name,
          profit: p.profit ?? 0,
          hours: st.founder,
          per,
          reactive: reactiveShare,
        };
      });
  }, [doc]);

  const p = doc?.projects.find((x) => x.id === proj) ?? doc?.projects[0];

  const toggleTimer = async () => {
    if (!doc) return;
    if (doc.running) {
      const started = new Date(doc.running.startedAt).getTime();
      const durationMin = Math.max(1, Math.round((Date.now() - started) / 60000));
      const entry: TimeEntry = {
        id: uid("e"),
        projectId: doc.running.projectId,
        task: doc.running.task || "Сессия таймера",
        activity: doc.running.activity,
        mode: doc.running.mode,
        durationMin,
        at: new Date().toISOString(),
      };
      await saveDoc({
        ...doc,
        entries: [entry, ...doc.entries],
        running: null,
      });
      setTimerSec(0);
      return;
    }
    await saveDoc({
      ...doc,
      running: {
        projectId: timerProj,
        activity: timerActivity,
        mode: timerMode,
        startedAt: new Date().toISOString(),
        task: timerTask,
      },
    });
  };

  const addManualEntry = async (payload: {
    projectId: string;
    durationMin: number;
    activity: string;
    mode: TimeMode;
    task: string;
  }) => {
    if (!doc) return;
    const entry: TimeEntry = {
      id: uid("e"),
      projectId: payload.projectId,
      task: payload.task || "Запись времени",
      activity: payload.activity,
      mode: payload.mode,
      durationMin: payload.durationMin,
      at: new Date().toISOString(),
    };
    await saveDoc({ ...doc, entries: [entry, ...doc.entries] });
    setManual(false);
  };

  const deleteEntry = async (id: string) => {
    if (!doc) return;
    await saveDoc({ ...doc, entries: doc.entries.filter((e) => e.id !== id) });
  };

  const addProjectSubmit = async (name: string, role: string, money: boolean) => {
    if (!doc || !name.trim()) return;
    const np: TimeProject = {
      id: uid("p"),
      name: name.trim(),
      role: role.trim() || "Проект",
      money,
      revenue: money ? 0 : undefined,
      profit: money ? 0 : undefined,
      split: [],
      note: "",
    };
    await saveDoc({ ...doc, projects: [...doc.projects, np] });
    setProj(np.id);
    setAddProject(false);
  };

  const saveNote = async (note: string) => {
    if (!doc || !p) return;
    await saveDoc({
      ...doc,
      projects: doc.projects.map((x) => (x.id === p.id ? { ...x, note } : x)),
    });
    setEditNote(false);
  };

  if (!doc) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--v2-ink-500)]">
        {error ?? "Загрузка…"}
      </div>
    );
  }

  const hh = String(Math.floor(timerSec / 3600)).padStart(2, "0");
  const mm = String(Math.floor((timerSec % 3600) / 60)).padStart(2, "0");
  const ss = String(timerSec % 60).padStart(2, "0");
  const projName = (id: string) => doc.projects.find((x) => x.id === id)?.name ?? "—";
  const maxAtt = Math.max(0.1, ...attention.map((a) => a.h));
  const monthStats = p ? computeMonthStats(p.id, doc.entries, p.split) : null;
  const entryRows =
    entryFilter === "all" ? doc.entries : doc.entries.filter((e) => e.projectId === entryFilter);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-24 pt-6" onClick={() => {}}>
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-9 flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div className="min-w-[280px] max-w-[680px] flex-1">
            <h1 className="v2-tighter text-[52px] font-light leading-none text-[var(--v2-ink-900)]">
              Время / Экономика
            </h1>
            <p
              className="v2-tight mt-4 text-[16px] leading-relaxed text-[var(--v2-ink-500)]"
              style={{ textWrap: "pretty" }}
            >
              «Сколько моего внимания реально покупает этот проект и стоит ли результат этой цены?»
            </p>
            {error ? <p className="mt-2 text-[13px] text-red-600">{error}</p> : null}
            {saving ? <p className="mt-1 text-[12px] text-[var(--v2-ink-400)]">Сохранение…</p> : null}
          </div>
        </div>

        {/* Timer */}
        <div className="mb-14 rounded-[24px] bg-white px-8 py-7 shadow-[var(--v2-shadow-soft)]">
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => void toggleTimer()}
              className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white transition ${
                running ? "bg-[var(--v2-ink-900)]" : "bg-[var(--v2-brand-500)] hover:bg-[var(--v2-brand-600)]"
              }`}
            >
              {running ? <V2Icons.stop className="h-5 w-5" /> : <V2Icons.play className="ml-0.5 h-6 w-6" />}
            </button>
            <div>
              <p className="v2-tighter v2-tnum text-[38px] font-light leading-none text-[var(--v2-ink-900)]">
                {hh}:{mm}:{ss}
              </p>
              <input
                value={timerTask}
                onChange={(e) => setTimerTask(e.target.value)}
                disabled={running}
                className="v2-tight mt-2 w-full max-w-[420px] border-0 bg-transparent text-[13px] text-[var(--v2-ink-500)] outline-none"
                placeholder="Задача сессии"
              />
              <p className="v2-tight mt-0.5 text-[13px] text-[var(--v2-ink-500)]">
                {running ? "Идёт: " : "Готов: "}
                {projName(running ? doc.running!.projectId : timerProj)}
              </p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <select
                value={running ? doc.running!.projectId : timerProj}
                disabled={running}
                onChange={(e) => setTimerProj(e.target.value)}
                className={selCls}
              >
                {doc.projects.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
              <select
                value={running ? doc.running!.activity : timerActivity}
                disabled={running}
                onChange={(e) => setTimerActivity(e.target.value)}
                className={selCls}
              >
                {doc.activityTypes.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
              <div className="inline-flex rounded-xl bg-[var(--v2-ink-100)] p-1">
                {(
                  [
                    ["planned", "Planned"],
                    ["reactive", "Reactive"],
                  ] as const
                ).map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    disabled={running}
                    onClick={() => setTimerMode(k)}
                    className={`v2-tight h-7 rounded-lg px-3 text-[12px] font-medium transition ${
                      (running ? doc.running!.mode : timerMode) === k
                        ? k === "reactive"
                          ? "bg-white text-amber-700 shadow-[var(--v2-shadow-card)]"
                          : "bg-white text-[var(--v2-ink-900)] shadow-[var(--v2-shadow-card)]"
                        : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setManual(true)}
                className="v2-tight inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--v2-ink-300)] px-3.5 text-[12.5px] font-medium text-[var(--v2-ink-600)] transition hover:border-[var(--v2-ink-400)] hover:text-[var(--v2-ink-900)]"
              >
                <V2Icons.plus className="h-4 w-4" /> Время
              </button>
            </div>
          </div>
          <p className="v2-tight mt-5 border-t border-[var(--v2-ink-100)] pt-5 text-[12.5px] text-[var(--v2-ink-400)]">
            Reactive — незапланированное вторжение. Отмечайте честно: важны не часы, а количество раз, когда проект
            вошёл в день без приглашения.
          </p>
        </div>

        <TSect
          title="Проекты"
          sub="Вкладка «Время / Экономика» внутри каждого проекта. Подробная аналитика живёт здесь, снапшот — в «Строении жизни»."
          right={
            <button
              type="button"
              onClick={() => setAddProject(true)}
              className="v2-tight inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[12.5px] font-medium text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-card)] transition hover:text-[var(--v2-ink-900)]"
            >
              <V2Icons.plus className="h-4 w-4 text-[var(--v2-ink-400)]" /> Проект
            </button>
          }
        >
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {doc.projects.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setProj(x.id)}
                className={`v2-tight h-9 rounded-full px-4 text-[13px] font-medium transition ${
                  proj === x.id
                    ? "bg-[var(--v2-ink-900)] text-white"
                    : "bg-white text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-card)] hover:text-[var(--v2-ink-900)]"
                }`}
              >
                {x.name}
              </button>
            ))}
          </div>
          {p && monthStats ? <ProjectPanel p={p} m={monthStats} onEditNote={() => setEditNote(true)} /> : null}
        </TSect>

        <TSect title="Моё внимание за месяц" sub="Клик по проекту открывает его экономику выше.">
          <div className="rounded-[20px] bg-white px-7 py-6 shadow-[var(--v2-shadow-card)]">
            <div className="flex items-baseline gap-4">
              <TK>Моё внимание за месяц</TK>
              <span className="v2-tnum text-[12px] text-[var(--v2-ink-400)]">
                {attention.reduce((s, a) => s + a.h, 0).toFixed(1)} h всего
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              {attention.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setProj(a.id)}
                  className="group grid items-center gap-4 text-left"
                  style={{ gridTemplateColumns: "170px minmax(0,1fr) 60px" }}
                >
                  <span
                    className={`v2-tight text-[13.5px] transition ${
                      proj === a.id
                        ? "font-medium text-[var(--v2-brand-700)]"
                        : "text-[var(--v2-ink-700)] group-hover:text-[var(--v2-ink-900)]"
                    }`}
                  >
                    {projName(a.id)}
                  </span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
                    <span
                      className="block h-full rounded-full transition-all"
                      style={{
                        width: `${(a.h / maxAtt) * 100}%`,
                        background: proj === a.id ? "#2A56EB" : "#93B4FD",
                      }}
                    />
                  </span>
                  <span className="v2-tnum justify-self-end text-[13px] text-[var(--v2-ink-600)]">{a.h} h</span>
                </button>
              ))}
              {!attention.length ? (
                <p className="v2-tight text-[14px] text-[var(--v2-ink-500)]">За этот месяц записей ещё нет.</p>
              ) : null}
            </div>
            <p className="v2-tight mt-5 text-[12.5px] text-[var(--v2-ink-400)]">
              Это данные для Strategy Review, а не повод оптимизировать каждый час.
            </p>
          </div>
        </TSect>

        <TSect title="Экономика внимания" sub="Деньги на founder-час рядом с долей reactive.">
          <div className="overflow-hidden rounded-[20px] bg-white shadow-[var(--v2-shadow-card)]">
            <div
              className="grid gap-5 border-b border-[var(--v2-ink-100)] bg-[var(--v2-ink-50)]/60 px-7 py-3.5"
              style={{ gridTemplateColumns: "minmax(0,1fr) 140px 100px 140px 180px" }}
            >
              {["Проект", "Прибыль", "Часы", "Деньги / час", "Reactive share"].map((h) => (
                <TK key={h}>{h}</TK>
              ))}
            </div>
            {economics.map((e) => (
              <div
                key={e.id}
                className="grid items-center gap-5 border-b border-[var(--v2-ink-100)] px-7 py-4 last:border-0"
                style={{ gridTemplateColumns: "minmax(0,1fr) 140px 100px 140px 180px" }}
              >
                <span className="v2-tight text-[14.5px] font-medium text-[var(--v2-ink-900)]">{e.name}</span>
                <span className="v2-tnum text-[13.5px] text-[var(--v2-ink-700)]">{fmtRub(e.profit)}</span>
                <span className="v2-tnum text-[13.5px] text-[var(--v2-ink-700)]">{e.hours} h</span>
                <span className="v2-tnum text-[14px] font-medium text-[var(--v2-brand-700)]">{fmtRub(e.per)}</span>
                <span className="flex items-center gap-3">
                  <span className="h-2 w-[90px] overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
                    <span className="block h-full rounded-full bg-amber-400" style={{ width: `${e.reactive}%` }} />
                  </span>
                  <span className="v2-tnum text-[13px] text-[var(--v2-ink-600)]">{e.reactive}%</span>
                </span>
              </div>
            ))}
            {!economics.length ? (
              <p className="v2-tight px-7 py-6 text-[14px] text-[var(--v2-ink-500)]">Нет денежных проектов с прибылью.</p>
            ) : null}
          </div>
          <p
            className="v2-tight mt-4 max-w-[80ch] text-[14px] leading-relaxed text-[var(--v2-ink-600)]"
            style={{ textWrap: "pretty" }}
          >
            Проект с меньшей ставкой за час, но высокой долей reactive, психологически дороже, чем показывает выручка.
            Деньги на час — только половина ответа.
          </p>
        </TSect>

        <TSect
          title="Последние записи"
          right={
            <div className="inline-flex items-center rounded-full bg-white p-1 shadow-[var(--v2-shadow-card)]">
              <button
                type="button"
                onClick={() => setEntryFilter("all")}
                className={`v2-tight h-7 rounded-full px-3.5 text-[12px] font-medium transition ${
                  entryFilter === "all"
                    ? "bg-[var(--v2-ink-900)] text-white"
                    : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
                }`}
              >
                Все
              </button>
              {p ? (
                <button
                  type="button"
                  onClick={() => setEntryFilter(p.id)}
                  className={`v2-tight h-7 rounded-full px-3.5 text-[12px] font-medium transition ${
                    entryFilter === p.id
                      ? "bg-[var(--v2-ink-900)] text-white"
                      : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
                  }`}
                >
                  {p.name}
                </button>
              ) : null}
            </div>
          }
        >
          <div className="overflow-hidden rounded-[20px] bg-white shadow-[var(--v2-shadow-card)]">
            {entryRows.map((e, i) => (
              <div
                key={e.id}
                className={`group grid items-center gap-5 px-7 py-4 transition hover:bg-[var(--v2-ink-50)]/60 ${
                  i ? "border-t border-[var(--v2-ink-100)]" : ""
                }`}
                style={{ gridTemplateColumns: "minmax(0,1fr) 150px 130px 120px 70px 36px" }}
              >
                <span className="v2-tight truncate text-[14.5px] text-[var(--v2-ink-900)]">{e.task}</span>
                <span className="v2-tight text-[12.5px] text-[var(--v2-ink-600)]">{projName(e.projectId)}</span>
                <span className="v2-tight text-[12.5px] text-[var(--v2-ink-500)]">{e.activity}</span>
                <span>
                  {e.mode === "reactive" ? (
                    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 text-[11px] font-medium text-amber-700">
                      <IcBolt className="h-3 w-3" /> Reactive
                    </span>
                  ) : (
                    <span className="v2-tight text-[11.5px] text-[var(--v2-ink-400)]">Planned</span>
                  )}
                </span>
                <span className="v2-tnum justify-self-end text-[13px] text-[var(--v2-ink-800)]">{fmtDur(e.durationMin)}</span>
                <button
                  type="button"
                  title="Удалить"
                  onClick={() => void deleteEntry(e.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--v2-ink-300)] opacity-0 transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-800)] group-hover:opacity-100"
                >
                  <V2Icons.trash className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {!entryRows.length ? (
              <p className="v2-tight px-7 py-6 text-[14px] text-[var(--v2-ink-500)]">Записей по этому проекту пока нет.</p>
            ) : null}
          </div>
        </TSect>

        <div className="rounded-[24px] bg-white px-9 py-8 shadow-[var(--v2-shadow-soft)]">
          <TK cls="text-[var(--v2-ink-500)]">Для Strategy Review · конец месяца</TK>
          <div className="mt-4 flex max-w-[70ch] flex-col gap-2.5">
            {doc.review.map((r, i) => (
              <p
                key={i}
                className="v2-tight text-[17px] font-light leading-snug text-[var(--v2-ink-900)]"
                style={{ textWrap: "pretty" }}
              >
                «{r}»
              </p>
            ))}
          </div>
          <p
            className="v2-tighter mt-6 max-w-[52ch] border-t border-[var(--v2-ink-100)] pt-5 text-[19px] font-light leading-snug text-[var(--v2-ink-900)]"
            style={{ textWrap: "pretty" }}
          >
            «Соответствует ли реальная цена роли этого проекта в твоей системе?»
          </p>
          <div className="mt-5 flex items-center gap-2">
            <Link
              href={appPath("/v2/personal/strategy2")}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-medium text-white no-underline shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)]"
            >
              Открыть Стратегию <V2Icons.arrowR className="h-4 w-4" />
            </Link>
            <span className="v2-tight text-[12.5px] text-[var(--v2-ink-400)]">
              Время не измеряет продуктивность и не оценивает дни. Только куда уходит стратегический ресурс.
            </span>
          </div>
        </div>
      </div>

      {manual ? (
        <ManualModal
          projects={doc.projects}
          activityTypes={doc.activityTypes}
          onClose={() => setManual(false)}
          onSave={(payload) => void addManualEntry(payload)}
        />
      ) : null}
      {addProject ? (
        <AddProjectModal onClose={() => setAddProject(false)} onSave={(n, r, m) => void addProjectSubmit(n, r, m)} />
      ) : null}
      {editNote && p ? (
        <EditNoteModal note={p.note} onClose={() => setEditNote(false)} onSave={(n) => void saveNote(n)} />
      ) : null}
    </div>
  );
}

function Metric({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-white px-5 py-4 shadow-[var(--v2-shadow-card)]">
      <TK>{label}</TK>
      <p
        className={`v2-tighter v2-tnum mt-2 text-[24px] font-light ${
          accent ? "text-[var(--v2-brand-700)]" : "text-[var(--v2-ink-900)]"
        }`}
      >
        {value}
      </p>
      {sub ? <p className="v2-tight mt-1 text-[12px] text-[var(--v2-ink-400)]">{sub}</p> : null}
    </div>
  );
}

function ProjectPanel({
  p,
  m,
  onEditNote,
}: {
  p: TimeProject;
  m: MonthStats;
  onEditNote: () => void;
}) {
  const perHour = p.money && m.founder ? Math.round((p.profit ?? 0) / m.founder) : null;
  const revPer = p.money && m.founder ? Math.round((p.revenue ?? 0) / m.founder) : null;
  const reactiveShare = m.founder ? Math.round((m.reactive / m.founder) * 100) : 0;
  const totalSplit = m.split.reduce((s, x) => s + x[1], 0) || 1;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <TK>{p.role}</TK>
            <span className="v2-tnum text-[12px] text-[var(--v2-ink-400)]">{monthLabel()}</span>
          </div>
          <h2 className="v2-tighter mt-1.5 text-[30px] font-light text-[var(--v2-ink-900)]">{p.name}</h2>
        </div>
        <button
          type="button"
          onClick={onEditNote}
          className="v2-tight ml-auto inline-flex items-center gap-1.5 pb-2 text-[12.5px] font-medium text-[var(--v2-ink-500)] transition hover:text-[var(--v2-brand-700)]"
        >
          <V2Icons.edit className="h-3.5 w-3.5" /> Править заметку
        </button>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))" }}>
        {p.money ? <Metric label="Выручка" value={fmtRub(p.revenue ?? 0)} /> : null}
        {p.money ? <Metric label="Прибыль" value={fmtRub(p.profit ?? 0)} /> : null}
        <Metric label="Founder load" value={`${m.founder} h`} sub={`reactive ${m.reactive} h · ${reactiveShare}%`} />
        <Metric label="Вторжения" value={String(m.interruptions)} sub={`${m.days} дн. с вторжениями`} />
        {p.money && perHour != null ? <Metric label="Profit / founder hour" value={fmtRub(perHour)} accent /> : null}
        {p.money && revPer != null ? <Metric label="Revenue / founder hour" value={fmtRub(revPer)} /> : null}
      </div>

      <div className="mt-5 grid gap-5" style={{ gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)" }}>
        <div className="rounded-[20px] bg-white px-7 py-6 shadow-[var(--v2-shadow-card)]">
          <TK>Из чего состоят часы</TK>
          <div className="mt-4 flex flex-col gap-2.5">
            {m.split.map(([l, h]) => (
              <div key={l} className="grid items-center gap-4" style={{ gridTemplateColumns: "160px minmax(0,1fr) 52px" }}>
                <span className="v2-tight text-[13.5px] text-[var(--v2-ink-700)]">{l}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
                  <span
                    className="block h-full rounded-full bg-[var(--v2-brand-300)]"
                    style={{ width: `${(h / totalSplit) * 100}%` }}
                  />
                </span>
                <span className="v2-tnum justify-self-end text-[13px] text-[var(--v2-ink-600)]">{h} h</span>
              </div>
            ))}
            {!m.split.length ? (
              <p className="v2-tight text-[13px] text-[var(--v2-ink-400)]">Пока нет разбивки за месяц.</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col rounded-[20px] bg-[var(--v2-ink-900)] px-7 py-6 text-white">
          <TK cls="text-white/40">Что это значит</TK>
          <p className="v2-tight mt-3 text-[17px] font-light leading-[1.5]" style={{ textWrap: "pretty" }}>
            {p.note || "Добавьте заметку о смысле этих часов."}
          </p>
          <div className="mt-auto flex items-center gap-6 pt-6">
            <div>
              <TK cls="text-white/40">Reactive share</TK>
              <p className="v2-tnum mt-1 text-[22px] font-light">{reactiveShare}%</p>
            </div>
            <div>
              <TK cls="text-white/40">Дней с вторжениями</TK>
              <p className="v2-tnum mt-1 text-[22px] font-light">{m.days}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManualModal({
  projects,
  activityTypes,
  onClose,
  onSave,
}: {
  projects: TimeProject[];
  activityTypes: string[];
  onClose: () => void;
  onSave: (p: { projectId: string; durationMin: number; activity: string; mode: TimeMode; task: string }) => void;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [dur, setDur] = useState("1:30");
  const [activity, setActivity] = useState(activityTypes[0] ?? "Other");
  const [mode, setMode] = useState<TimeMode>("planned");
  const [task, setTask] = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-[var(--v2-ink-900)]/45 p-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] rounded-[24px] bg-white shadow-[var(--v2-shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 pb-6 pt-7">
          <div className="flex items-start justify-between gap-4">
            <h2 className="v2-tighter text-[24px] font-light leading-tight text-[var(--v2-ink-900)]">Добавить время</h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--v2-ink-400)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
            >
              <IcClose className="h-[17px] w-[17px]" />
            </button>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <label className="block">
              <span className={labCls}>Проект</span>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={`${fieldCls} cursor-pointer appearance-none`}>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labCls}>Длительность</span>
              <input value={dur} onChange={(e) => setDur(e.target.value)} placeholder="1:30" className={fieldCls} />
            </label>
            <label className="block">
              <span className={labCls}>Тип времени</span>
              <select value={activity} onChange={(e) => setActivity(e.target.value)} className={`${fieldCls} cursor-pointer appearance-none`}>
                {activityTypes.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <div>
              <span className={labCls}>Режим</span>
              <div className="mt-1.5 inline-flex h-11 items-center rounded-xl bg-[var(--v2-ink-100)] p-1">
                {(
                  [
                    ["planned", "Planned"],
                    ["reactive", "Reactive"],
                  ] as const
                ).map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setMode(k)}
                    className={`v2-tight h-8 rounded-lg px-3.5 text-[12.5px] font-medium transition ${
                      mode === k
                        ? "bg-white text-[var(--v2-ink-900)] shadow-[var(--v2-shadow-card)]"
                        : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <label className="mt-4 block">
            <span className={labCls}>Заметка</span>
            <textarea
              rows={2}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Что это было"
              className="v2-tight mt-1.5 w-full resize-none rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3.5 py-2.5 text-[14px] leading-relaxed text-[var(--v2-ink-900)] outline-none transition placeholder:text-[var(--v2-ink-400)] focus:border-[var(--v2-brand-400)] focus:bg-white"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 rounded-b-[24px] bg-[var(--v2-ink-50)] px-8 py-4">
          <button
            type="button"
            onClick={onClose}
            className="v2-tight h-10 rounded-xl px-4 text-[13px] font-medium text-[var(--v2-ink-600)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => {
              const durationMin = parseDurInput(dur);
              if (durationMin == null || durationMin <= 0 || !projectId) return;
              onSave({ projectId, durationMin, activity, mode, task });
            }}
            className="h-10 rounded-xl bg-[var(--v2-ink-900)] px-5 text-[13px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)]"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

function AddProjectModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string, role: string, money: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [money, setMoney] = useState(false);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-[var(--v2-ink-900)]/45 p-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-[480px] rounded-[24px] bg-white shadow-[var(--v2-shadow-pop)]" onClick={(e) => e.stopPropagation()}>
        <div className="px-8 pb-6 pt-7">
          <h2 className="v2-tighter text-[24px] font-light text-[var(--v2-ink-900)]">Новый проект</h2>
          <label className="mt-5 block">
            <span className={labCls}>Название</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} placeholder="Название" />
          </label>
          <label className="mt-4 block">
            <span className={labCls}>Роль</span>
            <input value={role} onChange={(e) => setRole(e.target.value)} className={fieldCls} placeholder="Опора / ставка" />
          </label>
          <label className="mt-4 flex items-center gap-2 text-[13px] text-[var(--v2-ink-700)]">
            <input type="checkbox" checked={money} onChange={(e) => setMoney(e.target.checked)} />
            Денежный проект (выручка / прибыль)
          </label>
        </div>
        <div className="flex justify-end gap-2 rounded-b-[24px] bg-[var(--v2-ink-50)] px-8 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-[13px] font-medium text-[var(--v2-ink-600)]">
            Отмена
          </button>
          <button
            type="button"
            onClick={() => onSave(name, role, money)}
            className="h-10 rounded-xl bg-[var(--v2-ink-900)] px-5 text-[13px] font-medium text-white"
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
}

function EditNoteModal({ note, onClose, onSave }: { note: string; onClose: () => void; onSave: (n: string) => void }) {
  const [v, setV] = useState(note);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-[var(--v2-ink-900)]/45 p-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-[560px] rounded-[24px] bg-white shadow-[var(--v2-shadow-pop)]" onClick={(e) => e.stopPropagation()}>
        <div className="px-8 pb-6 pt-7">
          <h2 className="v2-tighter text-[24px] font-light text-[var(--v2-ink-900)]">Заметка проекта</h2>
          <textarea
            rows={5}
            value={v}
            onChange={(e) => setV(e.target.value)}
            className="v2-tight mt-5 w-full resize-none rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3.5 py-2.5 text-[14.5px] leading-relaxed outline-none focus:border-[var(--v2-brand-400)] focus:bg-white"
          />
        </div>
        <div className="flex justify-end gap-2 rounded-b-[24px] bg-[var(--v2-ink-50)] px-8 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-[13px] font-medium text-[var(--v2-ink-600)]">
            Отмена
          </button>
          <button
            type="button"
            onClick={() => onSave(v)}
            className="h-10 rounded-xl bg-[var(--v2-ink-900)] px-5 text-[13px] font-medium text-white"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
