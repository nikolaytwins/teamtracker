"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import {
  PRESENTATION_TASK_PRESETS,
  SALES_TASK,
  SITE_TASK_PRESETS,
  parseCardProjectType,
} from "@/lib/work-presets";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type PmCard = {
  id: string;
  name: string;
  extra?: string | null;
};

type ActiveInfo = {
  cardId: string;
  cardName: string;
  startedAt: string;
  taskLabel: string;
};

type StatsPayload = {
  month: string;
  totalHours: number;
  breakdown: Array<{ taskType: string; label: string; hours: number }>;
  buckets: Array<{ id: string; label: string; hours: number }>;
  averages: Array<{ taskType: string; label: string; avgHours: number; sessions: number }>;
};

function currentMonthYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    name: string;
    title: string;
    avatarUrl: string | null;
  } | null>(null);
  const [cards, setCards] = useState<PmCard[]>([]);
  const [cardId, setCardId] = useState("");
  const [taskChoice, setTaskChoice] = useState<string>("sales");
  const [customText, setCustomText] = useState("");
  const [active, setActive] = useState<ActiveInfo | null>(null);
  /** Avoid Date.now() in useState initializer — SSR and client differ → hydration errors and broken clicks. */
  const [nowTs, setNowTs] = useState(0);
  const [monthYm, setMonthYm] = useState(currentMonthYm);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const projectType = useMemo(() => {
    const c = cards.find((x) => x.id === cardId);
    return parseCardProjectType(c?.extra ?? null);
  }, [cards, cardId]);

  const presetOptions = useMemo(() => {
    if (projectType === "presentation") return [...PRESENTATION_TASK_PRESETS];
    if (projectType === "site") return [...SITE_TASK_PRESETS];
    return [...SITE_TASK_PRESETS, ...PRESENTATION_TASK_PRESETS];
  }, [projectType]);

  useEffect(() => {
    const valid =
      taskChoice === "sales" ||
      taskChoice === "custom" ||
      presetOptions.some((p) => p.key === taskChoice);
    if (!valid) setTaskChoice("sales");
  }, [cardId, presetOptions, taskChoice]);

  const loadMe = useCallback(async () => {
    const r = await fetch(apiUrl("/api/auth/me"));
    const d = await r.json();
    if (d.user) setUser(d.user);
  }, []);

  const loadCards = useCallback(async () => {
    const r = await fetch(apiUrl("/api/cards"));
    if (!r.ok) return;
    const data = (await r.json()) as PmCard[];
    setCards(data);
  }, []);

  const loadActive = useCallback(async () => {
    const r = await fetch(apiUrl("/api/me/timer/active"));
    const d = await r.json();
    if (d.active) {
      setActive({
        cardId: d.active.cardId,
        cardName: d.active.cardName,
        startedAt: d.active.startedAt,
        taskLabel: d.active.taskLabel,
      });
    } else {
      setActive(null);
    }
  }, []);

  const loadStats = useCallback(async () => {
    const r = await fetch(apiUrl(`/api/me/stats?month=${encodeURIComponent(monthYm)}`));
    if (!r.ok) return;
    const d = await r.json();
    setStats(d as StatsPayload);
  }, [monthYm]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await Promise.all([loadMe(), loadCards(), loadActive()]);
      setLoading(false);
    })();
  }, [loadMe, loadCards, loadActive]);

  useEffect(() => {
    void loadStats();
  }, [monthYm, loadStats]);

  useEffect(() => {
    if (!active) return;
    setNowTs(Date.now());
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const elapsedSec = useMemo(() => {
    if (!active) return 0;
    return Math.floor((nowTs - new Date(active.startedAt).getTime()) / 1000);
  }, [active, nowTs]);

  function formatDur(sec: number): string {
    const s = Math.max(0, sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h > 0) return `${h}ч ${m}м ${r}с`;
    if (m > 0) return `${m}м ${r}с`;
    return `${r}с`;
  }

  async function startSession() {
    setErr(null);
    if (!cardId) {
      setErr("Выберите проект");
      return;
    }
    if (taskChoice === "custom" && !customText.trim()) {
      setErr("Опишите задачу");
      return;
    }
    const payloadTaskType =
      taskChoice === "custom" ? "custom" : taskChoice === "sales" ? SALES_TASK.key : taskChoice;
    setActionBusy(true);
    try {
      const r = await fetch(apiUrl("/api/me/timer/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId,
          taskType: payloadTaskType,
          taskNote: taskChoice === "custom" ? customText.trim() : "",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка");
      await loadActive();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setActionBusy(false);
    }
  }

  async function stopSession() {
    setActionBusy(true);
    setErr(null);
    try {
      const r = await fetch(apiUrl("/api/me/timer/stop"), { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка");
      setActive(null);
      await loadStats();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setActionBusy(false);
    }
  }

  async function logout() {
    await fetch(apiUrl("/api/auth/logout"), { method: "POST" });
    router.push(appPath("/login"));
    router.refresh();
  }

  async function onAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      const dataUrl = r.result as string;
      await fetch(apiUrl("/api/me/profile"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: dataUrl }),
      });
      await loadMe();
    };
    r.readAsDataURL(f);
    e.target.value = "";
  }

  if (loading && !user) {
    return <div className="p-8 text-slate-500">Загрузка…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
      <header className="flex flex-wrap items-start gap-6">
        <label className="relative cursor-pointer shrink-0">
          <input type="file" accept="image/*" className="hidden" onChange={onAvatarFile} />
          <div className="w-24 h-24 rounded-2xl bg-slate-200 border-2 border-white shadow-md overflow-hidden flex items-center justify-center text-3xl font-bold text-slate-600">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{user?.name?.charAt(0)?.toUpperCase() ?? "?"}</span>
            )}
          </div>
          <span className="absolute -bottom-1 -right-1 text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded-full">
            фото
          </span>
        </label>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">{user?.name ?? "Профиль"}</h1>
          <p className="text-slate-500 mt-0.5">{user?.title || "Должность не указана"}</p>
          <div className="flex flex-wrap gap-3 mt-6">
            <button
              type="button"
              onClick={() => void logout()}
              className="text-sm text-slate-600 underline"
            >
              Выйти
            </button>
            <Link href={appPath("/board")} className="text-sm font-medium text-emerald-700 hover:underline">
              Канбан
            </Link>
            <Link
              href={appPath("/board/time-analytics")}
              className="text-sm font-medium text-emerald-700 hover:underline"
            >
              Аналитика времени
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Быстрый старт</h2>
        <p className="text-sm text-slate-500">
          Выберите проект и тип задачи. Сессии привязаны к вашему имени в отчётах. Один активный таймер на
          человека.
        </p>
        {err && <p className="text-sm text-red-600">{err}</p>}

        {active && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div>
              <div className="text-xs text-emerald-800 uppercase tracking-wide">Идёт работа</div>
              <div className="font-semibold text-emerald-950">{active.cardName}</div>
              <div className="text-sm text-emerald-800">
                {active.taskLabel} · {formatDur(elapsedSec)}
              </div>
            </div>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => void stopSession()}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              Стоп
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Проект</label>
            <select
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">— выберите карточку канбана</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {projectType && (
              <p className="text-xs text-slate-400 mt-1">
                Тип в карточке:{" "}
                {projectType === "site" ? "сайт" : projectType === "presentation" ? "презентация" : "другое"}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Задача</label>
            <select
              value={taskChoice}
              onChange={(e) => {
                setTaskChoice(e.target.value);
                setCustomText("");
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="sales">{SALES_TASK.label}</option>
              {presetOptions.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
              <option value="custom">Своя задача…</option>
            </select>
          </div>
        </div>

        {taskChoice === "custom" && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Описание</label>
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Кратко, что делаете"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={actionBusy || !!active || !cardId}
            onClick={() => void startSession()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
            Приступил
          </button>
          {!cardId && <span className="text-xs text-amber-700">Сначала выберите проект</span>}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-800">Моя работа за месяц</h2>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Месяц</label>
            <input
              type="month"
              value={monthYm}
              onChange={(e) => setMonthYm(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        </div>
        {stats && (
          <>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums">
              Всего: {stats.totalHours} ч
            </p>
            <h3 className="text-sm font-semibold text-slate-700">По категориям</h3>
            <ul className="space-y-1 text-sm">
              {stats.buckets.length === 0 ? (
                <li className="text-slate-500">Нет данных за месяц</li>
              ) : (
                stats.buckets.map((b) => (
                  <li key={b.id} className="flex justify-between gap-2 border-b border-slate-50 py-1">
                    <span>{b.label}</span>
                    <span className="tabular-nums text-slate-700">{b.hours} ч</span>
                  </li>
                ))
              )}
            </ul>
            <h3 className="text-sm font-semibold text-slate-700 pt-2">Детально по задачам</h3>
            <ul className="space-y-1 text-sm text-slate-600">
              {stats.breakdown.length === 0 ? (
                <li>—</li>
              ) : (
                stats.breakdown.map((r) => (
                  <li key={r.taskType || "__"} className="flex justify-between gap-2">
                    <span>{r.label}</span>
                    <span className="tabular-nums">{r.hours} ч</span>
                  </li>
                ))
              )}
            </ul>
            <h3 className="text-sm font-semibold text-slate-700 pt-2">
              Средняя длительность одной сессии
            </h3>
            <p className="text-xs text-slate-500 mb-2">
              По каждому типу задачи: сколько в среднем у вас уходит на один «приход» в работу.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="py-2 pr-2">Задача</th>
                    <th className="py-2 pr-2">Сессий</th>
                    <th className="py-2">Среднее</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.averages.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-slate-500">
                        Мало данных для средних
                      </td>
                    </tr>
                  ) : (
                    stats.averages.map((a) => (
                      <tr key={a.taskType || "__"} className="border-b border-slate-50">
                        <td className="py-2 pr-2">{a.label}</td>
                        <td className="py-2 pr-2 tabular-nums">{a.sessions}</td>
                        <td className="py-2 tabular-nums">{a.avgHours} ч</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
