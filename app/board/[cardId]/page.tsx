"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import { TIME_TASK_TYPE_OPTIONS, labelForTaskType } from "@/lib/time-task-types";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

const PM_BOARD_TEAM_KEY = "pm-board-team";

type TeamMember = { id: string; name: string; avatar?: string };

function loadTeamFromStorage(): TeamMember[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PM_BOARD_TEAM_KEY);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    if (parsed.length > 0 && typeof parsed[0] === "string") {
      return (parsed as string[]).map((name, i) => ({ id: `t${i}`, name, avatar: undefined }));
    }
    return parsed as TeamMember[];
  } catch {
    return [];
  }
}

type PmTimeEntry = {
  id: string;
  card_id: string;
  phase_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  worker_name: string;
  task_type: string | null;
  task_note: string | null;
};

type PhaseRow = {
  id: string;
  card_id: string;
  title: string;
  sort_order: number;
  created_at: string;
  totalSeconds: number;
};

type Payload = {
  card: { id: string; name: string; deadline: string | null; status: string; extra?: string | null } | null;
  phases: PhaseRow[];
  entries: PmTimeEntry[];
  activeEntry: PmTimeEntry | null;
  projectTotalSeconds: number;
};

function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}ч ${m}м ${sec}с`;
  if (m > 0) return `${m}м ${sec}с`;
  return `${sec}с`;
}

export default function CardPhasesPage() {
  const params = useParams();
  const cardId = typeof params.cardId === "string" ? params.cardId : "";
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(0);
  const [nowTs, setNowTs] = useState(0);
  const [teamList, setTeamList] = useState<TeamMember[]>([]);
  const [workerSelect, setWorkerSelect] = useState("");
  const [workerManual, setWorkerManual] = useState("");
  const [taskType, setTaskType] = useState("");

  useEffect(() => {
    setTeamList(loadTeamFromStorage());
  }, []);

  useEffect(() => {
    if (!payload?.card) return;
    setWorkerManual("");
    try {
      const ex = payload.card.extra ? JSON.parse(payload.card.extra) : {};
      const pt = ex.projectType;
      if (typeof pt === "string" && TIME_TASK_TYPE_OPTIONS.some((o) => o.key === pt)) {
        setTaskType(pt);
      } else {
        setTaskType("");
      }
      const rawAssignees = ex.assignees ?? (ex.assignee ? [ex.assignee] : []);
      const names = Array.isArray(rawAssignees)
        ? rawAssignees.filter((n: unknown): n is string => typeof n === "string" && n.trim().length > 0)
        : [];
      setWorkerSelect(names[0] ?? "");
    } catch {
      setTaskType("");
      setWorkerSelect("");
    }
  }, [payload?.card?.id, payload?.card?.extra]);
  const applyPayload = useCallback((p: Payload) => {
    setPayload(p);
    const t = Date.now();
    setLastSyncAt(t);
    setNowTs(t);
  }, []);

  const load = useCallback(async () => {
    if (!cardId) return;
    setError(null);
    try {
      const r = await fetch(apiUrl(`/api/cards/${cardId}/phases`));
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Не удалось загрузить");
      applyPayload(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [cardId, applyPayload]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = payload?.activeEntry;
  const timerRunning = Boolean(active && !active.ended_at);

  useEffect(() => {
    if (!timerRunning) return;
    setNowTs(Date.now());
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [timerRunning]);

  const driftSec = timerRunning ? Math.floor((nowTs - lastSyncAt) / 1000) : 0;
  const sessionElapsedSec =
    active && !active.ended_at
      ? Math.floor((nowTs - new Date(active.started_at).getTime()) / 1000)
      : 0;

  async function addPhase(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || saving) return;
    setSaving(true);
    try {
      const r = await fetch(apiUrl(`/api/cards/${cardId}/phases`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Ошибка");
      if (data.payload) applyPayload(data.payload);
      setNewTitle("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  const effectiveWorker = workerManual.trim() || workerSelect.trim();

  async function startWork(phaseId: string) {
    if (!effectiveWorker) {
      setError("Укажите сотрудника перед стартом таймера.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(apiUrl(`/api/cards/${cardId}/timer`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          phaseId,
          workerName: effectiveWorker,
          taskType: taskType.trim() || null,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Ошибка");
      if (data.payload) applyPayload(data.payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function stopWork() {
    setSaving(true);
    try {
      const r = await fetch(apiUrl(`/api/cards/${cardId}/timer`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Ошибка");
      if (data.payload) applyPayload(data.payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function removePhase(phaseId: string) {
    if (!confirm("Удалить этап и все записи времени по нему?")) return;
    setSaving(true);
    try {
      const r = await fetch(apiUrl(`/api/cards/${cardId}/phases/${phaseId}`), { method: "DELETE" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Ошибка");
      if (data.payload) applyPayload(data.payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  if (!cardId) return <div className="p-6">Некорректная ссылка</div>;
  if (loading) return <div className="p-6">Загрузка…</div>;
  if (error && !payload) return <div className="p-6 text-red-600">{error}</div>;
  if (!payload?.card) return <div className="p-6 text-red-600">Карточка не найдена</div>;

  const card = payload.card;

  return (
    <div className="min-h-screen bg-slate-50/80 p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link
          href={appPath("/board")}
          className="text-sm text-slate-600 hover:text-slate-900 underline"
        >
          ← Канбан
        </Link>
        <Link
          href={appPath("/board/time-analytics")}
          className="text-sm font-medium text-emerald-700 hover:text-emerald-900 underline"
        >
          Аналитика времени
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">{card.name}</h1>
      <p className="text-sm text-slate-500 mb-6">
        Внутренние этапы и таймтрекер. Колонки канбана здесь не меняются.
      </p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Всего по проекту</div>
            <div className="text-2xl font-semibold text-slate-900 tabular-nums">
              {formatDuration(payload.projectTotalSeconds + driftSec)}
            </div>
          </div>
          {active && !active.ended_at ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void stopWork()}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              Стоп
            </button>
          ) : null}
        </div>
        {active && !active.ended_at && (
          <p className="text-sm text-emerald-700 mt-2">
            Идёт учёт… {formatDuration(sessionElapsedSec)} ·{" "}
            {active.worker_name ? active.worker_name : "—"} ·{" "}
            {labelForTaskType(active.task_type)} · этап:{" "}
            {payload.phases.find((p) => p.id === active.phase_id)?.title ?? "—"}
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 space-y-3">
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Перед «Приступил»</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Сотрудник</label>
            <select
              value={workerSelect}
              onChange={(e) => setWorkerSelect(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">— из списка команды</option>
              {teamList.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
              {workerSelect && !teamList.some((t) => t.name === workerSelect) ? (
                <option value={workerSelect}>{workerSelect}</option>
              ) : null}
            </select>
            <input
              type="text"
              value={workerManual}
              onChange={(e) => setWorkerManual(e.target.value)}
              placeholder="Или введите имя вручную"
              className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
            {!effectiveWorker ? (
              <p className="text-xs text-amber-700 mt-1">Нужно выбрать или ввести сотрудника.</p>
            ) : null}
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Тип задачи</label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">— не указан</option>
              {TIME_TASK_TYPE_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-2">
              Список команды редактируется в канбане (ответственные в карточке).
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={addPhase} className="flex flex-wrap gap-2 mb-6">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Название этапа"
          className="flex-1 min-w-[200px] px-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
        <button
          type="submit"
          disabled={saving || !newTitle.trim()}
          className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 disabled:opacity-50"
        >
          Добавить этап
        </button>
      </form>

      <div className="space-y-3 mb-8">
        {payload.phases.length === 0 ? (
          <p className="text-slate-500 text-sm">Добавьте этапы — затем нажмите «Приступил» на нужном.</p>
        ) : (
          payload.phases.map((p) => {
            const isRunning = active && !active.ended_at && active.phase_id === p.id;
            const displaySec = p.totalSeconds + (isRunning ? driftSec : 0);
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4"
              >
                <div>
                  <div className="font-medium text-slate-800">{p.title}</div>
                  <div className="text-sm text-slate-600 tabular-nums">Время: {formatDuration(displaySec)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={
                      saving || Boolean(active && !active.ended_at) || !effectiveWorker.trim()
                    }
                    onClick={() => void startWork(p.id)}
                    className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    Приступил
                  </button>
                  <button
                    type="button"
                    disabled={saving || Boolean(active && !active.ended_at)}
                    onClick={() => void removePhase(p.id)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <h2 className="text-lg font-semibold text-slate-800 p-4 border-b border-slate-100">Сессии</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-2 px-4">Начало</th>
                <th className="py-2 px-4">Конец</th>
                <th className="py-2 px-4">Длительность</th>
                <th className="py-2 px-4">Сотрудник</th>
                <th className="py-2 px-4">Тип задачи</th>
                <th className="py-2 px-4">Этап</th>
              </tr>
            </thead>
            <tbody>
              {payload.entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    Записей пока нет
                  </td>
                </tr>
              ) : (
                payload.entries.map((e) => {
                  const phaseTitle = payload.phases.find((p) => p.id === e.phase_id)?.title ?? e.phase_id;
                  const dur =
                    e.duration_seconds != null
                      ? e.duration_seconds
                      : Math.floor((Date.now() - new Date(e.started_at).getTime()) / 1000);
                  return (
                    <tr key={e.id} className="border-b border-slate-50">
                      <td className="py-2 px-4 whitespace-nowrap text-slate-700">
                        {new Date(e.started_at).toLocaleString("ru-RU")}
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap text-slate-600">
                        {e.ended_at ? new Date(e.ended_at).toLocaleString("ru-RU") : "…"}
                      </td>
                      <td className="py-2 px-4 tabular-nums">{formatDuration(dur)}</td>
                      <td className="py-2 px-4 text-slate-700">
                        {e.worker_name?.trim() ? e.worker_name : "—"}
                      </td>
                      <td className="py-2 px-4 text-slate-600">{labelForTaskType(e.task_type)}</td>
                      <td className="py-2 px-4 text-slate-700">{phaseTitle}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
