"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import type {
  TimeDoc,
  TimeEntry,
  TimeMode,
  TimeProject,
  TimeTaskType,
} from "@/lib/v2/personal/seeds/time-seed";
import { normalizeTimeDoc } from "@/lib/v2/personal/seeds/time-seed";
import { isFinanceLinkedTimeProject } from "@/lib/v2/personal/time-finance";
import { V2Icons } from "@/components/v2/ui/icons";
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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Длительность записи: «2 мин», «2 мин 5 сек», «1 ч 12 мин» — не «0:06», которое читается как 6 секунд. */
function fmtDur(min: number) {
  const sec = Math.max(0, Math.round(min * 60));
  if (sec < 60) return `${sec} сек`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return s ? `${h} ч ${m} мин` : m ? `${h} ч ${m} мин` : `${h} ч`;
  return s ? `${m} мин ${s} сек` : `${m} мин`;
}

function fmtHours(hours: number) {
  if (hours <= 0) return "0 мин";
  return fmtDur(hours * 60);
}

function elapsedSeconds(startedAt: string, now = Date.now()) {
  const t = new Date(startedAt).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((now - t) / 1000));
}

/** Ставка ₽/час по нескольким минутам врёт на порядки — считаем только с 1 часа. */
const MIN_HOURS_FOR_RATE = 1;

type AgencyProjectOption = { id: string; name: string };

function isAgencyProductionLink(lifeProjectId: string, activityId: string, doc: TimeDoc | null) {
  if (lifeProjectId !== "agency" || !doc) return false;
  const activity = doc.projects.find((p) => p.id === lifeProjectId)?.taskTypes.find((t) => t.id === activityId);
  return activity?.name.toLowerCase() === "production";
}

function agencyProjectLabel(projects: AgencyProjectOption[], id: string | null | undefined) {
  if (!id) return null;
  return projects.find((p) => p.id === id)?.name ?? null;
}

async function syncAgencyTrackedTime(entry: TimeEntry) {
  if (!entry.agencyProjectId) return;
  await fetchJson("/api/v2/personal/time/sync-tracked", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceEntryId: entry.id,
      agencyProjectId: entry.agencyProjectId,
      task: entry.task,
      activity: entry.activity,
      durationSeconds: Math.max(1, Math.round(entry.durationMin * 60)),
      trackedAt: entry.at,
    }),
  });
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

function computeMonthStats(projectId: string, entries: TimeEntry[]): MonthStats {
  const pe = entries.filter((e) => e.projectId === projectId && inCurrentMonth(e.at));
  const founder = pe.reduce((s, e) => s + e.durationMin, 0) / 60;
  const reactiveEntries = pe.filter((e) => e.mode === "reactive");
  const reactive = reactiveEntries.reduce((s, e) => s + e.durationMin, 0) / 60;
  const days = new Set(reactiveEntries.map((e) => e.at.slice(0, 10))).size;
  const byAct = new Map<string, number>();
  for (const e of pe) {
    byAct.set(e.activity, (byAct.get(e.activity) ?? 0) + e.durationMin / 60);
  }
  const split: [string, number][] = [...byAct.entries()].sort((a, b) => b[1] - a[1]);
  return {
    founder,
    reactive,
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [entryFilter, setEntryFilter] = useState<"all" | string>("all");
  const [timerSec, setTimerSec] = useState(0);
  const [timerProj, setTimerProj] = useState("hire");
  const [timerActivityId, setTimerActivityId] = useState("");
  const [timerMode, setTimerMode] = useState<TimeMode>("planned");
  const [timerTask, setTimerTask] = useState("");
  const [timerAgencyProjectId, setTimerAgencyProjectId] = useState("");
  const [agencyProjects, setAgencyProjects] = useState<AgencyProjectOption[]>([]);
  const [agencyProjectsConfigured, setAgencyProjectsConfigured] = useState(true);

  const saveDoc = useCallback(async (next: TimeDoc) => {
    const normalized = normalizeTimeDoc(next);
    setDoc(normalized);
    setSaving(true);
    setError(null);
    try {
      const res = await fetchJson<{ doc: TimeDoc }>("/api/v2/personal/life-docs/time", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc: normalized }),
      });
      setDoc(normalizeTimeDoc(res.doc));
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
        const normalized = normalizeTimeDoc(res.doc);
        setDoc(normalized);
        const first = normalized.projects[0];
        if (first) {
          setProj(first.id);
          if (!normalized.running) {
            setTimerProj(first.id);
            setTimerActivityId(first.taskTypes[0]?.id ?? "");
          }
        }
        if (normalized.running) {
          setTimerProj(normalized.running.projectId);
          setTimerActivityId(normalized.running.activityId);
          setTimerMode(normalized.running.mode);
          setTimerTask(normalized.running.task);
          setTimerAgencyProjectId(normalized.running.agencyProjectId ?? "");
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
  const runningStartedAt = doc?.running?.startedAt ?? null;

  useEffect(() => {
    if (!running || !runningStartedAt) {
      setTimerSec(0);
      return;
    }
    const sync = () => setTimerSec(elapsedSeconds(runningStartedAt));
    sync();
    const i = window.setInterval(sync, 250);
    const onResume = () => sync();
    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("focus", onResume);
    window.addEventListener("pageshow", onResume);
    return () => {
      window.clearInterval(i);
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("focus", onResume);
      window.removeEventListener("pageshow", onResume);
    };
  }, [running, runningStartedAt]);

  const timerLifeProjectId = running && doc?.running ? doc.running.projectId : timerProj;
  const timerLifeActivityId = running && doc?.running ? doc.running.activityId : timerActivityId;
  const showAgencyProjectPicker = isAgencyProductionLink(timerLifeProjectId, timerLifeActivityId, doc);

  useEffect(() => {
    if (!showAgencyProjectPicker) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchJson<{ projects: AgencyProjectOption[]; configured?: boolean }>(
          "/api/v2/personal/time/agency-projects"
        );
        if (cancelled) return;
        setAgencyProjects(res.projects ?? []);
        setAgencyProjectsConfigured(res.configured !== false);
      } catch {
        if (!cancelled) {
          setAgencyProjects([]);
          setAgencyProjectsConfigured(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showAgencyProjectPicker]);

  const monthEntries = useMemo(() => (doc ? doc.entries.filter((e) => inCurrentMonth(e.at)) : []), [doc]);

  const attention = useMemo(() => {
    if (!doc) return [];
    return doc.projects
      .map((p) => {
        const h = monthEntries.filter((e) => e.projectId === p.id).reduce((s, e) => s + e.durationMin, 0) / 60;
        return { id: p.id, h };
      })
      .filter((a) => a.h > 0)
      .sort((a, b) => b.h - a.h);
  }, [doc, monthEntries]);

  const economics = useMemo(() => {
    if (!doc) return [];
    return doc.projects
      .filter((p) => p.money || isFinanceLinkedTimeProject(p.id))
      .map((p) => {
        const st = computeMonthStats(p.id, doc.entries);
        const profit = p.profit ?? 0;
        const revenue = p.revenue ?? 0;
        const per = st.founder >= MIN_HOURS_FOR_RATE ? Math.round(profit / st.founder) : null;
        const reactiveShare = st.founder ? Math.round((st.reactive / st.founder) * 100) : 0;
        return {
          id: p.id,
          name: p.name,
          revenue,
          profit,
          hours: st.founder,
          per,
          reactive: reactiveShare,
          fromFinance: isFinanceLinkedTimeProject(p.id),
        };
      })
      .filter((e) => e.fromFinance || e.revenue > 0 || e.profit !== 0 || e.hours > 0)
      .sort((a, b) => b.profit - a.profit || b.revenue - a.revenue || b.hours - a.hours);
  }, [doc]);

  const p = doc?.projects.find((x) => x.id === proj) ?? doc?.projects[0];

  const timerProjectId = running && doc?.running ? doc.running.projectId : timerProj;
  const timerTypes = useMemo(() => {
    if (!doc) return [] as TimeTaskType[];
    return doc.projects.find((x) => x.id === timerProjectId)?.taskTypes ?? [];
  }, [doc, timerProjectId]);

  const resolveActivity = (projectId: string, activityId: string) => {
    const project = doc?.projects.find((x) => x.id === projectId);
    const tt = project?.taskTypes.find((t) => t.id === activityId) ?? project?.taskTypes[0];
    return tt ? { activityId: tt.id, activity: tt.name } : { activityId: "", activity: "Other" };
  };

  const toggleTimer = async () => {
    if (!doc) return;
    if (doc.running) {
      const durationMin = Math.max(1, elapsedSeconds(doc.running.startedAt)) / 60;
      const task = timerTask.trim() || doc.running.task.trim() || "Сессия таймера";
      const entry: TimeEntry = {
        id: uid("e"),
        projectId: doc.running.projectId,
        task,
        activityId: doc.running.activityId,
        activity: doc.running.activity,
        mode: doc.running.mode,
        durationMin,
        at: new Date().toISOString(),
        agencyProjectId: doc.running.agencyProjectId ?? null,
        agencyProjectName: doc.running.agencyProjectName ?? null,
      };
      await saveDoc({
        ...doc,
        entries: [entry, ...doc.entries],
        running: null,
      });
      if (entry.agencyProjectId) {
        try {
          await syncAgencyTrackedTime(entry);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Время сохранено, но не записалось на проект");
        }
      }
      setTimerSec(0);
      setTimerTask("");
      setTimerAgencyProjectId("");
      return;
    }
    const task = timerTask.trim();
    if (!task) {
      setError("Укажите, на что тратите время — до запуска таймера.");
      return;
    }
    const act = resolveActivity(timerProj, timerActivityId);
    if (!act.activityId) {
      setError("У проекта нет типов задач — добавьте их в настройках.");
      return;
    }
    const agencyId = showAgencyProjectPicker && timerAgencyProjectId ? timerAgencyProjectId : null;
    const agencyName = agencyId ? agencyProjectLabel(agencyProjects, agencyId) : null;
    setError(null);
    await saveDoc({
      ...doc,
      running: {
        projectId: timerProj,
        activityId: act.activityId,
        activity: act.activity,
        mode: timerMode,
        startedAt: new Date().toISOString(),
        task,
        agencyProjectId: agencyId,
        agencyProjectName: agencyName,
      },
    });
  };

  const updateRunningTask = async (task: string) => {
    setTimerTask(task);
    if (!doc?.running) return;
    await saveDoc({
      ...doc,
      running: { ...doc.running, task },
    });
  };

  const addManualEntry = async (payload: {
    projectId: string;
    durationMin: number;
    activityId: string;
    mode: TimeMode;
    task: string;
    agencyProjectId?: string | null;
    agencyProjectName?: string | null;
  }) => {
    if (!doc) return;
    const act = resolveActivity(payload.projectId, payload.activityId);
    const entry: TimeEntry = {
      id: uid("e"),
      projectId: payload.projectId,
      task: payload.task.trim(),
      activityId: act.activityId,
      activity: act.activity,
      mode: payload.mode,
      durationMin: payload.durationMin,
      at: new Date().toISOString(),
      agencyProjectId: payload.agencyProjectId ?? null,
      agencyProjectName: payload.agencyProjectName ?? null,
    };
    await saveDoc({ ...doc, entries: [entry, ...doc.entries] });
    if (entry.agencyProjectId) {
      try {
        await syncAgencyTrackedTime(entry);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Время сохранено, но не записалось на проект");
      }
    }
    setManual(false);
  };

  const deleteEntry = async (id: string) => {
    if (!doc) return;
    await saveDoc({ ...doc, entries: doc.entries.filter((e) => e.id !== id) });
  };

  const saveSettings = async (projects: TimeProject[]) => {
    if (!doc) return;
    const byId = new Map(projects.map((x) => [x.id, x]));
    const entries = doc.entries.map((e) => {
      const project = byId.get(e.projectId);
      if (!project) return e;
      const tt = project.taskTypes.find((t) => t.id === e.activityId);
      if (!tt) return e;
      return tt.name === e.activity ? e : { ...e, activity: tt.name };
    });
    let running = doc.running;
    if (running) {
      const project = byId.get(running.projectId);
      if (!project) {
        running = null;
      } else {
        const tt = project.taskTypes.find((t) => t.id === running!.activityId) ?? project.taskTypes[0];
        if (!tt) running = null;
        else {
          running = {
            ...running,
            activityId: tt.id,
            activity: tt.name,
          };
        }
      }
    }
    await saveDoc({ ...doc, projects, entries, running });
    if (!projects.find((x) => x.id === proj) && projects[0]) setProj(projects[0].id);
    if (!projects.find((x) => x.id === timerProj) && projects[0]) {
      setTimerProj(projects[0].id);
      setTimerActivityId(projects[0].taskTypes[0]?.id ?? "");
    } else {
      const tp = projects.find((x) => x.id === timerProj);
      if (tp && !tp.taskTypes.find((t) => t.id === timerActivityId)) {
        setTimerActivityId(tp.taskTypes[0]?.id ?? "");
      }
    }
    setSettingsOpen(false);
  };

  if (!doc) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--v2-ink-500)]">
        {error ?? "Загрузка…"}
      </div>
    );
  }

  const hh = pad2(Math.floor(timerSec / 3600));
  const mm = pad2(Math.floor((timerSec % 3600) / 60));
  const ss = pad2(timerSec % 60);
  const projName = (id: string) => doc.projects.find((x) => x.id === id)?.name ?? "—";
  const maxAtt = Math.max(0.1, ...attention.map((a) => a.h));
  const monthStats = p ? computeMonthStats(p.id, doc.entries) : null;
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
            {error ? <p className="mt-4 text-[13px] text-red-600">{error}</p> : null}
            {saving ? <p className="mt-1 text-[12px] text-[var(--v2-ink-400)]">Сохранение…</p> : null}
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="v2-tight mt-2 inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--v2-ink-200)] bg-transparent px-3.5 text-[12.5px] font-medium text-[var(--v2-ink-500)] transition hover:border-[var(--v2-ink-300)] hover:text-[var(--v2-ink-800)]"
          >
            Настройки
          </button>
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
            <div className="min-w-[220px] flex-1">
              <p className="v2-tighter v2-tnum text-[38px] font-light leading-none text-[var(--v2-ink-900)]">
                {hh}:{mm}:{ss}
              </p>
              <p className="v2-tight mt-2 text-[13px] text-[var(--v2-ink-500)]">
                {running ? "Идёт: " : "Готов: "}
                {projName(running ? doc.running!.projectId : timerProj)}
              </p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <select
                value={running ? doc.running!.projectId : timerProj}
                disabled={running}
                onChange={(e) => {
                  const id = e.target.value;
                  setTimerProj(id);
                  const types = doc.projects.find((x) => x.id === id)?.taskTypes ?? [];
                  setTimerActivityId(types[0]?.id ?? "");
                }}
                className={selCls}
              >
                {doc.projects.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
              <select
                value={running ? doc.running!.activityId : timerActivityId}
                disabled={running || !timerTypes.length}
                onChange={(e) => setTimerActivityId(e.target.value)}
                className={selCls}
              >
                {timerTypes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
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
          <label className="mt-5 block border-t border-[var(--v2-ink-100)] pt-5">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">
              На что тратите время
            </span>
            <input
              value={timerTask}
              onChange={(e) => {
                const v = e.target.value;
                setTimerTask(v);
                setError(null);
              }}
              onBlur={() => {
                if (running) void updateRunningTask(timerTask);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (running) void updateRunningTask(timerTask);
                  else void toggleTimer();
                }
              }}
              className="v2-tight mt-1.5 h-11 w-full rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3.5 text-[14.5px] text-[var(--v2-ink-900)] outline-none transition placeholder:text-[var(--v2-ink-400)] focus:border-[var(--v2-brand-400)] focus:bg-white"
              placeholder="Например: звонок с клиентом, сценарий ролика, правки лендинга…"
            />
          </label>
          {showAgencyProjectPicker ? (
            <label className="mt-4 block">
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">
                Проект агентства <span className="font-normal normal-case tracking-normal text-[var(--v2-ink-400)]">(необязательно)</span>
              </span>
              {!agencyProjectsConfigured ? (
                <p className="v2-tight mt-2 text-[13px] text-[var(--v2-ink-500)]">
                  Список проектов недоступен — время сохранится только в личном учёте.
                </p>
              ) : (
                <select
                  value={running ? doc.running!.agencyProjectId ?? "" : timerAgencyProjectId}
                  disabled={running}
                  onChange={(e) => setTimerAgencyProjectId(e.target.value)}
                  className={`${fieldCls} mt-1.5 cursor-pointer appearance-none`}
                >
                  <option value="">— без привязки к проекту —</option>
                  {agencyProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              <p className="v2-tight mt-2 text-[12.5px] text-[var(--v2-ink-400)]">
                Время попадёт на карточку проекта. В смету — только если отметите там галочкой «почасовая оплата».
              </p>
            </label>
          ) : null}
          <p className="v2-tight mt-4 text-[12.5px] text-[var(--v2-ink-400)]">
            Reactive — незапланированное вторжение. Отмечайте честно: важны не часы, а количество раз, когда проект
            вошёл в день без приглашения.
          </p>
        </div>

        <TSect title="Проекты">
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
          {p && monthStats ? <ProjectPanel p={p} m={monthStats} /> : null}
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
                  <span className="v2-tnum justify-self-end text-[13px] text-[var(--v2-ink-600)]">{fmtHours(a.h)}</span>
                </button>
              ))}
              {!attention.length ? (
                <p className="v2-tight text-[14px] text-[var(--v2-ink-500)]">За этот месяц записей ещё нет.</p>
              ) : null}
            </div>
          </div>
        </TSect>

        <TSect
          title="Экономика внимания"
          sub="Выручка и прибыль из «Проекты и финансы», часы — из записей таймера за текущий месяц."
        >
          <div className="overflow-hidden rounded-[20px] bg-white shadow-[var(--v2-shadow-card)]">
            <div
              className="grid gap-4 border-b border-[var(--v2-ink-100)] bg-[var(--v2-ink-50)]/60 px-7 py-3.5"
              style={{ gridTemplateColumns: "minmax(0,1.2fr) 120px 120px 110px 120px 160px" }}
            >
              {["Проект", "Выручка", "Прибыль", "Часы", "₽ / час", "Reactive"].map((h) => (
                <TK key={h}>{h}</TK>
              ))}
            </div>
            {economics.map((e) => (
              <div
                key={e.id}
                className="grid items-center gap-4 border-b border-[var(--v2-ink-100)] px-7 py-4 last:border-0"
                style={{ gridTemplateColumns: "minmax(0,1.2fr) 120px 120px 110px 120px 160px" }}
              >
                <div className="min-w-0">
                  <span className="v2-tight block truncate text-[14.5px] font-medium text-[var(--v2-ink-900)]">
                    {e.name}
                  </span>
                  {e.fromFinance ? (
                    <span className="v2-tight text-[11px] text-[var(--v2-ink-400)]">из финансов месяца</span>
                  ) : null}
                </div>
                <span className="v2-tnum text-[13.5px] text-[var(--v2-ink-700)]">{fmtRub(e.revenue)}</span>
                <span className="v2-tnum text-[13.5px] text-[var(--v2-ink-700)]">{fmtRub(e.profit)}</span>
                <span className="v2-tnum text-[13.5px] text-[var(--v2-ink-700)]">{fmtHours(e.hours)}</span>
                <span className="v2-tnum text-[14px] font-medium text-[var(--v2-brand-700)]">
                  {e.per == null ? "—" : fmtRub(e.per)}
                </span>
                <span className="flex items-center gap-3">
                  <span className="h-2 w-[72px] overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
                    <span className="block h-full rounded-full bg-amber-400" style={{ width: `${e.reactive}%` }} />
                  </span>
                  <span className="v2-tnum text-[13px] text-[var(--v2-ink-600)]">{e.reactive}%</span>
                </span>
              </div>
            ))}
            {!economics.length ? (
              <p className="v2-tight px-7 py-6 text-[14px] text-[var(--v2-ink-500)]">
                Нет данных: занесите проекты в «Проекты и финансы» или зафиксируйте время.
              </p>
            ) : null}
          </div>
          <p
            className="v2-tight mt-4 max-w-[80ch] text-[14px] leading-relaxed text-[var(--v2-ink-600)]"
            style={{ textWrap: "pretty" }}
          >
            ₽ / час = прибыль линии ÷ часы таймера за месяц. Ставка считается только если есть хотя бы 1 час — иначе
            несколько минут дают миллионы и ничего не значат. Высокий reactive делает ту же прибыль дороже
            психологически.
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
                style={{ gridTemplateColumns: "minmax(0,1fr) 150px 130px 120px 110px 36px" }}
              >
                <span className="v2-tight truncate text-[14.5px] text-[var(--v2-ink-900)]">
                  {e.task}
                  {e.agencyProjectName ? (
                    <span className="ml-2 text-[12px] font-normal text-[var(--v2-brand-600)]">→ {e.agencyProjectName}</span>
                  ) : null}
                </span>
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
      </div>

      {manual ? (
        <ManualModal
          projects={doc.projects}
          agencyProjects={agencyProjects}
          agencyProjectsConfigured={agencyProjectsConfigured}
          onClose={() => setManual(false)}
          onSave={(payload) => void addManualEntry(payload)}
        />
      ) : null}
      {settingsOpen ? (
        <SettingsModal
          projects={doc.projects}
          onClose={() => setSettingsOpen(false)}
          onSave={(projects) => void saveSettings(projects)}
        />
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
}: {
  p: TimeProject;
  m: MonthStats;
}) {
  const perHour =
    p.money && m.founder >= MIN_HOURS_FOR_RATE ? Math.round((p.profit ?? 0) / m.founder) : null;
  const revPer =
    p.money && m.founder >= MIN_HOURS_FOR_RATE ? Math.round((p.revenue ?? 0) / m.founder) : null;
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
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))" }}>
        {p.money ? (
          <Metric
            label="Выручка"
            value={fmtRub(p.revenue ?? 0)}
            sub={isFinanceLinkedTimeProject(p.id) ? "из Проекты и финансы · текущий месяц" : undefined}
          />
        ) : null}
        {p.money ? (
          <Metric
            label="Прибыль"
            value={fmtRub(p.profit ?? 0)}
            sub={isFinanceLinkedTimeProject(p.id) ? "выручка − расходы проектов линии" : undefined}
          />
        ) : null}
        <Metric
          label="Founder load"
          value={fmtHours(m.founder)}
          sub={`reactive ${fmtHours(m.reactive)} · ${reactiveShare}%`}
        />
        <Metric label="Вторжения" value={String(m.interruptions)} sub={`${m.days} дн. с вторжениями`} />
        {p.money && perHour != null ? <Metric label="Profit / founder hour" value={fmtRub(perHour)} accent /> : null}
        {p.money && revPer != null ? <Metric label="Revenue / founder hour" value={fmtRub(revPer)} /> : null}
      </div>

      <div className="mt-5 rounded-[20px] bg-white px-7 py-6 shadow-[var(--v2-shadow-card)]">
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
              <span className="v2-tnum justify-self-end text-[13px] text-[var(--v2-ink-600)]">{fmtHours(h)}</span>
            </div>
          ))}
          {!m.split.length ? (
            <p className="v2-tight text-[13px] text-[var(--v2-ink-400)]">Пока нет разбивки за месяц.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ManualModal({
  projects,
  agencyProjects,
  agencyProjectsConfigured,
  onClose,
  onSave,
}: {
  projects: TimeProject[];
  agencyProjects: AgencyProjectOption[];
  agencyProjectsConfigured: boolean;
  onClose: () => void;
  onSave: (p: {
    projectId: string;
    durationMin: number;
    activityId: string;
    mode: TimeMode;
    task: string;
    agencyProjectId?: string | null;
    agencyProjectName?: string | null;
  }) => void;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [dur, setDur] = useState("1:30");
  const types = projects.find((p) => p.id === projectId)?.taskTypes ?? [];
  const [activityId, setActivityId] = useState(types[0]?.id ?? "");
  const [mode, setMode] = useState<TimeMode>("planned");
  const [task, setTask] = useState("");
  const [agencyProjectId, setAgencyProjectId] = useState("");
  const showAgencyPicker = isAgencyProductionLink(projectId, activityId, { projects, entries: [], review: [], running: null });

  useEffect(() => {
    const next = projects.find((p) => p.id === projectId)?.taskTypes ?? [];
    setActivityId((cur) => (next.find((t) => t.id === cur) ? cur : next[0]?.id ?? ""));
  }, [projectId, projects]);

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
              <select
                value={projectId}
                onChange={(e) => {
                  const id = e.target.value;
                  setProjectId(id);
                  const next = projects.find((p) => p.id === id)?.taskTypes ?? [];
                  setActivityId(next[0]?.id ?? "");
                }}
                className={`${fieldCls} cursor-pointer appearance-none`}
              >
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
              <span className={labCls}>Тип задачи</span>
              <select
                value={activityId}
                onChange={(e) => setActivityId(e.target.value)}
                disabled={!types.length}
                className={`${fieldCls} cursor-pointer appearance-none`}
              >
                {types.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
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
            <span className={labCls}>На что потратили время</span>
            <textarea
              rows={2}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Например: звонок с клиентом по правкам лендинга"
              className="v2-tight mt-1.5 w-full resize-none rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3.5 py-2.5 text-[14px] leading-relaxed text-[var(--v2-ink-900)] outline-none transition placeholder:text-[var(--v2-ink-400)] focus:border-[var(--v2-brand-400)] focus:bg-white"
            />
          </label>
          {showAgencyPicker && agencyProjectsConfigured ? (
            <label className="mt-4 block">
              <span className={labCls}>Проект агентства (необязательно)</span>
              <select
                value={agencyProjectId}
                onChange={(e) => setAgencyProjectId(e.target.value)}
                className={`${fieldCls} cursor-pointer appearance-none`}
              >
                <option value="">— без привязки —</option>
                {agencyProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
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
            disabled={!task.trim() || !activityId}
            onClick={() => {
              const durationMin = parseDurInput(dur);
              if (durationMin == null || durationMin <= 0 || !projectId || !task.trim() || !activityId) return;
              const apId = showAgencyPicker && agencyProjectId ? agencyProjectId : null;
              onSave({
                projectId,
                durationMin,
                activityId,
                mode,
                task: task.trim(),
                agencyProjectId: apId,
                agencyProjectName: apId ? agencyProjectLabel(agencyProjects, apId) : null,
              });
            }}
            className="h-10 rounded-xl bg-[var(--v2-ink-900)] px-5 text-[13px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)] disabled:opacity-40 disabled:hover:bg-[var(--v2-ink-900)]"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({
  projects: initial,
  onClose,
  onSave,
}: {
  projects: TimeProject[];
  onClose: () => void;
  onSave: (projects: TimeProject[]) => void;
}) {
  const [projects, setProjects] = useState(() =>
    initial.map((p) => ({ ...p, taskTypes: p.taskTypes.map((t) => ({ ...t })) }))
  );
  const [sel, setSel] = useState(initial[0]?.id ?? "");
  const [newType, setNewType] = useState("");
  const selected = projects.find((p) => p.id === sel) ?? projects[0];

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const patchSelected = (patch: Partial<TimeProject>) => {
    if (!selected) return;
    setProjects((prev) => prev.map((p) => (p.id === selected.id ? { ...p, ...patch } : p)));
  };

  const addProject = () => {
    const id = uid("p");
    const np: TimeProject = {
      id,
      name: "Новый проект",
      role: "Проект",
      money: false,
      taskTypes: [{ id: uid("tt"), name: "Other" }],
      split: [],
      note: "",
    };
    setProjects((prev) => [...prev, np]);
    setSel(id);
  };

  const removeProject = (id: string) => {
    const next = projects.filter((p) => p.id !== id);
    setProjects(next);
    if (sel === id) setSel(next[0]?.id ?? "");
  };

  const addTaskType = () => {
    const name = newType.trim();
    if (!selected || !name) return;
    if (selected.taskTypes.some((t) => t.name.toLowerCase() === name.toLowerCase())) return;
    patchSelected({
      taskTypes: [...selected.taskTypes, { id: uid(`tt_${selected.id}`), name }],
    });
    setNewType("");
  };

  const renameTaskType = (typeId: string, name: string) => {
    if (!selected) return;
    patchSelected({
      taskTypes: selected.taskTypes.map((t) => (t.id === typeId ? { ...t, name } : t)),
    });
  };

  const removeTaskType = (typeId: string) => {
    if (!selected || selected.taskTypes.length <= 1) return;
    patchSelected({
      taskTypes: selected.taskTypes.filter((t) => t.id !== typeId),
    });
  };

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-[var(--v2-ink-900)]/45 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(860px,92vh)] w-full max-w-[920px] flex-col overflow-hidden rounded-[24px] bg-white shadow-[var(--v2-shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--v2-ink-100)] px-8 pb-5 pt-7">
          <div>
            <h2 className="v2-tighter text-[24px] font-light text-[var(--v2-ink-900)]">Настройки</h2>
            <p className="v2-tight mt-1.5 text-[13.5px] text-[var(--v2-ink-500)]">
              Проекты и типы задач. У каждого проекта свой набор типов — одинаковые имена не пересекаются.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--v2-ink-400)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
          >
            <IcClose className="h-[17px] w-[17px]" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-hidden" style={{ gridTemplateColumns: "240px minmax(0,1fr)" }}>
          <div className="flex flex-col border-r border-[var(--v2-ink-100)] bg-[var(--v2-ink-50)]/50">
            <div className="flex-1 overflow-y-auto p-3">
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSel(p.id)}
                  className={`mb-1 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition ${
                    selected?.id === p.id
                      ? "bg-white text-[var(--v2-ink-900)] shadow-[var(--v2-shadow-card)]"
                      : "text-[var(--v2-ink-600)] hover:bg-white/70 hover:text-[var(--v2-ink-900)]"
                  }`}
                >
                  <span className="v2-tight truncate text-[13.5px] font-medium">{p.name}</span>
                  <span className="v2-tnum shrink-0 text-[11px] text-[var(--v2-ink-400)]">{p.taskTypes.length}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-[var(--v2-ink-100)] p-3">
              <button
                type="button"
                onClick={addProject}
                className="v2-tight inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--v2-ink-300)] text-[12.5px] font-medium text-[var(--v2-ink-600)] transition hover:border-[var(--v2-ink-400)] hover:text-[var(--v2-ink-900)]"
              >
                <V2Icons.plus className="h-4 w-4" /> Проект
              </button>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto px-8 py-6">
            {selected ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className={labCls}>Название</span>
                    <input
                      value={selected.name}
                      onChange={(e) => patchSelected({ name: e.target.value })}
                      className={fieldCls}
                    />
                  </label>
                  <label className="block">
                    <span className={labCls}>Роль</span>
                    <input
                      value={selected.role}
                      onChange={(e) => patchSelected({ role: e.target.value })}
                      className={fieldCls}
                      placeholder="Опора / ставка"
                    />
                  </label>
                </div>
                <label className="mt-4 flex items-center gap-2 text-[13px] text-[var(--v2-ink-700)]">
                  <input
                    type="checkbox"
                    checked={selected.money}
                    disabled={isFinanceLinkedTimeProject(selected.id)}
                    onChange={(e) =>
                      patchSelected({
                        money: e.target.checked,
                        revenue: e.target.checked ? selected.revenue ?? 0 : undefined,
                        profit: e.target.checked ? selected.profit ?? 0 : undefined,
                      })
                    }
                  />
                  Денежный проект (выручка / прибыль)
                </label>
                {isFinanceLinkedTimeProject(selected.id) ? (
                  <p className="v2-tight mt-3 rounded-xl bg-[var(--v2-ink-50)] px-3.5 py-3 text-[13px] text-[var(--v2-ink-600)]">
                    Выручка и прибыль подтягиваются из «Проекты и финансы» за текущий месяц
                    {selected.id === "agency"
                      ? " (направление Агентство)"
                      : selected.id === "course"
                        ? " (направление Импульс)"
                        : " (направление Qmagic)"}
                    .
                  </p>
                ) : selected.money ? (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className={labCls}>Выручка</span>
                      <input
                        type="number"
                        value={selected.revenue ?? 0}
                        onChange={(e) => patchSelected({ revenue: Number(e.target.value) || 0 })}
                        className={fieldCls}
                      />
                    </label>
                    <label className="block">
                      <span className={labCls}>Прибыль</span>
                      <input
                        type="number"
                        value={selected.profit ?? 0}
                        onChange={(e) => patchSelected({ profit: Number(e.target.value) || 0 })}
                        className={fieldCls}
                      />
                    </label>
                  </div>
                ) : null}

                <div className="mt-8">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <h3 className="v2-tight text-[16px] font-medium text-[var(--v2-ink-900)]">Типы задач</h3>
                      <p className="v2-tight mt-1 text-[12.5px] text-[var(--v2-ink-500)]">
                        Только для «{selected.name}». Strategy здесь ≠ Strategy в другом проекте.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    {selected.taskTypes.map((t) => (
                      <div key={t.id} className="flex items-center gap-2">
                        <input
                          value={t.name}
                          onChange={(e) => renameTaskType(t.id, e.target.value)}
                          className={`${fieldCls} mt-0`}
                        />
                        <button
                          type="button"
                          title="Удалить тип"
                          disabled={selected.taskTypes.length <= 1}
                          onClick={() => removeTaskType(t.id)}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--v2-ink-300)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-800)] disabled:opacity-30"
                        >
                          <V2Icons.trash className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTaskType();
                        }
                      }}
                      placeholder="Новый тип, например Strategy"
                      className={`${fieldCls} mt-0`}
                    />
                    <button
                      type="button"
                      onClick={addTaskType}
                      disabled={!newType.trim()}
                      className="v2-tight h-11 shrink-0 rounded-xl border border-[var(--v2-ink-200)] px-4 text-[13px] font-medium text-[var(--v2-ink-700)] transition hover:border-[var(--v2-ink-300)] hover:text-[var(--v2-ink-900)] disabled:opacity-40"
                    >
                      Добавить
                    </button>
                  </div>
                </div>

                {projects.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeProject(selected.id)}
                    className="v2-tight mt-8 text-[12.5px] font-medium text-red-600/80 transition hover:text-red-700"
                  >
                    Удалить проект
                  </button>
                ) : null}
              </>
            ) : (
              <p className="v2-tight text-[14px] text-[var(--v2-ink-500)]">Создайте первый проект.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--v2-ink-100)] bg-[var(--v2-ink-50)] px-8 py-4">
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
              const cleaned = projects
                .map((p) => ({
                  ...p,
                  name: p.name.trim() || "Проект",
                  role: p.role.trim() || "Проект",
                  taskTypes: p.taskTypes
                    .map((t) => ({ ...t, name: t.name.trim() }))
                    .filter((t) => t.name),
                }))
                .filter((p) => p.taskTypes.length > 0);
              if (!cleaned.length) return;
              onSave(cleaned);
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

