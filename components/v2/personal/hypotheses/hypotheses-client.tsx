"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import { appPath } from "@/lib/api-url";
import {
  STAGE_LABEL,
  VERDICT_META,
  WIP_LIMIT,
  currentSprintId,
  projectColors,
  type Hypothesis,
  type HypothesisProject,
  type HypothesisSprint,
  type HypothesisStage,
  type HypothesisVerdict,
} from "@/lib/v2/personal/hypotheses-meta";
import type { HypothesesBoard } from "@/lib/v2/personal/personal-hypotheses-repo";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const STAGES: HypothesisStage[] = ["backlog", "queue", "active", "done"];
const STAGE_HINT: Record<HypothesisStage, string> = {
  backlog: "все спринты",
  queue: "следующие к проверке",
  active: "",
  done: "",
};

function replaceItem(items: Hypothesis[], next: Hypothesis) {
  return items.map((item) => (item.id === next.id ? next : item));
}

export function HypothesesClient() {
  const [board, setBoard] = useState<HypothesesBoard | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "proj">("board");
  const [flt, setFlt] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hashDone = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchJson<HypothesesBoard>("/api/v2/personal/hypotheses");
      setBoard(data);
      setSel((prev) => prev ?? currentSprintId(data.sprints));
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
    if (!board || hashDone.current) return;
    hashDone.current = true;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    if (hash === "backlog") {
      window.setTimeout(() => {
        document.getElementById("board-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
      return;
    }
    if (board.hypotheses.some((item) => item.id === hash)) setOpenId(hash);
  }, [board]);

  const projects = board?.projects ?? [];
  const sprints = board?.sprints ?? [];
  const items = board?.hypotheses ?? [];
  const sprint = sprints.find((item) => item.id === sel) ?? sprints[0] ?? null;
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  const inFilter = (item: Hypothesis) => flt === "all" || item.project_id === flt;
  const active = items.filter((item) => item.stage === "active" && item.sprint_id === sprint?.id);
  const queue = items.filter((item) => item.stage === "queue");
  const backlog = items.filter((item) => item.stage === "backlog");
  const done = items.filter((item) => item.stage === "done" && item.sprint_id === sprint?.id);
  const open = items.find((item) => item.id === openId) ?? null;

  const patchItem = async (id: string, patch: Record<string, unknown>) => {
    const { hypothesis } = await fetchJson<{ hypothesis: Hypothesis }>(`/api/v2/personal/hypotheses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBoard((prev) => (prev ? { ...prev, hypotheses: replaceItem(prev.hypotheses, hypothesis) } : prev));
    return hypothesis;
  };

  const move = async (id: string, stage: HypothesisStage) => {
    try {
      await patchItem(id, { stage, sprintId: sprint?.id ?? null });
      if (stage === "done") {
        const item = items.find((row) => row.id === id);
        if (item && !item.verdict) setOpenId(id);
      }
    } catch (moveError) {
      window.alert(moveError instanceof Error ? moveError.message : "Не удалось перенести");
    }
  };

  const createItem = async (title: string, openAfter: boolean) => {
    const projectId = flt !== "all" ? flt : (projects[0]?.id ?? null);
    const { hypothesis } = await fetchJson<{ hypothesis: Hypothesis }>("/api/v2/personal/hypotheses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, projectId, stage: "backlog" }),
    });
    setBoard((prev) => (prev ? { ...prev, hypotheses: [...prev.hypotheses, hypothesis] } : prev));
    if (openAfter) setOpenId(hypothesis.id);
  };

  const removeItem = async (id: string) => {
    await fetchJson(`/api/v2/personal/hypotheses/${id}`, { method: "DELETE" });
    setBoard((prev) => (prev ? { ...prev, hypotheses: prev.hypotheses.filter((item) => item.id !== id) } : prev));
    setOpenId(null);
  };

  const addSprint = async () => {
    const { sprint: created } = await fetchJson<{ sprint: HypothesisSprint }>("/api/v2/personal/hypotheses/sprints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    setBoard((prev) => (prev ? { ...prev, sprints: [...prev.sprints, created] } : prev));
    setSel(created.id);
  };

  const takeNext = () => {
    const next = queue[0];
    if (next) void move(next.id, "active");
    else {
      setView("board");
      setFlt("all");
      document.getElementById("board-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-[1720px] flex-col gap-6 px-9 pb-24 pt-7">
        {error ? (
          <div className="v2-tight rounded-xl bg-rose-50 px-4 py-2.5 text-[13px] text-rose-800">{error}</div>
        ) : null}

        <section className="v2-card grid overflow-hidden lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,520px)]">
          <div className="flex min-h-[380px] flex-col justify-center gap-[22px] px-[34px] py-[34px]">
            <div>
              <h1 className="v2-tight text-[40px] font-semibold leading-[1.1] tracking-[-0.036em]">Гипотезы</h1>
              <p className="v2-tight mt-2.5 text-[15.5px] text-[var(--v2-ink-500)]">
                Бэклог → очередь → спринт → вывод. В спринте не больше трёх гипотез одновременно.
              </p>
            </div>
            <div className="grid max-w-[820px] grid-cols-2 gap-3 xl:grid-cols-4">
              <Stat kicker="В работе" value={String(active.length)} extra={`/ ${WIP_LIMIT}`} main />
              <Stat kicker="Очередь" value={String(queue.length)} />
              <Stat kicker="Бэклог" value={String(backlog.length)} />
              <Stat kicker="Проверено" value={String(done.length)} />
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => void createItem("", true)}
                className="inline-flex h-11 items-center rounded-[13px] bg-[#2d5eef] px-[18px] text-[14.5px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(45,94,239,0.8)] hover:bg-[var(--v2-brand-700)]"
              >
                + Гипотеза
              </button>
              <select
                aria-label="Спринт"
                value={sprint?.id ?? ""}
                onChange={(event) => {
                  if (event.target.value === "__new") void addSprint();
                  else setSel(event.target.value);
                }}
                className="h-11 cursor-pointer rounded-[13px] bg-[var(--v2-ink-50)] px-3.5 text-[14.5px] font-semibold text-[var(--v2-ink-700)] outline-none"
              >
                {sprints.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.range_label}
                    {item.is_current ? " · сейчас" : ""}
                  </option>
                ))}
                <option value="__new">+ Новый спринт</option>
              </select>
            </div>
          </div>
          <div className="relative hidden min-h-[380px] overflow-hidden lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={appPath("/home/hypotheses-hero.png")}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-right"
              style={{
                maskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,.5) 14%, #000 36%)",
                WebkitMaskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,.5) 14%, #000 36%)",
              }}
            />
          </div>
        </section>

        <section className="v2-card px-[30px] py-7">
          <div className="mb-[18px] flex flex-wrap items-baseline gap-3.5">
            <h2 className="v2-tight text-[26px] font-semibold tracking-[-0.03em]">
              В работе{sprint ? ` · ${sprint.name}` : ""}
            </h2>
            <span className="v2-tight text-[14.5px] text-[var(--v2-ink-500)]">{sprint?.range_label}</span>
            <span className="ml-auto flex items-center gap-2.5 text-[13.5px] font-semibold text-[var(--v2-ink-500)]">
              {Array.from({ length: WIP_LIMIT }, (_, index) => (
                <i
                  key={index}
                  className={`block h-2 w-[26px] rounded-full ${index < active.length ? "bg-[#2d5eef]" : "bg-[var(--v2-ink-200)]"}`}
                />
              ))}
              <span className="v2-tnum">
                {active.length} / {WIP_LIMIT}
              </span>
            </span>
          </div>
          {loading ? (
            <div className="h-40 animate-pulse rounded-[20px] bg-[var(--v2-ink-50)]" />
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {active.map((item) => (
                <FocusCard
                  key={item.id}
                  item={item}
                  project={projectById.get(item.project_id ?? "")}
                  onOpen={() => setOpenId(item.id)}
                  onPatch={patchItem}
                  onDelete={removeItem}
                />
              ))}
              {Array.from({ length: Math.max(0, WIP_LIMIT - active.length) }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={takeNext}
                  className="flex min-h-[260px] flex-col items-center justify-center gap-1.5 rounded-[20px] bg-[var(--v2-ink-50)] px-5 text-center text-[15px] font-semibold text-[var(--v2-ink-500)] hover:bg-[var(--v2-brand-50)] hover:text-[#2d5eef]"
                >
                  {queue.length ? "+ Взять из очереди" : "Свободный слот"}
                  <small className="block text-[13.5px] font-medium text-[var(--v2-ink-400)]">
                    {queue.length ? `следующая: ${queue[0]?.title}` : "очередь пуста — добавь из бэклога"}
                  </small>
                </button>
              ))}
            </div>
          )}
        </section>

        <div id="board-anchor" className="flex flex-wrap items-center gap-3">
          <div className="inline-flex gap-0.5 rounded-[14px] bg-white p-1 shadow-[var(--v2-shadow-card)]">
            {(
              [
                ["board", "Доска"],
                ["proj", "По проектам"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={`rounded-[10px] px-4 py-2 text-[14px] font-semibold ${
                  view === key ? "bg-[#2d5eef] text-white" : "text-[var(--v2-ink-500)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterChip active={flt === "all"} label="Все проекты" count={items.length} onClick={() => setFlt("all")} />
            {projects.map((project) => {
              const colors = projectColors(project.hue);
              const count = items.filter((item) => item.project_id === project.id).length;
              return (
                <FilterChip
                  key={project.id}
                  active={flt === project.id}
                  label={project.name}
                  count={count}
                  dot={colors.c}
                  onClick={() => setFlt(project.id)}
                />
              );
            })}
          </div>
        </div>

        {view === "board" ? (
          <div className="grid grid-cols-1 items-start gap-3.5 xl:grid-cols-4">
            {STAGES.map((stage) => {
              const column = items.filter((item) => {
                if (item.stage !== stage || !inFilter(item)) return false;
                if (stage === "active" || stage === "done") return item.sprint_id === sprint?.id;
                return true;
              });
              return (
                <div
                  key={stage}
                  className={`min-h-[240px] rounded-[20px] bg-white/50 p-3 ${stage === "active" ? "ring-0" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.currentTarget.classList.add("bg-[var(--v2-brand-50)]");
                  }}
                  onDragLeave={(event) => event.currentTarget.classList.remove("bg-[var(--v2-brand-50)]")}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.currentTarget.classList.remove("bg-[var(--v2-brand-50)]");
                    const id = event.dataTransfer.getData("text/plain");
                    if (id) void move(id, stage);
                  }}
                  id={stage === "backlog" ? "backlog" : undefined}
                >
                  <div className="flex items-center gap-2 px-1.5 pb-3 pt-1.5">
                    <span className={`text-[15px] font-semibold tracking-[-0.015em] ${stage === "active" ? "text-[#2d5eef]" : ""}`}>
                      {STAGE_LABEL[stage]}
                    </span>
                    <span className="v2-tnum text-[12.5px] font-semibold text-[var(--v2-ink-400)]">
                      {column.length}
                      {stage === "active" ? ` / ${WIP_LIMIT}` : ""}
                    </span>
                    <span className="ml-auto text-[12px] text-[var(--v2-ink-400)]">
                      {stage === "active" || stage === "done" ? sprint?.name : STAGE_HINT[stage]}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {column.length ? (
                      column.map((item) => (
                        <BoardCard
                          key={item.id}
                          item={item}
                          project={projectById.get(item.project_id ?? "")}
                          onOpen={() => setOpenId(item.id)}
                          onPatch={patchItem}
                          onDelete={removeItem}
                        />
                      ))
                    ) : (
                      <div className="px-2.5 py-[22px] text-center text-[13.5px] text-[var(--v2-ink-400)]">Перетащи сюда</div>
                    )}
                  </div>
                  {stage === "backlog" ? (
                    <form
                      className="mt-2 flex gap-1.5"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const input = event.currentTarget.elements.namedItem("q") as HTMLInputElement;
                        const value = input.value.trim();
                        if (!value) return;
                        input.value = "";
                        void createItem(value, false);
                      }}
                    >
                      <input
                        name="q"
                        placeholder="Быстро в бэклог…"
                        aria-label="Новая гипотеза"
                        className="h-10 min-w-0 flex-1 rounded-xl bg-white px-3 text-[14px] outline-none focus:ring-2 focus:ring-[var(--v2-brand-500)]"
                      />
                      <button type="submit" aria-label="Добавить" className="h-10 w-10 rounded-xl bg-[var(--v2-ink-900)] text-[18px] text-white">
                        +
                      </button>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {projects
              .filter((project) => flt === "all" || project.id === flt)
              .map((project) => {
                const colors = projectColors(project.hue);
                const rows = items
                  .filter((item) => item.project_id === project.id)
                  .sort((a, b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage));
                const count = (stage: HypothesisStage) => rows.filter((item) => item.stage === stage).length;
                return (
                  <section key={project.id} className="v2-card px-6 py-[22px]" style={{ ["--c" as string]: colors.c }}>
                    <div className="mb-3.5 flex flex-wrap items-center gap-3">
                      <span className="h-3 w-3 rounded" style={{ background: colors.c }} />
                      <h3 className="text-[20px] font-semibold tracking-[-0.025em]">{project.name}</h3>
                      <div className="ml-auto flex gap-3.5 text-[13px] text-[var(--v2-ink-500)]">
                        <span>
                          в работе <b className="text-[var(--v2-ink-900)]">{count("active")}</b>
                        </span>
                        <span>
                          очередь <b className="text-[var(--v2-ink-900)]">{count("queue")}</b>
                        </span>
                        <span>
                          бэклог <b className="text-[var(--v2-ink-900)]">{count("backlog")}</b>
                        </span>
                        <span>
                          проверено <b className="text-[var(--v2-ink-900)]">{count("done")}</b>
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {rows.length ? (
                        rows.map((item) => {
                          const sprintName =
                            item.sprint_id && (item.stage === "active" || item.stage === "done")
                              ? sprints.find((row) => row.id === item.sprint_id)?.name
                              : "";
                          return (
                            <div
                              key={item.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => setOpenId(item.id)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") setOpenId(item.id);
                              }}
                              className="grid w-full cursor-pointer grid-cols-1 items-center gap-3 rounded-[14px] bg-[var(--v2-ink-50)] px-4 py-3 text-left hover:bg-[var(--v2-ink-100)] lg:grid-cols-[200px_minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:gap-[18px]"
                            >
                              <span
                                className={`w-fit rounded-md px-2 py-1 text-[12px] font-semibold whitespace-nowrap ${
                                  item.stage === "active" ? "bg-[#2d5eef] text-white" : "bg-white text-[var(--v2-ink-500)]"
                                }`}
                              >
                                {STAGE_LABEL[item.stage]}
                                {sprintName ? ` · ${sprintName}` : ""}
                              </span>
                              <QuickTitle
                                title={item.title}
                                className="text-[15px] font-semibold tracking-[-0.015em]"
                                onSave={(title) => patchItem(item.id, { title })}
                              />
                              <span className="text-[13.5px] leading-snug text-[var(--v2-ink-500)]">
                                {item.stage === "done" && item.result_text ? item.result_text : item.metric}
                              </span>
                              <span className="flex items-center justify-end gap-2">
                                <VerdictBadge verdict={item.stage === "done" ? item.verdict : null} />
                                <QuickDelete onDelete={() => removeItem(item.id)} />
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-4 text-center text-[13.5px] text-[var(--v2-ink-400)]">Гипотез пока нет</div>
                      )}
                    </div>
                  </section>
                );
              })}
          </div>
        )}
      </div>

      {open ? (
        <HypothesisDrawer
          item={open}
          projects={projects}
          sprints={sprints}
          activeCount={active.length}
          onClose={() => setOpenId(null)}
          onPatch={patchItem}
          onMove={move}
          onDelete={removeItem}
        />
      ) : null}
    </div>
  );
}

function Stat({ kicker, value, extra, main }: { kicker: string; value: string; extra?: string; main?: boolean }) {
  return (
    <div className={`rounded-2xl px-[18px] py-4 text-left ${main ? "bg-[#2d5eef] text-white" : "bg-[var(--v2-ink-50)]"}`}>
      <div className={`text-[11.5px] font-semibold tracking-[0.13em] uppercase ${main ? "text-white/65" : "text-[var(--v2-ink-400)]"}`}>
        {kicker}
      </div>
      <b className="v2-tnum mt-2 block text-[30px] font-semibold tracking-[-0.03em]">
        {value}
        {extra ? <small className={`text-[16px] font-medium ${main ? "text-white/60" : "text-[var(--v2-ink-400)]"}`}>{extra}</small> : null}
      </b>
    </div>
  );
}

function FilterChip({
  active,
  label,
  count,
  dot,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  dot?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-[11px] px-3 py-2 text-[14px] ${
        active ? "bg-white font-semibold text-[var(--v2-ink-900)] shadow-[var(--v2-shadow-card)]" : "bg-white/70 font-medium text-[var(--v2-ink-600)]"
      }`}
    >
      {dot ? <i className="h-2 w-2 rounded-full" style={{ background: dot }} /> : null}
      {label} <b className="v2-tnum text-[12px] font-semibold text-[var(--v2-ink-400)]">{count}</b>
    </button>
  );
}

function ProjectChip({ project }: { project?: HypothesisProject }) {
  if (!project) return null;
  const colors = projectColors(project.hue);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-[12.5px] font-semibold whitespace-nowrap"
      style={{ color: colors.c }}
    >
      <i className="h-[7px] w-[7px] rounded-full" style={{ background: colors.c }} />
      {project.name}
    </span>
  );
}

function VerdictBadge({ verdict }: { verdict: HypothesisVerdict | null }) {
  if (!verdict) return null;
  const meta = VERDICT_META[verdict];
  return (
    <span className="rounded-md px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap" style={{ color: meta.ink, background: meta.soft }}>
      {meta.label}
    </span>
  );
}

function stopCardEvent(event: { stopPropagation: () => void; preventDefault?: () => void }) {
  event.stopPropagation();
}

function QuickDelete({ onDelete }: { onDelete: () => Promise<void> }) {
  return (
    <button
      type="button"
      aria-label="Удалить"
      title="Удалить"
      draggable={false}
      onMouseDown={stopCardEvent}
      onClick={(event) => {
        stopCardEvent(event);
        void onDelete();
      }}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[16px] text-[var(--v2-ink-400)] hover:bg-[#fee4e2] hover:text-[#b42318]"
    >
      ×
    </button>
  );
}

function QuickTitle({
  title,
  className,
  onSave,
}: {
  title: string;
  className: string;
  onSave: (title: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);

  useEffect(() => {
    if (!editing) setValue(title);
  }, [title, editing]);

  const save = async () => {
    const next = value.trim();
    setEditing(false);
    if (!next || next === title) {
      setValue(title);
      return;
    }
    await onSave(next);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        aria-label="Название"
        draggable={false}
        onMouseDown={stopCardEvent}
        onClick={stopCardEvent}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => void save()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") {
            event.preventDefault();
            void save();
          }
          if (event.key === "Escape") {
            setValue(title);
            setEditing(false);
          }
        }}
        className={`w-full rounded-lg bg-white px-2 py-1 outline-none ring-2 ring-[var(--v2-brand-500)] ${className}`}
      />
    );
  }

  return (
    <span className="flex min-w-0 items-start gap-1">
      <span className={`min-w-0 flex-1 ${className}`}>{title || "Без названия"}</span>
      <button
        type="button"
        aria-label="Изменить"
        title="Изменить"
        draggable={false}
        onMouseDown={stopCardEvent}
        onClick={(event) => {
          stopCardEvent(event);
          setEditing(true);
        }}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[13px] text-[var(--v2-ink-400)] hover:bg-white hover:text-[var(--v2-ink-900)]"
      >
        ✎
      </button>
    </span>
  );
}

function FocusCard({
  item,
  project,
  onOpen,
  onPatch,
  onDelete,
}: {
  item: Hypothesis;
  project?: HypothesisProject;
  onOpen: () => void;
  onPatch: (id: string, patch: Record<string, unknown>) => Promise<Hypothesis>;
  onDelete: (id: string) => Promise<void>;
}) {
  const colors = projectColors(project?.hue ?? 260);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen();
      }}
      className="flex cursor-pointer flex-col gap-3.5 rounded-[20px] p-6 text-left transition hover:-translate-y-0.5"
      style={{ background: colors.s, boxShadow: `inset 0 0 0 1.5px color-mix(in oklch, ${colors.c} 18%, transparent)` }}
    >
      <div className="flex items-center gap-2.5">
        <ProjectChip project={project} />
        <span className="ml-auto text-[12px] font-semibold tracking-[0.1em] uppercase" style={{ color: colors.c }}>
          в работе
        </span>
        <QuickDelete onDelete={() => onDelete(item.id)} />
      </div>
      <QuickTitle
        title={item.title}
        className="text-[24px] leading-[1.2] font-semibold tracking-[-0.03em]"
        onSave={(title) => onPatch(item.id, { title })}
      />
      <p className="text-[15px] leading-relaxed text-[var(--v2-ink-600)]">{item.body}</p>
      <div className="mt-auto rounded-[14px] bg-white px-[15px] py-[13px]">
        <span className="text-[11.5px] font-semibold tracking-[0.13em] text-[var(--v2-ink-400)] uppercase">Критерий проверки</span>
        <b className="mt-1 block text-[15px] leading-snug font-semibold">{item.metric || "—"}</b>
      </div>
    </div>
  );
}

function BoardCard({
  item,
  project,
  onOpen,
  onPatch,
  onDelete,
}: {
  item: Hypothesis;
  project?: HypothesisProject;
  onOpen: () => void;
  onPatch: (id: string, patch: Record<string, unknown>) => Promise<Hypothesis>;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", item.id);
        event.currentTarget.classList.add("opacity-40");
      }}
      onDragEnd={(event) => event.currentTarget.classList.remove("opacity-40")}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen();
      }}
      className="block w-full cursor-grab rounded-[14px] bg-white px-[15px] py-3.5 text-left shadow-[var(--v2-shadow-card)] hover:shadow-[var(--v2-shadow-soft)]"
    >
      <span className="flex items-center gap-2">
        <ProjectChip project={project} />
        <VerdictBadge verdict={item.stage === "done" ? item.verdict : null} />
        <span className="ml-auto">
          <QuickDelete onDelete={() => onDelete(item.id)} />
        </span>
      </span>
      <span className="mt-2 block">
        <QuickTitle
          title={item.title}
          className="text-[15px] leading-snug font-semibold tracking-[-0.015em]"
          onSave={(title) => onPatch(item.id, { title })}
        />
      </span>
      {item.stage === "done" && item.result_text ? (
        <span className="mt-1 block text-[13px] leading-snug text-[var(--v2-ink-500)]">{item.result_text}</span>
      ) : item.metric ? (
        <span className="mt-1 block text-[13px] leading-snug text-[var(--v2-ink-500)]">{item.metric}</span>
      ) : null}
    </div>
  );
}

function HypothesisDrawer({
  item,
  projects,
  sprints,
  activeCount,
  onClose,
  onPatch,
  onMove,
  onDelete,
}: {
  item: Hypothesis;
  projects: HypothesisProject[];
  sprints: HypothesisSprint[];
  activeCount: number;
  onClose: () => void;
  onPatch: (id: string, patch: Record<string, unknown>) => Promise<Hypothesis>;
  onMove: (id: string, stage: HypothesisStage) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body);
  const [metric, setMetric] = useState(item.metric);
  const [result, setResult] = useState(item.result_text);
  const draft = useRef({ title, body, metric, result });
  const timer = useRef<number | null>(null);
  draft.current = { title, body, metric, result };

  useEffect(() => {
    setTitle(item.title);
    setBody(item.body);
    setMetric(item.metric);
    setResult(item.result_text);
  }, [item.id]);

  const flush = async () => {
    if (timer.current) window.clearTimeout(timer.current);
    const current = draft.current;
    if (
      current.title === item.title &&
      current.body === item.body &&
      current.metric === item.metric &&
      current.result === item.result_text
    ) {
      return;
    }
    await onPatch(item.id, {
      title: current.title,
      body: current.body,
      metric: current.metric,
      resultText: current.result,
    });
  };

  const schedule = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), 400);
  };

  const close = async () => {
    if (!draft.current.title.trim()) {
      await onDelete(item.id);
      return;
    }
    await flush();
    onClose();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") void close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const sprintName =
    item.sprint_id && (item.stage === "active" || item.stage === "done")
      ? sprints.find((sprint) => sprint.id === item.sprint_id)?.name
      : "";

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-[rgba(10,12,20,0.28)]" aria-label="Закрыть" onClick={() => void close()} />
      <aside className="absolute top-0 right-0 flex h-full w-[min(520px,100vw)] flex-col bg-white shadow-[-20px_0_60px_-20px_rgba(16,24,40,0.3)]">
        <div className="flex items-center gap-2.5 border-b border-[var(--v2-ink-100)] px-6 py-5">
          <span className="text-[11.5px] font-semibold tracking-[0.13em] text-[var(--v2-ink-400)] uppercase">
            {STAGE_LABEL[item.stage]}
            {sprintName ? ` · ${sprintName}` : ""}
          </span>
          <button type="button" onClick={() => void close()} className="ml-auto h-[38px] w-[38px] rounded-xl text-[20px] text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-100)]" aria-label="Закрыть">
            ×
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-[18px] overflow-y-auto px-6 py-[22px]">
          <Field label="Название">
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                schedule();
              }}
              placeholder="Коротко, что проверяю"
              className="w-full rounded-xl bg-[var(--v2-ink-50)] px-3 py-2.5 text-[20px] font-semibold tracking-[-0.02em] outline-none focus:bg-white focus:ring-2 focus:ring-[var(--v2-brand-500)]"
            />
          </Field>
          <Field label="Проект">
            <select
              value={item.project_id ?? ""}
              onChange={(event) => void onPatch(item.id, { projectId: event.target.value || null })}
              className="w-full rounded-xl bg-[var(--v2-ink-50)] px-3 py-2.5 text-[15px] outline-none"
            >
              <option value="">Без проекта</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Гипотеза">
            <textarea
              value={body}
              rows={3}
              onChange={(event) => {
                setBody(event.target.value);
                schedule();
              }}
              placeholder="Если …, то …"
              className="w-full resize-y rounded-xl bg-[var(--v2-ink-50)] px-3 py-2.5 text-[15px] leading-relaxed outline-none focus:bg-white focus:ring-2 focus:ring-[var(--v2-brand-500)]"
            />
          </Field>
          <Field label="Критерий проверки">
            <input
              value={metric}
              onChange={(event) => {
                setMetric(event.target.value);
                schedule();
              }}
              placeholder="Что должно случиться, чтобы считать подтверждённой"
              className="w-full rounded-xl bg-[var(--v2-ink-50)] px-3 py-2.5 text-[15px] outline-none focus:bg-white focus:ring-2 focus:ring-[var(--v2-brand-500)]"
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold tracking-[0.11em] text-[var(--v2-ink-400)] uppercase">Статус</span>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => void onMove(item.id, stage)}
                  className={`rounded-[11px] px-3 py-2 text-[14px] font-semibold ${
                    item.stage === stage ? "bg-[var(--v2-ink-900)] text-white" : "bg-[var(--v2-ink-50)] text-[var(--v2-ink-600)]"
                  }`}
                >
                  {STAGE_LABEL[stage]}
                </button>
              ))}
            </div>
          </div>
          {item.stage === "active" || item.stage === "done" ? (
            <Field label="Спринт">
              <select
                value={item.sprint_id ?? ""}
                onChange={(event) => void onPatch(item.id, { stage: item.stage, sprintId: event.target.value || null })}
                className="w-full rounded-xl bg-[var(--v2-ink-50)] px-3 py-2.5 text-[15px] outline-none"
              >
                {sprints.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name} · {sprint.range_label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {item.stage === "done" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold tracking-[0.11em] text-[var(--v2-ink-400)] uppercase">Вердикт</span>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(VERDICT_META) as HypothesisVerdict[]).map((verdict) => (
                    <button
                      key={verdict}
                      type="button"
                      onClick={() => void onPatch(item.id, { verdict })}
                      className={`rounded-[11px] px-3 py-2 text-[14px] font-semibold ${
                        item.verdict === verdict ? "bg-[var(--v2-ink-900)] text-white" : "bg-[var(--v2-ink-50)] text-[var(--v2-ink-600)]"
                      }`}
                    >
                      {VERDICT_META[verdict].label}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Вывод">
                <textarea
                  value={result}
                  rows={3}
                  onChange={(event) => {
                    setResult(event.target.value);
                    schedule();
                  }}
                  placeholder="Что узнал, что делаю дальше"
                  className="w-full resize-y rounded-xl bg-[var(--v2-ink-50)] px-3 py-2.5 text-[15px] leading-relaxed outline-none focus:bg-white focus:ring-2 focus:ring-[var(--v2-brand-500)]"
                />
              </Field>
            </>
          ) : null}
          {item.stage === "active" && activeCount > WIP_LIMIT ? (
            <div className="rounded-[11px] bg-[#fef0c7] px-3 py-2.5 text-[13.5px] text-[#b54708]">
              В спринте больше {WIP_LIMIT} гипотез.
            </div>
          ) : null}
        </div>
        <div className="flex gap-2.5 border-t border-[var(--v2-ink-100)] px-6 py-4">
          <button type="button" onClick={() => void close()} className="inline-flex h-11 items-center rounded-[13px] bg-[#2d5eef] px-[18px] text-[14.5px] font-semibold text-white">
            Готово
          </button>
          <button
            type="button"
            onClick={() => void onDelete(item.id)}
            className="rounded-xl px-3 text-[14px] font-semibold text-[#b42318] hover:bg-[#fee4e2]"
          >
            Удалить
          </button>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold tracking-[0.11em] text-[var(--v2-ink-400)] uppercase">{label}</span>
      {children}
    </label>
  );
}
