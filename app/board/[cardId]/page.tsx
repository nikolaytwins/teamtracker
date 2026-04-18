"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import type { ExtendedCardPhasesPayload } from "@/lib/extend-card-phases-payload";
import { TIME_TASK_TYPE_OPTIONS, labelForTaskType } from "@/lib/time-task-types";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CardCommentsPanel } from "@/components/board/CardCommentsPanel";
import { ProjectSubtasksPanel } from "@/components/board/ProjectSubtasksPanel";

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
  subtask_id?: string | null;
};

type PhaseRow = {
  id: string;
  card_id: string;
  title: string;
  sort_order: number;
  created_at: string;
  totalSeconds: number;
};

type Payload = ExtendedCardPhasesPayload;

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
  const [linkedLeadId, setLinkedLeadId] = useState<string | null>(null);
  const [logWorkerFilter, setLogWorkerFilter] = useState("");
  const [logTaskTypeFilter, setLogTaskTypeFilter] = useState("");

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

  useEffect(() => {
    const sourceProjectId = payload?.card?.source_project_id;
    if (!sourceProjectId) {
      setLinkedLeadId(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch(apiUrl(`/api/agency/projects/${sourceProjectId}`));
        const data = await r.json();
        if (!cancelled && r.ok) {
          setLinkedLeadId(typeof data.source_lead_id === "string" ? data.source_lead_id : null);
        }
      } catch {
        if (!cancelled) setLinkedLeadId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payload?.card?.source_project_id]);
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

  const entries = payload?.entries ?? [];
  const completedEntries = useMemo(
    () => entries.filter((e) => e.ended_at && e.duration_seconds != null),
    [entries]
  );
  const analyticsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of completedEntries) {
      const key = e.started_at.slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + (e.duration_seconds ?? 0));
    }
    return [...map.entries()]
      .map(([day, sec]) => ({ day, sec }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [completedEntries]);
  const analyticsByTaskType = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of completedEntries) {
      const type = (e.task_type ?? "").trim();
      map.set(type, (map.get(type) ?? 0) + (e.duration_seconds ?? 0));
    }
    return [...map.entries()]
      .map(([type, sec]) => ({ type, sec }))
      .sort((a, b) => b.sec - a.sec);
  }, [completedEntries]);
  const logWorkers = useMemo(() => {
    const set = new Set(entries.map((e) => e.worker_name?.trim()).filter((x): x is string => Boolean(x)));
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [entries]);
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const byWorker = logWorkerFilter ? (e.worker_name || "").trim() === logWorkerFilter : true;
      const byType = logTaskTypeFilter ? (e.task_type || "") === logTaskTypeFilter : true;
      return byWorker && byType;
    });
  }, [entries, logWorkerFilter, logTaskTypeFilter]);

  const cardAssignees = useMemo(() => {
    if (!payload?.card?.extra) return [] as string[];
    try {
      const ex = JSON.parse(payload.card.extra);
      const raw = ex.assignees ?? (ex.assignee ? [ex.assignee] : []);
      return Array.isArray(raw)
        ? raw.filter((n: unknown): n is string => typeof n === "string" && n.trim().length > 0)
        : [];
    } catch {
      return [];
    }
  }, [payload?.card?.extra]);

  const matrixWorkerColumns = useMemo(() => {
    const tm = payload?.timeMatrix ?? [];
    const set = new Set<string>();
    for (const row of tm) {
      for (const w of Object.keys(row.byWorker)) {
        if ((row.byWorker[w]?.seconds ?? 0) > 0) set.add(w);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [payload?.timeMatrix]);

  if (!cardId) return <div className="p-6">Некорректная ссылка</div>;
  if (loading) return <div className="p-6">Загрузка…</div>;
  if (error && !payload) return <div className="p-6 text-red-600">{error}</div>;
  if (!payload?.card) return <div className="p-6 text-red-600">Карточка не найдена</div>;

  const card = payload.card;

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link
          href={appPath("/board")}
          className="text-sm text-[var(--muted-foreground)] hover:text-[var(--text)] underline"
        >
          ← Проекты
        </Link>
        <Link
          href={appPath("/board/time-analytics")}
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          Аналитика времени
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-[var(--text)] mb-1">{card.name}</h1>
      <p className="text-sm text-[var(--muted-foreground)] mb-3">
        Этапы, подзадачи и таймтрекер. Статусы колонок канбана меняются на доске «Проекты».
      </p>
      {cardAssignees.length > 0 ? (
        <p className="text-sm text-[var(--text)] mb-4">
          <span className="text-[var(--muted-foreground)]">Ответственные в карточке:</span>{" "}
          {cardAssignees.join(", ")}
        </p>
      ) : null}
      {linkedLeadId ? (
        <p className="text-sm text-blue-700 mb-4">
          Связанный лид:{" "}
          <Link href={appPath(`/sales/leads#lead-${linkedLeadId}`)} className="hover:underline">
            открыть в воронке
          </Link>
        </p>
      ) : null}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
        <h2 className="text-base font-semibold text-[var(--text)]">Этапы и подзадачи</h2>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">Синхронизировано со списком на доске.</p>
        <ProjectSubtasksPanel cardId={cardId} onChanged={() => void load()} />
      </div>

      <div className="mb-6">
        <CardCommentsPanel cardId={cardId} />
      </div>

      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] p-4 mb-6">
        <div className="grid gap-6 md:grid-cols-2 md:items-start">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">Всего по проекту</div>
              <div className="text-2xl font-semibold text-[var(--text)] tabular-nums">
                {formatDuration(payload.projectTotalSeconds + driftSec)}
              </div>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                Этапов: {payload.phases.length}
                {payload.phases.length > 0
                  ? ` · ${payload.phases
                      .slice(0, 5)
                      .map((p) => p.title)
                      .join(", ")}${payload.phases.length > 5 ? "…" : ""}`
                  : ""}
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
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)]/30 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] mb-2">
              Окупаемость
            </div>
            {payload.economics ? (
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-2 tabular-nums">
                  <span className="text-[var(--muted-foreground)]">Оплачено</span>
                  <span className="font-semibold text-emerald-700">
                    {payload.economics.paidAmount.toLocaleString("ru-RU")} ₽
                  </span>
                </div>
                <div className="flex justify-between gap-2 tabular-nums">
                  <span className="text-[var(--muted-foreground)]">По договору</span>
                  <span className="text-[var(--text)]">
                    {payload.economics.totalAmount.toLocaleString("ru-RU")} ₽
                  </span>
                </div>
                <div className="flex justify-between gap-2 tabular-nums">
                  <span className="text-[var(--muted-foreground)]">Учтено часов</span>
                  <span className="text-[var(--text)]">{payload.economics.completedHours} ч</span>
                </div>
                <div className="flex justify-between gap-2 tabular-nums">
                  <span className="text-[var(--muted-foreground)]">₽ за отработанный час</span>
                  <span className="font-medium text-[var(--text)]">
                    {payload.economics.effectiveHourlyPaidRub != null
                      ? `${payload.economics.effectiveHourlyPaidRub.toLocaleString("ru-RU")} ₽/ч`
                      : "—"}
                  </span>
                </div>
                <Link
                  href={appPath(`/agency/projects/${payload.economics.projectId}`)}
                  className="inline-block pt-1 text-xs font-medium text-[var(--primary)] hover:underline"
                >
                  Открыть проект в финансах →
                </Link>
              </div>
            ) : card.source_project_id?.trim() ? (
              <p className="text-xs text-amber-800">
                В агентстве не найден проект с этим id — проверьте привязку карточки.
              </p>
            ) : (
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Чтобы видеть оплату и эффективную ставку, создайте карточку из проекта агентства или привяжите{" "}
                <code className="rounded bg-[var(--surface-2)] px-1">source_project_id</code>.
              </p>
            )}
          </div>
        </div>
        {active && !active.ended_at && (
          <p className="text-sm text-emerald-700 mt-4 border-t border-[var(--border)] pt-3">
            Идёт учёт… {formatDuration(sessionElapsedSec)} ·{" "}
            {active.worker_name ? active.worker_name : "—"} ·{" "}
            {labelForTaskType(active.task_type)} · этап:{" "}
            {payload.phases.find((p) => p.id === active.phase_id)?.title ?? "—"}
          </p>
        )}
      </div>

      {(payload.timeMatrix ?? []).length > 0 && matrixWorkerColumns.length > 0 ? (
        <div className="mb-6 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-base font-semibold text-[var(--text)]">Часы по этапам и сотрудникам</h2>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              Завершённые сессии и текущий таймер (если запущен).
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
                  <th className="py-2 pl-4 pr-2 font-medium">Этап</th>
                  <th className="py-2 px-2 font-medium tabular-nums">Σ</th>
                  {matrixWorkerColumns.map((w) => (
                    <th key={w} className="py-2 px-2 font-medium">
                      {w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(payload.timeMatrix ?? []).map((row) => (
                  <tr key={row.phaseId} className="border-b border-[var(--border)]/80">
                    <td className="py-2 pl-4 pr-2 text-[var(--text)]">{row.phaseTitle}</td>
                    <td className="py-2 px-2 tabular-nums text-[var(--muted-foreground)]">
                      {row.phaseHours > 0 ? `${row.phaseHours} ч` : "—"}
                    </td>
                    {matrixWorkerColumns.map((w) => {
                      const h = row.byWorker[w]?.hours ?? 0;
                      return (
                        <td key={w} className="py-2 px-2 tabular-nums text-[var(--text)]">
                          {h > 0 ? `${h} ч` : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (payload.phases.length > 0 || (payload.timeMatrix ?? []).length > 0) ? (
        <p className="mb-6 text-sm text-[var(--muted-foreground)]">
          Этапы заведены, но пока нет учтённого времени — нажмите «Приступил» на нужном этапе.
        </p>
      ) : null}

      {payload.workerBreakdown && Object.keys(payload.workerBreakdown).length > 0 ? (
        <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-2">Итого по людям</h2>
          <ul className="space-y-1 text-sm">
            {Object.entries(payload.workerBreakdown)
              .filter(([, v]) => v.seconds > 0)
              .sort((a, b) => b[1].seconds - a[1].seconds)
              .map(([name, v]) => (
                <li key={name} className="flex justify-between gap-2 tabular-nums">
                  <span className="text-[var(--text)]">{name}</span>
                  <span className="text-[var(--muted-foreground)]">{v.hours} ч</span>
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] p-4 mb-6 space-y-3">
        <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Перед «Приступил»</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-[var(--muted-foreground)] mb-1">Сотрудник</label>
            <select
              value={workerSelect}
              onChange={(e) => setWorkerSelect(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)]"
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
              className="mt-2 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm"
            />
            {!effectiveWorker ? (
              <p className="text-xs text-amber-700 mt-1">Нужно выбрать или ввести сотрудника.</p>
            ) : null}
          </div>
          <div>
            <label className="block text-xs text-[var(--muted-foreground)] mb-1">Тип задачи</label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)]"
            >
              <option value="">— не указан</option>
              {TIME_TASK_TYPE_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--muted-foreground)] mt-2">
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
          className="flex-1 min-w-[200px] px-3 py-2 border border-[var(--border)] rounded-lg text-sm"
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
          <p className="text-[var(--muted-foreground)] text-sm">Добавьте этапы — затем нажмите «Приступил» на нужном.</p>
        ) : (
          payload.phases.map((p) => {
            const isRunning = active && !active.ended_at && active.phase_id === p.id;
            const displaySec = p.totalSeconds + (isRunning ? driftSec : 0);
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4"
              >
                <div>
                  <div className="font-medium text-[var(--text)]">{p.title}</div>
                  <div className="text-sm text-[var(--muted-foreground)] tabular-nums">Время: {formatDuration(displaySec)}</div>
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
                    className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] disabled:opacity-40"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Аналитика проекта</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--border)] p-3">
              <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
                По дням
              </div>
              {analyticsByDay.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">Нет завершённых сессий</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {analyticsByDay.map((d) => (
                    <li key={d.day} className="flex justify-between gap-2">
                      <span className="text-[var(--muted-foreground)]">{new Date(d.day).toLocaleDateString("ru-RU")}</span>
                      <span className="tabular-nums text-[var(--text)]">{formatDuration(d.sec)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg border border-[var(--border)] p-3">
              <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
                По типам задач
              </div>
              {analyticsByTaskType.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">Нет завершённых сессий</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {analyticsByTaskType.map((t) => (
                    <li key={t.type || "__empty"} className="flex justify-between gap-2">
                      <span className="text-[var(--muted-foreground)]">{labelForTaskType(t.type || null)}</span>
                      <span className="tabular-nums text-[var(--text)]">{formatDuration(t.sec)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <h2 className="text-lg font-semibold text-[var(--text)] p-4 border-b border-[var(--border)]">Сессии</h2>
        <div className="px-4 py-3 border-b border-[var(--border)] grid gap-3 md:grid-cols-2">
          <select
            value={logWorkerFilter}
            onChange={(e) => setLogWorkerFilter(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)]"
          >
            <option value="">Все сотрудники</option>
            {logWorkers.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
          <select
            value={logTaskTypeFilter}
            onChange={(e) => setLogTaskTypeFilter(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)]"
          >
            <option value="">Все типы задач</option>
            {TIME_TASK_TYPE_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)]">
                <th className="py-2 px-4">Начало</th>
                <th className="py-2 px-4">Конец</th>
                <th className="py-2 px-4">Длительность</th>
                <th className="py-2 px-4">Сотрудник</th>
                <th className="py-2 px-4">Тип задачи</th>
                <th className="py-2 px-4">Заметка</th>
                <th className="py-2 px-4">Этап</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-[var(--muted-foreground)]">
                    Записей пока нет
                  </td>
                </tr>
              ) : (
                filteredEntries.map((e) => {
                  const phaseTitle = payload.phases.find((p) => p.id === e.phase_id)?.title ?? e.phase_id;
                  const dur =
                    e.duration_seconds != null
                      ? e.duration_seconds
                      : Math.floor((Date.now() - new Date(e.started_at).getTime()) / 1000);
                  return (
                    <tr key={e.id} className="border-b border-[var(--border)]">
                      <td className="py-2 px-4 whitespace-nowrap text-[var(--text)]">
                        {new Date(e.started_at).toLocaleString("ru-RU")}
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap text-[var(--muted-foreground)]">
                        {e.ended_at ? new Date(e.ended_at).toLocaleString("ru-RU") : "…"}
                      </td>
                      <td className="py-2 px-4 tabular-nums">{formatDuration(dur)}</td>
                      <td className="py-2 px-4 text-[var(--text)]">
                        {e.worker_name?.trim() ? e.worker_name : "—"}
                      </td>
                      <td className="py-2 px-4 text-[var(--muted-foreground)]">{labelForTaskType(e.task_type)}</td>
                      <td className="py-2 px-4 text-[var(--muted-foreground)]">{e.task_note?.trim() ? e.task_note : "—"}</td>
                      <td className="py-2 px-4 text-[var(--text)]">{phaseTitle}</td>
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
