"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

function currentMonthYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type MonthlyPayload = {
  month: string;
  totalHours: number;
  byWorker: Array<{ name: string; hours: number }>;
  byTaskType: Array<{ label: string; hours: number; type: string }>;
};

type ProjectHit = { id: string; name: string; totalHours: number };

type ProjectDetail = {
  card: { id: string; name: string };
  totalHours: number;
  workerList: string[];
  byWorker: Record<string, { hours: number }>;
  matrix: Array<{
    phaseTitle: string;
    phaseHours: number;
    byWorker: Record<string, { hours: number }>;
  }>;
};

type EmployeePayload = {
  name: string;
  month: string;
  totalHours: number;
  byProject: Array<{ cardId: string; name: string; hours: number }>;
  byTaskType: Array<{ label: string; hours: number; type: string }>;
};

export default function TimeAnalyticsPage() {
  const [monthYm, setMonthYm] = useState(currentMonthYm);
  const [monthly, setMonthly] = useState<MonthlyPayload | null>(null);
  const [monthlyErr, setMonthlyErr] = useState<string | null>(null);
  const [loadingMonthly, setLoadingMonthly] = useState(true);

  const [projectQuery, setProjectQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [projects, setProjects] = useState<ProjectHit[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [projectErr, setProjectErr] = useState<string | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);

  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [employee, setEmployee] = useState<EmployeePayload | null>(null);
  const [employeeErr, setEmployeeErr] = useState<string | null>(null);
  const [loadingEmployee, setLoadingEmployee] = useState(false);

  const [workers, setWorkers] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(projectQuery.trim()), 320);
    return () => clearTimeout(t);
  }, [projectQuery]);

  const loadMonthly = useCallback(async () => {
    setLoadingMonthly(true);
    setMonthlyErr(null);
    try {
      const r = await fetch(apiUrl(`/api/time-analytics/monthly?month=${encodeURIComponent(monthYm)}`));
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Ошибка загрузки");
      setMonthly(data as MonthlyPayload);
    } catch (e) {
      setMonthly(null);
      setMonthlyErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoadingMonthly(false);
    }
  }, [monthYm]);

  useEffect(() => {
    void loadMonthly();
  }, [loadMonthly]);

  useEffect(() => {
    if (!debouncedQ) {
      setProjects([]);
      return;
    }
    let cancelled = false;
    setLoadingProjects(true);
    void (async () => {
      try {
        const r = await fetch(
          apiUrl(`/api/time-analytics/projects?q=${encodeURIComponent(debouncedQ)}`)
        );
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Ошибка");
        if (!cancelled) setProjects((data.projects || []) as ProjectHit[]);
      } catch {
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQ]);

  const loadProjectDetail = useCallback(async (id: string) => {
    setLoadingProject(true);
    setProjectErr(null);
    try {
      const r = await fetch(apiUrl(`/api/time-analytics/project/${encodeURIComponent(id)}`));
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Не найдено");
      setProjectDetail(data as ProjectDetail);
    } catch (e) {
      setProjectDetail(null);
      setProjectErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoadingProject(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectDetail(null);
      return;
    }
    void loadProjectDetail(selectedProjectId);
  }, [selectedProjectId, loadProjectDetail]);

  const loadEmployee = useCallback(async (name: string, month: string) => {
    setLoadingEmployee(true);
    setEmployeeErr(null);
    try {
      const r = await fetch(
        apiUrl(
          `/api/time-analytics/employee?name=${encodeURIComponent(name)}&month=${encodeURIComponent(month)}`
        )
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Ошибка");
      setEmployee(data as EmployeePayload);
    } catch (e) {
      setEmployee(null);
      setEmployeeErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoadingEmployee(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedWorker) {
      setEmployee(null);
      return;
    }
    void loadEmployee(selectedWorker, monthYm);
  }, [selectedWorker, monthYm, loadEmployee]);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch(apiUrl("/api/time-analytics/workers"));
        const data = await r.json();
        if (r.ok && Array.isArray(data.workers)) setWorkers(data.workers as string[]);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const matrixWorkers = useMemo(() => projectDetail?.workerList ?? [], [projectDetail]);

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link href={appPath("/board")} className="text-sm text-[var(--muted-foreground)] hover:text-[var(--text)] underline">
          ← Канбан
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-[var(--text)] mb-1">Аналитика времени</h1>
      <p className="text-sm text-[var(--muted-foreground)] mb-8">
        Сводка за месяц, разрез по сотрудникам и типам задач, детализация по проектам и этапам.
      </p>

      <section className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] p-4 md:p-6 mb-8">
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Месяц</label>
            <input
              type="month"
              value={monthYm}
              onChange={(e) => setMonthYm(e.target.value)}
              className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm"
            />
          </div>
          {loadingMonthly ? (
            <span className="text-sm text-[var(--muted-foreground)]">Загрузка…</span>
          ) : monthly ? (
            <div className="text-lg font-semibold text-[var(--text)] tabular-nums">
              Всего: {monthly.totalHours} ч
            </div>
          ) : null}
        </div>
        {monthlyErr && <p className="text-sm text-red-600 mb-4">{monthlyErr}</p>}

        {monthly && (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)] mb-2">По сотрудникам</h2>
              <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)]">
                      <th className="py-2 px-3">Сотрудник</th>
                      <th className="py-2 px-3 text-right">Часы</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.byWorker.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="py-4 px-3 text-[var(--muted-foreground)]">
                          Нет закрытых сессий за этот месяц
                        </td>
                      </tr>
                    ) : (
                      monthly.byWorker.map((row) => (
                        <tr key={row.name} className="border-b border-[var(--border)]">
                          <td className="py-2 px-3">
                            <button
                              type="button"
                              onClick={() => setSelectedWorker(row.name)}
                              className="text-left font-medium text-emerald-800 hover:underline"
                            >
                              {row.name}
                            </button>
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums">{row.hours} ч</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)] mb-2">По типу задачи</h2>
              <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)]">
                      <th className="py-2 px-3">Тип</th>
                      <th className="py-2 px-3 text-right">Часы</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.byTaskType.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="py-4 px-3 text-[var(--muted-foreground)]">
                          Нет данных
                        </td>
                      </tr>
                    ) : (
                      monthly.byTaskType.map((row) => (
                        <tr key={row.type || "__empty"} className="border-b border-[var(--border)]">
                          <td className="py-2 px-3">{row.label}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{row.hours} ч</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] p-4 md:p-6 mb-8">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-1">Проект</h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">
          Поиск по названию карточки канбана — часы по этапам и сотрудникам (только завершённые сессии).
        </p>
        <input
          type="search"
          value={projectQuery}
          onChange={(e) => setProjectQuery(e.target.value)}
          placeholder="Начните вводить название проекта…"
          className="w-full max-w-md px-3 py-2 border border-[var(--border)] rounded-lg text-sm mb-3"
        />
        {loadingProjects && debouncedQ ? (
          <p className="text-xs text-[var(--muted-foreground)] mb-2">Поиск…</p>
        ) : null}
        {projects.length > 0 && (
          <ul className="space-y-1 mb-6 max-h-48 overflow-y-auto border border-[var(--border)] rounded-lg p-2">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProjectId(p.id);
                    setProjectQuery(p.name);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-sm ${
                    selectedProjectId === p.id
                      ? "bg-emerald-100 text-emerald-900 font-medium"
                      : "hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-[var(--muted-foreground)] tabular-nums"> · {p.totalHours} ч всего</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {selectedProjectId && (
          <div className="border-t border-[var(--border)] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h3 className="text-base font-semibold text-[var(--text)]">
                {projectDetail?.card.name ?? "Проект"}
              </h3>
              <Link
                href={appPath(`/board/${selectedProjectId}`)}
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                Открыть учёт времени
              </Link>
            </div>
            {loadingProject && <p className="text-sm text-[var(--muted-foreground)]">Загрузка…</p>}
            {projectErr && <p className="text-sm text-red-600">{projectErr}</p>}
            {projectDetail && !loadingProject && (
              <>
                <p className="text-lg font-semibold text-[var(--text)] tabular-nums mb-4">
                  Всего по проекту: {projectDetail.totalHours} ч
                </p>
                <h4 className="text-sm font-semibold text-[var(--text)] mb-2">По сотрудникам</h4>
                <ul className="flex flex-wrap gap-2 mb-6">
                  {matrixWorkers.map((w) => (
                    <li
                      key={w}
                      className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] text-sm text-[var(--text)] tabular-nums"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedWorker(w)}
                        className="font-medium text-emerald-800 hover:underline"
                      >
                        {w}
                      </button>
                      : {projectDetail.byWorker[w]?.hours ?? 0} ч
                    </li>
                  ))}
                </ul>
                <h4 className="text-sm font-semibold text-[var(--text)] mb-2">Этап × сотрудник (часы)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs md:text-sm border border-[var(--border)] rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-[var(--surface-2)] text-left text-[var(--muted-foreground)]">
                        <th className="py-2 px-2 border-b border-[var(--border)] sticky left-0 bg-[var(--surface-2)] z-10 min-w-[8rem]">
                          Этап
                        </th>
                        {matrixWorkers.map((w) => (
                          <th
                            key={w}
                            className="py-2 px-2 border-b border-[var(--border)] whitespace-nowrap text-right min-w-[4.5rem]"
                          >
                            {w}
                          </th>
                        ))}
                        <th className="py-2 px-2 border-b border-[var(--border)] text-right font-semibold">Σ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectDetail.matrix.length === 0 ? (
                        <tr>
                          <td
                            colSpan={matrixWorkers.length + 2}
                            className="py-4 px-2 text-[var(--muted-foreground)] text-center"
                          >
                            Нет этапов или нет учтённого времени
                          </td>
                        </tr>
                      ) : (
                        projectDetail.matrix.map((row) => (
                          <tr key={row.phaseTitle} className="border-b border-[var(--border)]">
                            <td className="py-2 px-2 font-medium text-[var(--text)] sticky left-0 bg-[var(--surface)] z-10">
                              {row.phaseTitle}
                            </td>
                            {matrixWorkers.map((w) => (
                              <td key={w} className="py-2 px-2 text-right tabular-nums text-[var(--text)]">
                                {(row.byWorker[w]?.hours ?? 0) > 0 ? row.byWorker[w].hours : "—"}
                              </td>
                            ))}
                            <td className="py-2 px-2 text-right font-medium tabular-nums">
                              {row.phaseHours} ч
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      <section className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] p-4 md:p-6 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-[var(--text)]">Сотрудник за месяц</h2>
          {workers.length > 0 && (
            <select
              value={selectedWorker ?? ""}
              onChange={(e) => setSelectedWorker(e.target.value || null)}
              className="text-sm border border-[var(--border)] rounded-lg px-2 py-1.5 bg-[var(--surface)] max-w-[16rem]"
            >
              <option value="">— выберите из списка</option>
              {workers.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
              <option value="(не указан)">(не указан)</option>
              {selectedWorker &&
              selectedWorker !== "(не указан)" &&
              !workers.includes(selectedWorker) ? (
                <option value={selectedWorker}>{selectedWorker}</option>
              ) : null}
            </select>
          )}
        </div>
        {!selectedWorker ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Нажмите имя в таблице «По сотрудникам», в блоке проекта или выберите в списке.
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--muted-foreground)] mb-2">
              <span className="font-semibold text-[var(--text)]">{selectedWorker}</span>,{" "}
              {monthYm}:{" "}
              {loadingEmployee ? (
                "…"
              ) : employee ? (
                <span className="tabular-nums font-semibold">{employee.totalHours} ч всего</span>
              ) : null}
            </p>
            {employeeErr && <p className="text-sm text-red-600 mb-2">{employeeErr}</p>}
            {employee && !loadingEmployee && (
              <div className="grid gap-6 md:grid-cols-2 mt-4">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)] mb-2">По проектам</h3>
                  <ul className="space-y-1 text-sm">
                    {employee.byProject.length === 0 ? (
                      <li className="text-[var(--muted-foreground)]">Нет данных</li>
                    ) : (
                      employee.byProject.map((p) => (
                        <li key={p.cardId} className="flex justify-between gap-2 border-b border-[var(--border)] py-1">
                          <button
                            type="button"
                            onClick={() => setSelectedProjectId(p.cardId)}
                            className="text-left text-emerald-800 hover:underline font-medium truncate"
                          >
                            {p.name}
                          </button>
                          <span className="tabular-nums text-[var(--muted-foreground)] shrink-0">{p.hours} ч</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)] mb-2">По типу задачи</h3>
                  <ul className="space-y-1 text-sm">
                    {employee.byTaskType.length === 0 ? (
                      <li className="text-[var(--muted-foreground)]">Нет данных</li>
                    ) : (
                      employee.byTaskType.map((t) => (
                        <li
                          key={t.type || "__"}
                          className="flex justify-between gap-2 border-b border-[var(--border)] py-1"
                        >
                          <span>{t.label}</span>
                          <span className="tabular-nums text-[var(--muted-foreground)]">{t.hours} ч</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
