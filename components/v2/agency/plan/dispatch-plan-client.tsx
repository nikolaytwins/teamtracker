"use client";

import "./plan-design.css";
import {
  createPlanItemApi,
  createPlanProjectApi,
  deletePlanItemApi,
  fetchPlan,
  fetchPlanCalendar,
  updatePlanItemApi,
  updateProjectApi,
  upsertDayModeApi,
} from "@/lib/v2/agency/plan/plan-api-client";
import {
  dayModeMap,
  dmode,
  eventsOnDay,
  findModeDate,
  freeHours,
  futureProjectHours,
  hoursLabel,
  itemHours,
  KANBAN_BOARD_COLS,
  modeCssClass,
  nextFreeWindowDay,
  pluralRu,
  STATUS_UI,
  tasksOnDay,
  unplacedHours,
  capOf,
  dayHours,
} from "@/lib/v2/agency/plan/plan-calendar-logic";
import type {
  LoadStatus,
  PlanDayMode,
  PlanItemKind,
  PlanItemRow,
  PlanPayload,
  PlanProjectView,
} from "@/lib/v2/agency/plan/plan-types";
import {
  addDays,
  fmtLong,
  fmtShort,
  fmtWeekday,
  formatPlanDuration,
  mondayOf,
  monthName,
  parseDurationInput,
  parseYmd,
  planHoursToMinutes,
  projectColor,
  toYmd,
} from "@/lib/v2/agency/plan/plan-utils";
import { formatRub } from "@/lib/v2/finance/meta";
import type { DispatchWorkStatus } from "@/lib/v2/agency/dispatch/dispatch-work-status";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { WorkRulesTab } from "@/components/v2/agency/plan/work-rules-tab";

type PlanPageTab = "plan" | "rules";

function PlanPageTabs({ tab, onTab }: { tab: PlanPageTab; onTab: (t: PlanPageTab) => void }) {
  return (
    <div className="headrow">
      <div className="seg">
        <button type="button" className={tab === "plan" ? "on" : ""} onClick={() => onTab("plan")}>
          План
        </button>
        <button type="button" className={tab === "rules" ? "on" : ""} onClick={() => onTab("rules")}>
          Правила работы
        </button>
      </div>
    </div>
  );
}

const DW = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

type CalMode = "week" | "month";
type ProjView = "kb" | "list";

type DragState =
  | { kind: "new"; projectId: string }
  | { kind: "move"; itemId: string }
  | { kind: "mark"; mode: PlanDayMode; from: string }
  | { kind: "backlog"; itemId: string }
  | { kind: "kanban"; projectId: string; fromStatus: DispatchWorkStatus };

type DrawerState =
  | { type: "create"; createKind: CreateKind; day?: string }
  | { type: "create-project" }
  | { type: "item"; itemId: string }
  | { type: "day"; dateKey: string }
  | { type: "project"; projectId: string; estFocus?: boolean };

type CreateKind = "task" | "call" | "personal" | "strategy" | "creative" | "rest";

function toDateInputValue(v: string | null | undefined): string {
  if (!v) return "";
  return v.slice(0, 10);
}

function PlanDateInput({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const el = ref.current;
    if (!el) return;
    try {
      el.showPicker?.();
    } catch {
      el.focus();
    }
  };
  return (
    <input
      ref={ref}
      id={id}
      type="date"
      value={toDateInputValue(value)}
      onChange={(e) => onChange(e.target.value)}
      onClick={openPicker}
      onFocus={openPicker}
    />
  );
}

function eventMetaLabel(ev: PlanItemRow): string {
  const parts: string[] = [];
  if (ev.event_time) parts.push(ev.event_time);
  if (ev.duration_label) parts.push(ev.duration_label);
  else if (!ev.event_time && ev.planned_minutes != null) parts.push(hoursLabel(ev));
  return parts.join(" · ");
}

function projectById(projects: PlanProjectView[], id: string | null) {
  if (!id) return null;
  return projects.find((p) => p.id === id) ?? null;
}

function allItems(plan: PlanPayload): PlanItemRow[] {
  return [...plan.items, ...plan.backlog];
}

export function DispatchPlanClient() {
  const searchParams = useSearchParams();
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [pageTab, setPageTab] = useState<PlanPageTab>(() =>
    searchParams.get("tab") === "rules" ? "rules" : "plan"
  );

  const setPlanTab = useCallback(
    (tab: PlanPageTab) => {
      setPageTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "rules") params.set("tab", "rules");
      else params.delete("tab");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "rules") setPageTab("rules");
    else if (t === "plan" || !t) setPageTab("plan");
  }, [searchParams]);

  if (pageTab === "rules") {
    return (
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="plan-v3" style={{ padding: "28px 36px 0", maxWidth: 1760, margin: "0 auto" }}>
          <PlanPageTabs tab={pageTab} onTab={setPlanTab} />
        </div>
        <WorkRulesTab />
      </div>
    );
  }

  return <DispatchPlanCalendar onPageTabChange={setPlanTab} pageTab={pageTab} />;
}

function DispatchPlanCalendar({
  pageTab,
  onPageTabChange,
}: {
  pageTab: PlanPageTab;
  onPageTabChange: (t: PlanPageTab) => void;
}) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayKey = toYmd(today);

  const [plan, setPlan] = useState<PlanPayload | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calMode, setCalMode] = useState<CalMode>("week");
  const [projView, setProjView] = useState<ProjView>("kb");
  const [showDone, setShowDone] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [anchor, setAnchor] = useState(() => mondayOf(today));
  const [openRows, setOpenRows] = useState<Set<string>>(() => new Set());
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const [kanbanDrop, setKanbanDrop] = useState<DispatchWorkStatus | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const range = useMemo(() => {
    if (calMode === "month") {
      const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const start = mondayOf(first);
      return { from: toYmd(start), to: toYmd(addDays(start, 41)) };
    }
    return { from: toYmd(anchor), to: toYmd(addDays(anchor, 6)) };
  }, [anchor, calMode]);

  const planMonthKey = useMemo(
    () => `${anchor.getFullYear()}-${anchor.getMonth() + 1}`,
    [anchor]
  );

  const calendarRangeKey = `${range.from}:${range.to}`;
  const loadedCoreMonth = useRef<string | null>(null);
  const loadedCalendarRange = useRef<string | null>(null);

  const reload = useCallback(async () => {
    const year = anchor.getFullYear();
    const month = anchor.getMonth() + 1;
    const { plan: data, storageWarning: warning } = await fetchPlan(range.from, range.to, year, month);
    setPlan(data);
    setStorageWarning(warning);
    loadedCoreMonth.current = planMonthKey;
    loadedCalendarRange.current = calendarRangeKey;
    return data;
  }, [anchor, calendarRangeKey, planMonthKey, range.from, range.to]);

  const reloadCalendar = useCallback(async () => {
    const cal = await fetchPlanCalendar(range.from, range.to);
    setPlan((prev) => (prev ? { ...prev, ...cal } : prev));
    loadedCalendarRange.current = calendarRangeKey;
  }, [calendarRangeKey, range.from, range.to]);

  useEffect(() => {
    let cancelled = false;
    const calendarOnly =
      loadedCoreMonth.current === planMonthKey && loadedCalendarRange.current !== calendarRangeKey;

    setLoading(!calendarOnly);
    setError(null);

    const run = calendarOnly ? reloadCalendar() : reload();

    run
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [calendarRangeKey, planMonthKey, reload, reloadCalendar]);

  const showToast = useCallback((text: string, undo?: () => void) => {
    setToast({ text, undo });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5600);
  }, []);

  const modes = useMemo(() => (plan ? dayModeMap(plan.dayModes) : new Map()), [plan]);
  const projectsMap = useMemo(() => {
    const m = new Map<string, PlanProjectView>();
    plan?.projects.forEach((p) => m.set(p.id, p));
    return m;
  }, [plan]);

  const dailyCap = plan?.plannedHoursPerDay ?? 4;

  const mutate = useCallback(
    async (action: () => Promise<unknown>, message: string, snapshot?: PlanPayload) => {
      const prev = snapshot ?? plan;
      try {
        await action();
        await reload();
        if (prev) showToast(message, async () => {
          setPlan(prev);
          showToast("Отменено");
        });
        else showToast(message);
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Ошибка");
      }
    },
    [plan, reload, showToast]
  );

  const onDropDay = async (dateKey: string) => {
    if (!drag || !plan) return;
    setDropKey(null);
    if (drag.kind === "kanban") {
      setDrag(null);
      return;
    }
    if (dateKey < todayKey) {
      showToast("В прошедшие дни планировать нельзя");
      return;
    }
    const snap = structuredClone(plan);

    if (drag.kind === "mark") {
      if (dayHours(allItems(plan), dateKey) > 0 && drag.mode !== "strategy") {
        showToast("В этом дне есть рабочие слоты — сначала перенесите их");
        return;
      }
      await mutate(
        async () => {
          if (drag.from !== dateKey) await upsertDayModeApi(drag.from, null);
          await upsertDayModeApi(dateKey, drag.mode);
        },
        `${drag.mode === "strategy" ? "День стратегии" : drag.mode === "creative" ? "Творческий день" : "День отдыха"} → ${fmtWeekday(parseYmd(dateKey))}`,
        snap
      );
      return;
    }

    const mode = dmode(modes, dateKey);
    if (capOf(mode, dailyCap) === 0) {
      showToast(mode === "rest" ? "Это день отдыха" : "Это творческий день — клиентские слоты не ставим");
      return;
    }
    const free = freeHours(allItems(plan), modes, dateKey, dailyCap);
    if (free === 0 && (drag.kind === "new" || drag.kind === "backlog" || drag.kind === "move")) {
      showToast("В этом дне не осталось плановых часов");
      return;
    }

    if (drag.kind === "move" || drag.kind === "backlog") {
      const item = allItems(plan).find((i) => i.id === drag.itemId);
      if (!item || item.plan_date === dateKey) return;
      const h = itemHours(item);
      if (h > free) {
        showToast(`В этом дне свободно только ${free} ч`);
        return;
      }
      await mutate(
        () => updatePlanItemApi(drag.itemId, { plan_date: dateKey }),
        `«${item.title}» → ${fmtWeekday(parseYmd(dateKey))}`,
        snap
      );
      return;
    }

    if (drag.kind === "new") {
      const proj = projectsMap.get(drag.projectId);
      const u = proj ? unplacedHours(proj, allItems(plan), todayKey) : null;
      const h = Math.min(2, u ?? 2, free);
      await mutate(
        () =>
          createPlanItemApi({
            kind: "task",
            project_id: drag.projectId,
            title: "Работа по проекту",
            plan_date: dateKey,
            planned_minutes: planHoursToMinutes(h),
          }),
        `${proj?.name ?? "Проект"} · ${h} ч → ${fmtWeekday(parseYmd(dateKey))}. Откройте слот, чтобы назвать задачу.`,
        snap
      );
    }
  };

  const onDropKanban = async (status: DispatchWorkStatus) => {
    if (!drag || drag.kind !== "kanban" || !plan) return;
    setKanbanDrop(null);
    const project = plan.projects.find((p) => p.id === drag.projectId);
    if (!project || drag.fromStatus === status) {
      setDrag(null);
      return;
    }
    const snap = structuredClone(plan);
    const label = STATUS_UI[status].label;
    await mutate(
      () => updateProjectApi(drag.projectId, { dispatch_work_status: status }),
      `«${project.name}» → ${label}`,
      snap
    );
    setDrag(null);
  };

  if (error && !plan) {
    return (
      <div className="plan-v3 min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="shell">
          <main className="main">
            <div className="page">
              <PlanPageTabs tab={pageTab} onTab={onPageTabChange} />
              <p className="text-[15px] text-[var(--red)]">{error}</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="plan-v3 min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="shell">
          <main className="main">
            <div className="page">
              <PlanPageTabs tab={pageTab} onTab={onPageTabChange} />
              <section className="card hero">
                <div className="hero-l">
                  <div className="hero-top">
                    <span className="kick">Планирование</span>
                  </div>
                  <h1 className="hero-h1">План</h1>
                  <p className="sec-sub" style={{ marginTop: 8 }}>
                    {loading ? "Загрузка…" : "Нет данных"}
                  </p>
                </div>
              </section>
              <section className="card pad">
                <h2 className="big-title">Календарь</h2>
                <p className="sec-sub" style={{ marginTop: 12 }}>
                  {loading ? "Подтягиваем слоты и проекты…" : ""}
                </p>
              </section>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const items = allItems(plan);
  const loadStatus = plan.loadStatus;
  const freeWindow = nextFreeWindowDay(items, modes, today, dailyCap);
  const stratDate = findModeDate(modes, "strategy", todayKey);
  const creativeDate = findModeDate(modes, "creative", todayKey);

  const periodLabel =
    calMode === "month"
      ? `${monthName(anchor)} ${anchor.getFullYear()}`
      : `${fmtShort(anchor)} – ${fmtShort(addDays(anchor, 6))}`;

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
  const weekIncludesToday = weekDates.some((d) => toYmd(d) === todayKey);
  const weekDays = weekIncludesToday ? weekDates.filter((d) => toYmd(d) >= todayKey) : weekDates;

  const tasksToPlace = plan.backlog.filter((i) => i.kind === "task");
  const boardProjects = plan.projects.filter((p) => showHidden || !p.planHidden);
  const visibleProjects = boardProjects.filter((p) => showDone || p.dispatchWorkStatus !== "done");
  const hiddenCount = plan.projects.filter((p) => p.planHidden).length;

  const kanbanCols = KANBAN_BOARD_COLS;

  return (
    <div className="plan-v3 min-h-0 min-w-0 flex-1 overflow-y-auto">
      <div className="shell">
        <main className="main">
          <div className="page">
            <PlanPageTabs tab={pageTab} onTab={onPageTabChange} />
            {storageWarning === "migration_076_required" ? (
              <div
                className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-snug text-amber-950"
                role="status"
              >
                Календарь плана пока не сохраняется: в базе нужна миграция{" "}
                <code className="rounded bg-white/80 px-1 py-0.5 text-[12px]">076_agency_plan_user_id_text</code>.
                Запустите её в Supabase SQL Editor — после этого задачи и дни будут записываться.
              </div>
            ) : null}
            <section className="card hero">
              <div className="hero-l">
                <div className="hero-top">
                  <span className="kick">Планирование</span>
                  <span className="sec-sub">Сегодня {fmtWeekday(today).toLowerCase()}</span>
                </div>
                <h1 className="hero-h1">План</h1>
                <StatusBlock loadStatus={loadStatus} labels={plan.loadStatusLabels} finance={plan.loadStatusFinance} />
                <div className="hero-nums">
                  <HeroDayButton
                    label="День стратегии"
                    date={stratDate}
                    emptyText="Не назначен"
                    subAssigned="Защищённый день · один слот"
                    subEmpty="Поставьте день в календаре"
                    onClick={() => {
                      if (stratDate) {
                        setCalMode("week");
                        setAnchor(mondayOf(stratDate));
                        showToast(`День стратегии — ${fmtWeekday(stratDate)}`);
                      } else setDrawer({ type: "create", createKind: "strategy" });
                    }}
                  />
                  <HeroDayButton
                    label="Творческий день"
                    date={creativeDate}
                    emptyText="Не назначен"
                    subAssigned="Творческий день без клиентских слотов"
                    subEmpty="Поставьте день в календаре"
                    onClick={() => {
                      if (creativeDate) {
                        setCalMode("week");
                        setAnchor(mondayOf(creativeDate));
                        showToast(`Творческий день — ${fmtWeekday(creativeDate)}`);
                      } else setDrawer({ type: "create", createKind: "creative" });
                    }}
                  />
                </div>
              </div>
              <div className="hero-img">
                <Image src="/agency/plan-hero.jpg" alt="" fill sizes="(max-width: 1200px) 0vw, 40vw" priority />
              </div>
            </section>

            <section className="card pad">
              <div className="cal-head">
                <div className="cal-head-l">
                  <h2 className="big-title">Календарь</h2>
                  <div className="seg" id="mode-seg">
                    <button type="button" className={calMode === "week" ? "on" : ""} onClick={() => setCalMode("week")}>
                      Неделя
                    </button>
                    <button type="button" className={calMode === "month" ? "on" : ""} onClick={() => setCalMode("month")}>
                      Месяц
                    </button>
                  </div>
                </div>
                <div className="cal-head-c">
                  <button
                    type="button"
                    className="wk-btn tip"
                    data-tip="Назад"
                    onClick={() =>
                      setAnchor(
                        calMode === "month"
                          ? new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1)
                          : addDays(anchor, -7)
                      )
                    }
                  >
                    ‹
                  </button>
                  <span className="wk-label tnum">{periodLabel}</span>
                  <button
                    type="button"
                    className="wk-btn tip"
                    data-tip="Вперёд"
                    onClick={() =>
                      setAnchor(
                        calMode === "month"
                          ? new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)
                          : addDays(anchor, 7)
                      )
                    }
                  >
                    ›
                  </button>
                </div>
                <div className="cal-head-r">
                  <button type="button" className="btn btn--gh" onClick={() => setDrawer({ type: "create", createKind: "call" })}>
                    Событие
                  </button>
                  <button type="button" className="btn btn--pri" onClick={() => setDrawer({ type: "create", createKind: "task" })}>
                    Создать задачу
                  </button>
                </div>
              </div>
              <div id="cal">
                {calMode === "week" ? (
                  <div
                    className="wkrow wkrow-live"
                    style={{ gridTemplateColumns: `repeat(${weekDays.length},minmax(0,1fr))` }}
                  >
                    {weekDays.map((d) => {
                      return (
                        <DayCell
                          key={toYmd(d)}
                          date={d}
                          todayKey={todayKey}
                          items={items}
                          modes={modes}
                          projectsMap={projectsMap}
                          dailyCap={dailyCap}
                          drag={drag}
                          dropKey={dropKey}
                          onDragStart={setDrag}
                          onDragEnd={() => setDrag(null)}
                          onDrop={onDropDay}
                          onDragOver={(k) => setDropKey(k)}
                          onDragLeave={() => setDropKey(null)}
                          onOpenItem={(id) => setDrawer({ type: "item", itemId: id })}
                          onOpenDayType={(k) => setDrawer({ type: "day", dateKey: k })}
                          onAddTask={(k) => setDrawer({ type: "create", createKind: "task", day: k })}
                          compact={false}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <MonthGrid
                    anchor={anchor}
                    todayKey={todayKey}
                    items={items}
                    modes={modes}
                    projectsMap={projectsMap}
                    dailyCap={dailyCap}
                    drag={drag}
                    dropKey={dropKey}
                    onDragStart={setDrag}
                    onDragEnd={() => setDrag(null)}
                    onDrop={onDropDay}
                    onDragOver={setDropKey}
                    onDragLeave={() => setDropKey(null)}
                    onOpenItem={(id) => setDrawer({ type: "item", itemId: id })}
                    onOpenDayType={(k) => setDrawer({ type: "day", dateKey: k })}
                    onAddTask={(k) => setDrawer({ type: "create", createKind: "task", day: k })}
                    onWeekJump={(k) => {
                      setCalMode("week");
                      setAnchor(mondayOf(parseYmd(k)));
                    }}
                  />
                )}
              </div>
              <p className="hint">
                Тип дня — кнопка ⋯ в заголовке дня: обычный, стратегия, творческий или отдых. В обычном дне{" "}
                {dailyCap} плановых часа, включая выходные:{" "}
                {freeWindow
                  ? `ближайший полностью свободный день — ${fmtLong(freeWindow)}`
                  : "свободных дней впереди нет"}
                . Созвоны и личные события стоят выше рабочих слотов; их часы входят в сумму дня.
              </p>
            </section>

            {plan.backlog.length > 0 && (
              <section className="card pad">
                <div className="headrow" style={{ marginBottom: 18 }}>
                  <h2 className="sec-title">Без даты</h2>
                  <span className="sec-sub">
                    {pluralRu(plan.backlog.length, "задача", "задачи", "задач")} без дня выполнения
                  </span>
                </div>
                <div className="place">
                  {plan.backlog.map((item) => {
                    const p = projectById(plan.projects, item.project_id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="plc"
                        draggable
                        onDragStart={() => setDrag({ kind: "backlog", itemId: item.id })}
                        onDragEnd={() => setDrag(null)}
                        onClick={() => setDrawer({ type: "item", itemId: item.id })}
                      >
                        <span className="plc-h">
                          <span className="dot" style={{ background: p?.color ?? "#71717A" }} />
                          <span className="plc-n">{item.title}</span>
                        </span>
                        {item.planned_minutes ? (
                          <span className="plc-v tnum">≈ {hoursLabel(item)}</span>
                        ) : null}
                        <span className="plc-f">
                          <span>{p ? p.businessLineLabel : "Без проекта"}</span>
                          <span style={{ marginLeft: "auto" }}>Перетащите в календарь</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="card pad">
              <div className="headrow" style={{ marginBottom: 18 }}>
                <h2 className="sec-title">Нужно разместить</h2>
                <span className="sec-sub">
                  {tasksToPlace.length
                    ? `${pluralRu(tasksToPlace.length, "задача ждёт", "задачи ждут", "задач ждут")} места в календаре`
                    : "всё размещено"}
                </span>
              </div>
              <div className="place">
                {tasksToPlace.length === 0 ? (
                  <p className="plc-note">
                    Задач для размещения нет. Создайте подзадачу в проекте или через «Создать задачу» — затем
                    перетащите её в календарь.
                  </p>
                ) : (
                  tasksToPlace.map((item) => {
                    const p = projectById(plan.projects, item.project_id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="plc"
                        draggable
                        onDragStart={() => setDrag({ kind: "backlog", itemId: item.id })}
                        onDragEnd={() => setDrag(null)}
                        onClick={() => setDrawer({ type: "item", itemId: item.id })}
                      >
                        <span className="plc-h">
                          <span className="dot" style={{ background: p?.color ?? "#71717A" }} />
                          <span className="plc-n">{item.title}</span>
                        </span>
                        {item.planned_minutes ? (
                          <span className="plc-v tnum">≈ {hoursLabel(item)}</span>
                        ) : null}
                        <span className="plc-f">
                          <span>{p ? p.businessLineLabel : "Без проекта"}</span>
                          <span style={{ marginLeft: "auto" }}>Перетащите в календарь</span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              <p className="hint">
                Сюда попадают задачи без даты — из backlog или после создания. Проекты сами по себе в календарь не
                ставятся: сначала задача, потом слот в дне.
              </p>
            </section>

            <section className="card pad">
              <div className="headrow" style={{ marginBottom: 22 }}>
                <h2 className="big-title">Проекты</h2>
                <div className="seg">
                  <button type="button" className={projView === "kb" ? "on" : ""} onClick={() => setProjView("kb")}>
                    Канбан
                  </button>
                  <button type="button" className={projView === "list" ? "on" : ""} onClick={() => setProjView("list")}>
                    Список
                  </button>
                </div>
                <div className="headrow" style={{ marginLeft: "auto", gap: 10 }}>
                  {hiddenCount > 0 ? (
                    <button type="button" className="btn btn--gh" onClick={() => setShowHidden((v) => !v)}>
                      {showHidden ? "Скрыть спрятанные" : `Спрятанные (${hiddenCount})`}
                    </button>
                  ) : null}
                  <button type="button" className="btn btn--gh" onClick={() => setShowDone((v) => !v)}>
                    {showDone ? "Скрыть завершённые" : "Показать завершённые"}
                  </button>
                  <button type="button" className="btn btn--gh" onClick={() => setDrawer({ type: "create-project" })}>
                    Добавить проект
                  </button>
                  <button type="button" className="btn btn--pri" onClick={() => setDrawer({ type: "create", createKind: "task" })}>
                    Создать задачу
                  </button>
                </div>
              </div>
              {projView === "kb" ? (
                <div className="kb-scroll">
                  <div className="kb">
                    {kanbanCols.map((col) => {
                      const ids = boardProjects.filter((p) => p.dispatchWorkStatus === col);
                      const meta = STATUS_UI[col];
                      return (
                        <div
                          key={col}
                          className={`kbcol${kanbanDrop === col ? " drop" : ""}${col === "done" ? " kbcol--done" : ""}${col === "permanent" ? " kbcol--perm" : ""}`}
                          onDragOver={(e) => {
                            if (!drag || drag.kind !== "kanban") return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            setKanbanDrop(col);
                          }}
                          onDragLeave={(e) => {
                            const next = e.relatedTarget as Node | null;
                            if (next && e.currentTarget.contains(next)) return;
                            setKanbanDrop((cur) => (cur === col ? null : cur));
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            void onDropKanban(col);
                          }}
                        >
                          <div className="kbh">
                            <span className="dot" style={{ background: meta.color }} />
                            <span className="kbh-n">{meta.label}</span>
                            <span className="kbh-c">{ids.length}</span>
                          </div>
                          <div className="kbcol-body">
                            {ids.length === 0 ? (
                              <p className="kbc-nodata">Пусто</p>
                            ) : (
                              ids.map((p) => (
                                <ProjectCard
                                  key={p.id}
                                  project={p}
                                  items={items}
                                  todayKey={todayKey}
                                  dragging={drag?.kind === "kanban" && drag.projectId === p.id}
                                  onOpen={() => setDrawer({ type: "project", projectId: p.id })}
                                  onDragStart={() =>
                                    setDrag({ kind: "kanban", projectId: p.id, fromStatus: p.dispatchWorkStatus })
                                  }
                                  onDragEnd={() => {
                                    setDrag(null);
                                    setKanbanDrop(null);
                                  }}
                                />
                              ))
                            )}
                            <div className="kbcol-fill" aria-hidden />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <ProjectList
                  projects={visibleProjects}
                  cols={kanbanCols}
                  items={items}
                  todayKey={todayKey}
                  openRows={openRows}
                  onToggleRow={(id) =>
                    setOpenRows((s) => {
                      const n = new Set(s);
                      if (n.has(id)) n.delete(id);
                      else n.add(id);
                      return n;
                    })
                  }
                  onOpenProject={(id) => setDrawer({ type: "project", projectId: id })}
                  onOpenItem={(id) => setDrawer({ type: "item", itemId: id })}
                  onAddTask={(id) => setDrawer({ type: "create", createKind: "task", day: todayKey })}
                />
              )}
            </section>
          </div>
        </main>
      </div>

      <div className={`scrim${drawer ? " on" : ""}`} onClick={() => setDrawer(null)} />
      {drawer && (
        <PlanDrawer
          drawer={drawer}
          plan={plan}
          todayKey={todayKey}
          dailyCap={dailyCap}
          modes={modes}
          items={items}
          onClose={() => setDrawer(null)}
          onSaved={async (msg, snap) => {
            setDrawer(null);
            await mutate(async () => {}, msg, snap);
          }}
          mutate={mutate}
          showToast={showToast}
          onNavigateWeek={(k) => {
            setCalMode("week");
            setAnchor(mondayOf(parseYmd(k)));
          }}
        />
      )}

      <div className={`toast${toast ? " on" : ""}`} role="status">
        <span dangerouslySetInnerHTML={{ __html: toast?.text ?? "" }} />
        {toast?.undo && (
          <button
            type="button"
            onClick={() => {
              void toast.undo?.();
              setToast(null);
            }}
          >
            Отменить
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBlock({
  loadStatus,
  labels,
  finance,
}: {
  loadStatus: LoadStatus;
  labels: { title: string; headline: string; detail: string };
  finance: PlanPayload["loadStatusFinance"];
}) {
  const toPassive = Math.max(0, finance.passiveMinRub - finance.reliableProfitRub);
  const passivePct = Math.min(
    100,
    Math.round((Math.max(0, finance.reliableProfitRub) / Math.max(1, finance.passiveMinRub)) * 100)
  );

  return (
    <div className={`status${loadStatus === "active" ? "" : ` status--${loadStatus}`}`}>
      <span className="kick">Статус загруженности</span>
      <div className="status-main">
        <span className="status-n">{labels.title}</span>
      </div>
      <p className="status-s">
        <b>{labels.headline}.</b> {labels.detail}
      </p>
      <div className="status-s" style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55, color: "#fff" }}>
        <div>
          <b>Надёжные поступления</b> {formatRub(finance.reliableRevenueRub)}
          <span style={{ color: "rgba(255,255,255,0.82)", fontWeight: 400 }}>
            {" "}
            — агентство и импульс с галочкой «точно в месяце» и уже оплаченные
          </span>
        </div>
        <div>
          <b>− Расходы</b> {formatRub(finance.totalExpensesRub)}
          <span style={{ color: "rgba(255,255,255,0.82)", fontWeight: 400 }}>
            {" "}
            (команда {formatRub(finance.teamExpensesRub)}
            {finance.taxAmountRub > 0 ? ` + взносы ИП ${formatRub(finance.taxAmountRub)}` : ""})
          </span>
        </div>
        <div>
          <b>= Надёжная прибыль</b> {formatRub(finance.reliableProfitRub)}
        </div>
        <div style={{ marginTop: 6, color: "rgba(255,255,255,0.82)" }}>
          Пассивный режим от {formatRub(finance.passiveMinRub)}
          {finance.reliableProfitRub >= finance.passiveMinRub
            ? ` — порог закрыт (${passivePct}%).`
            : ` — сейчас ${passivePct}%, не хватает ${formatRub(toPassive)}.`}{" "}
          Пауза от {formatRub(finance.pauseMinRub)}.
        </div>
      </div>
    </div>
  );
}

function HeroDayButton({
  label,
  date,
  emptyText,
  subAssigned,
  subEmpty,
  onClick,
}: {
  label: string;
  date: Date | null;
  emptyText: string;
  subAssigned: string;
  subEmpty: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`hn${date ? "" : " empty"}`} onClick={onClick}>
      <span className="kick">{label}</span>
      <span className="hn-v">{date ? fmtWeekday(date) : emptyText}</span>
      <span className="hn-s">{date ? subAssigned : subEmpty}</span>
    </button>
  );
}

function DayCell({
  date,
  todayKey,
  items,
  modes,
  projectsMap,
  dailyCap,
  drag,
  dropKey,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  onDragLeave,
  onOpenItem,
  onOpenDayType,
  onAddTask,
  compact,
  monthOut,
  onWeekJump,
}: {
  date: Date;
  todayKey: string;
  items: PlanItemRow[];
  modes: Map<string, PlanDayMode>;
  projectsMap: Map<string, PlanProjectView>;
  dailyCap: number;
  drag: DragState | null;
  dropKey: string | null;
  onDragStart: (d: DragState) => void;
  onDragEnd: () => void;
  onDrop: (k: string) => void;
  onDragOver: (k: string) => void;
  onDragLeave: () => void;
  onOpenItem: (id: string) => void;
  onOpenDayType: (k: string) => void;
  onAddTask: (k: string) => void;
  compact: boolean;
  monthOut?: boolean;
  onWeekJump?: (k: string) => void;
}) {
  const k = toYmd(date);
  const past = k < todayKey;
  const mode = dmode(modes, k);
  const cssMode = modeCssClass(mode);
  const h = dayHours(items, k);
  const cap = capOf(mode, dailyCap);
  const free = freeHours(items, modes, k, dailyCap);
  const dayTasks = tasksOnDay(items, k);
  const dayEvents = eventsOnDay(items, k);

  return (
    <div
      className={`${compact ? "mcell" : "day"}${monthOut ? " out" : ""}${past ? " past" : ""}${cssMode ? ` ${cssMode}` : ""}${k === todayKey ? " today" : ""}${!past && free === 0 && cap > 0 ? " full" : ""}${dropKey === k ? " drop" : ""}`}
      data-k={k}
      onDragOver={(e) => {
        if (!drag || drag.kind === "kanban") return;
        e.preventDefault();
        onDragOver(k);
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        void onDrop(k);
      }}
    >
      {compact ? (
        <>
          <div className="mday">{date.getDate()}</div>
          {mode ? (
            <button
              type="button"
              className={`mchip mchip--mode mchip--${cssMode}`}
              onClick={() => onOpenDayType(k)}
            >
              {mode === "strategy" ? "Стратегия" : mode === "creative" ? "Творческий день" : "Отдых"}
            </button>
          ) : null}
          {dayEvents.slice(0, 2).map((ev) => {
            const meta = eventMetaLabel(ev);
            return (
              <button
                key={ev.id}
                type="button"
                className={`mev${ev.kind === "personal" ? " mev--me" : ""}`}
                onClick={() => onOpenItem(ev.id)}
              >
                {ev.title}
                {meta ? <i>{meta}</i> : null}
              </button>
            );
          })}
          {dayTasks.slice(0, 3).map((t) => {
            const p = t.project_id ? projectsMap.get(t.project_id) : null;
            return (
              <button
                key={t.id}
                type="button"
                className="mchip"
                style={{ ["--c" as string]: p?.color ?? projectColor(t.id) }}
                onClick={() => onOpenItem(t.id)}
              >
                <span className="mchip-n">{t.title}</span>
                <span className="mchip-h tnum">{hoursLabel(t)}</span>
              </button>
            );
          })}
          {dayTasks.length > 3 && onWeekJump ? (
            <button type="button" className="mmore" onClick={() => onWeekJump(k)}>
              + ещё {dayTasks.length - 3}
            </button>
          ) : null}
          {!past ? (
            <>
              {free > 0 ? (
                <button type="button" className="mfree" onClick={() => onAddTask(k)}>
                  свободно {free} ч
                </button>
              ) : null}
              <button type="button" className="madd" onClick={() => onAddTask(k)}>
                + задача
              </button>
            </>
          ) : null}
        </>
      ) : (
        <>
          <div className="day-h">
            <span className="day-n">{DW[(date.getDay() + 6) % 7]}</span>
            <span className="day-d">{fmtShort(date)}</span>
            {cap > 0 ? (
              <span className="day-hrs tnum">
                {h} / {cap} ч
              </span>
            ) : null}
            {!past ? (
              <button type="button" className="dmbtn tip" data-tip="Тип дня" onClick={() => onOpenDayType(k)}>
                ⋯
              </button>
            ) : null}
          </div>
          {mode ? (
            <button
              type="button"
              className={`mark mark--${cssMode}`}
              draggable={!past}
              onDragStart={() => onDragStart({ kind: "mark", mode, from: k })}
              onDragEnd={onDragEnd}
              onClick={(e) => {
                e.stopPropagation();
                onOpenDayType(k);
              }}
            >
              {mode === "strategy" ? "Стратегия" : mode === "creative" ? "Творческий день" : "Отдых"}
            </button>
          ) : null}
          {dayEvents.length > 0 && (
            <div className="evs">
              {dayEvents.map((ev) => {
                const meta = eventMetaLabel(ev);
                return (
                  <button
                    key={ev.id}
                    type="button"
                    className={`ev${ev.kind === "personal" ? " ev--me" : ""}`}
                    onClick={() => onOpenItem(ev.id)}
                  >
                    {meta ? <span className="ev-t">{meta}</span> : null}
                    <span className="ev-n">{ev.title}</span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="slots">
            {dayTasks.map((t) => {
              const p = t.project_id ? projectsMap.get(t.project_id) : null;
              return (
                <button
                  key={t.id}
                  type="button"
                  className="slot"
                  draggable={!past}
                  style={{ ["--c" as string]: p?.color ?? projectColor(t.id) }}
                  onDragStart={() => onDragStart({ kind: "move", itemId: t.id })}
                  onDragEnd={onDragEnd}
                  onClick={() => onOpenItem(t.id)}
                >
                  <span className="slot-n">{t.title}</span>
                  <span className="slot-m tnum">
                    <span className="slot-h">{hoursLabel(t)}</span>
                    <span>{p ? p.clientLabel : "без проекта"}</span>
                  </span>
                </button>
              );
            })}
            {free > 0 && !past ? (
              <button type="button" className={`free${free >= 3 ? " big" : ""}`} onClick={() => onAddTask(k)}>
                + свободно {free} ч
              </button>
            ) : null}
          </div>
          {mode === "rest" ? (
            <div className="dayfoot">День отдыха · рабочие слоты не ставим</div>
          ) : mode === "creative" ? (
            <div className="dayfoot">Творческий день · клиентские слоты не ставим</div>
          ) : mode === "strategy" ? (
            <div className="dayfoot">Один слот стратегии, до 2 часов</div>
          ) : !past ? (
            <div className="dayfoot">+ резерв на сопровождение</div>
          ) : null}
        </>
      )}
    </div>
  );
}

function MonthGrid({
  anchor,
  todayKey,
  items,
  modes,
  projectsMap,
  dailyCap,
  drag,
  dropKey,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  onDragLeave,
  onOpenItem,
  onOpenDayType,
  onAddTask,
  onWeekJump,
}: {
  anchor: Date;
  todayKey: string;
  items: PlanItemRow[];
  modes: Map<string, PlanDayMode>;
  projectsMap: Map<string, PlanProjectView>;
  dailyCap: number;
  drag: DragState | null;
  dropKey: string | null;
  onDragStart: (d: DragState) => void;
  onDragEnd: () => void;
  onDrop: (k: string) => void;
  onDragOver: (k: string) => void;
  onDragLeave: () => void;
  onOpenItem: (id: string) => void;
  onOpenDayType: (k: string) => void;
  onAddTask: (k: string) => void;
  onWeekJump: (k: string) => void;
}) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = mondayOf(first);
  const weeks = Array.from({ length: 6 }, (_, wi) =>
    Array.from({ length: 7 }, (_, di) => addDays(start, wi * 7 + di))
  );
  const currentWeekIdx = weeks.findIndex((week) => week.some((d) => toYmd(d) === todayKey));
  const currentWeekRef = useRef<HTMLDivElement | null>(null);
  const monthKey = `${anchor.getFullYear()}-${anchor.getMonth()}`;
  const didScroll = useRef<string | null>(null);

  useEffect(() => {
    if (currentWeekIdx < 0) return;
    if (didScroll.current === monthKey) return;
    const el = currentWeekRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: "start", behavior: "auto" });
      didScroll.current = monthKey;
    });
  }, [currentWeekIdx, monthKey]);

  return (
    <div className="month-wrap">
      <div className="month-heads">
        {DW.map((n) => (
          <div key={n} className="mhead">
            {n}
          </div>
        ))}
      </div>
      <div className="month-scroll">
        {weeks.map((week, wi) => {
          const weekEnd = toYmd(week[6]!);
          const isPastWeek = weekEnd < todayKey;
          return (
            <div
              key={wi}
              className={`month-week${isPastWeek ? " is-past" : ""}`}
              ref={wi === currentWeekIdx ? currentWeekRef : undefined}
            >
              {week.map((d) => (
                <DayCell
                  key={toYmd(d)}
                  date={d}
                  todayKey={todayKey}
                  items={items}
                  modes={modes}
                  projectsMap={projectsMap}
                  dailyCap={dailyCap}
                  drag={drag}
                  dropKey={dropKey}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onOpenItem={onOpenItem}
                  onOpenDayType={onOpenDayType}
                  onAddTask={onAddTask}
                  compact
                  monthOut={d.getMonth() !== anchor.getMonth()}
                  onWeekJump={onWeekJump}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProjectCard({
  project: p,
  items,
  todayKey,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  project: PlanProjectView;
  items: PlanItemRow[];
  todayKey: string;
  dragging?: boolean;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const u = unplacedHours(p, items, todayKey);
  const n = items.filter((it) => it.kind === "task" && it.project_id === p.id && it.plan_date && it.plan_date >= todayKey).length;
  const createdLabel = p.createdAt ? fmtLong(new Date(p.createdAt)) : null;
  const skipClick = useRef(false);
  return (
    <button
      type="button"
      className={`kbc${dragging ? " dragging" : ""}`}
      draggable
      onDragStart={(e) => {
        skipClick.current = true;
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={() => {
        if (skipClick.current) {
          skipClick.current = false;
          return;
        }
        onOpen();
      }}
    >
      <span className="kbc-top">
        <span className="dot" style={{ background: p.color }} />
        <span className="kbc-n">{p.name}</span>
      </span>
      <span className="kbc-c">
        {p.businessLineLabel}
        {p.planHidden ? " · скрыт из плана" : ""}
      </span>
      <span className="kbc-rows">
        {createdLabel ? (
          <span>
            Создан <b>{createdLabel}</b>
          </span>
        ) : null}
        {p.workDeadline ? (
          <span>
            Дедлайн <b>{fmtLong(parseYmd(p.workDeadline))}</b>
          </span>
        ) : (
          <span>Дедлайн не задан</span>
        )}
        {p.plannedHoursRemaining != null ? (
          <>
            <span>
              Оценка остатка <b>≈ {p.plannedHoursRemaining} ч</b>
            </span>
            <span>
              В календаре <b>{futureProjectHours(items, p.id, todayKey)} ч</b> · {pluralRu(n, "задача", "задачи", "задач")}
            </span>
          </>
        ) : null}
      </span>
      {p.plannedHoursRemaining == null && p.dispatchWorkStatus !== "done" ? (
        <span className="kbc-nodata">Оценка не указана — в загрузку не попадает</span>
      ) : null}
      {p.dispatchWorkStatus === "on_approval" ? (
        <span className="kbc-nodata">Часы не занимает · может вернуться с правками</span>
      ) : null}
      {u !== null && u > 0 ? <span className="kbc-nodata">Не размещено ≈ {u} ч</span> : null}
    </button>
  );
}

function ProjectList({
  projects,
  cols,
  items,
  todayKey,
  openRows,
  onToggleRow,
  onOpenProject,
  onOpenItem,
  onAddTask,
}: {
  projects: PlanProjectView[];
  cols: DispatchWorkStatus[];
  items: PlanItemRow[];
  todayKey: string;
  openRows: Set<string>;
  onToggleRow: (id: string) => void;
  onOpenProject: (id: string) => void;
  onOpenItem: (id: string) => void;
  onAddTask: (id: string) => void;
}) {
  const ids: PlanProjectView[] = [];
  cols.forEach((c) => projects.forEach((p) => p.dispatchWorkStatus === c && ids.push(p)));

  return (
    <div className="plist">
      {ids.map((p) => {
        const u = unplacedHours(p, items, todayKey);
        const op = openRows.has(p.id);
        const list = items
          .filter((it) => it.kind === "task" && it.project_id === p.id)
          .sort((a, b) => (a.plan_date ?? "").localeCompare(b.plan_date ?? ""));
        const st = STATUS_UI[p.dispatchWorkStatus];
        return (
          <div key={p.id} className={`pwrap${op ? " open" : ""}`}>
            <button type="button" className="prow" onClick={() => onToggleRow(p.id)}>
              <span className="dot" style={{ background: p.color }} />
              <span className="prow-mid">
                <span className="prow-n">{p.name}</span>
                <span className="prow-c">
                  {p.businessLineLabel}
                  {p.createdAt ? ` · создан ${fmtShort(new Date(p.createdAt))}` : ""}
                  {p.planHidden ? " · скрыт" : ""}
                </span>
              </span>
              <span className="prow-cell">
                <span className="kick">Дедлайн</span>
                <b>{p.workDeadline ? fmtShort(parseYmd(p.workDeadline)) : "—"}</b>
              </span>
              <span className={`prow-cell${p.plannedHoursRemaining == null ? " mut" : ""}`}>
                <span className="kick">Оценка остатка</span>
                <b>{p.plannedHoursRemaining == null ? "не указана" : `≈ ${p.plannedHoursRemaining} ч`}</b>
              </span>
              <span className="prow-cell">
                <span className="kick">В календаре</span>
                <b>
                  {futureProjectHours(items, p.id, todayKey)} ч
                  {u ? <em> · не размещено {u} ч</em> : null}
                </b>
              </span>
              <span className={`pill prow-st ${st.css}`}>{st.label}</span>
              <span className="chev">▾</span>
            </button>
            {op ? (
              <div className="ptasks">
                {list.length ? (
                  list.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`ptask${t.plan_date && t.plan_date < todayKey ? " past" : ""}`}
                      onClick={() => onOpenItem(t.id)}
                    >
                      <span className="ptask-d">{t.plan_date ? fmtShort(parseYmd(t.plan_date)) : "—"}</span>
                      <span className="ptask-n">{t.title}</span>
                      <span className="ptask-h tnum">{hoursLabel(t)}</span>
                    </button>
                  ))
                ) : (
                  <p className="pempty">Задач в календаре нет.</p>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="btn btn--gh btn--sm" onClick={() => onAddTask(p.id)}>
                    Добавить задачу проекта
                  </button>
                  <button type="button" className="btn btn--gh btn--sm" onClick={() => onOpenProject(p.id)}>
                    Открыть проект
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function PlanDrawer({
  drawer,
  plan,
  todayKey,
  dailyCap,
  modes,
  items,
  onClose,
  mutate,
  showToast,
  onNavigateWeek,
}: {
  drawer: DrawerState;
  plan: PlanPayload;
  todayKey: string;
  dailyCap: number;
  modes: Map<string, PlanDayMode>;
  items: PlanItemRow[];
  onClose: () => void;
  onSaved: (msg: string, snap: PlanPayload) => Promise<void>;
  mutate: (action: () => Promise<unknown>, message: string, snapshot?: PlanPayload) => Promise<void>;
  showToast: (text: string) => void;
  onNavigateWeek: (k: string) => void;
}) {
  if (drawer.type === "create") {
    return (
      <CreateDrawer
        kind={drawer.createKind}
        defaultDay={drawer.day ?? todayKey}
        todayKey={todayKey}
        plan={plan}
        dailyCap={dailyCap}
        modes={modes}
        items={items}
        onClose={onClose}
        mutate={mutate}
        onNavigateWeek={onNavigateWeek}
      />
    );
  }
  if (drawer.type === "create-project") {
    return <CreateProjectDrawer plan={plan} onClose={onClose} mutate={mutate} />;
  }
  if (drawer.type === "item") {
    const item = items.find((i) => i.id === drawer.itemId);
    if (!item) return null;
    return <ItemDrawer item={item} plan={plan} dailyCap={dailyCap} modes={modes} items={items} onClose={onClose} mutate={mutate} />;
  }
  if (drawer.type === "day") {
    return (
      <DayTypeDrawer
        dateKey={drawer.dateKey}
        plan={plan}
        modes={modes}
        items={items}
        todayKey={todayKey}
        onClose={onClose}
        mutate={mutate}
        onNavigateWeek={onNavigateWeek}
      />
    );
  }
  const project = plan.projects.find((p) => p.id === drawer.projectId);
  if (!project) return null;
  return (
    <ProjectDrawer
      project={project}
      plan={plan}
      items={items}
      todayKey={todayKey}
      estFocus={drawer.estFocus}
      onClose={onClose}
      mutate={mutate}
      onCreateTask={() => {}}
    />
  );
}

function CreateDrawer({
  kind: initialKind,
  defaultDay,
  todayKey,
  plan,
  dailyCap,
  modes,
  items,
  onClose,
  mutate,
  onNavigateWeek,
}: {
  kind: CreateKind;
  defaultDay: string;
  todayKey: string;
  plan: PlanPayload;
  dailyCap: number;
  modes: Map<string, PlanDayMode>;
  items: PlanItemRow[];
  onClose: () => void;
  mutate: (action: () => Promise<unknown>, message: string, snapshot?: PlanPayload) => Promise<void>;
  onNavigateWeek: (k: string) => void;
}) {
  const [kind, setKind] = useState(initialKind);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [day, setDay] = useState(defaultDay);
  const [time, setTime] = useState("11:00");
  const [duration, setDuration] = useState("1 ч");
  const [durationInput, setDurationInput] = useState("2");
  const snap = structuredClone(plan);

  const kinds: [CreateKind, string][] = [
    ["task", "Задача"],
    ["call", "Созвон"],
    ["personal", "Личное событие"],
    ["strategy", "День стратегии"],
    ["creative", "Творческий день"],
    ["rest", "День отдыха"],
  ];

  const activeProj = plan.projects.filter((p) => p.dispatchWorkStatus !== "done");

  const save = async () => {
    if (kind === "task") {
      const mins = parseDurationInput(durationInput);
      if (!mins) {
        showToastLocal("Укажите длительность, например 2 ч или 90 мин");
        return;
      }
      const planDate = day === "__backlog__" ? null : day;
      if (planDate) {
        const h = mins / 60;
        const mode = dmode(modes, planDate);
        if (capOf(mode, dailyCap) === 0) {
          showToastLocal(mode === "rest" ? "Это день отдыха" : "Это творческий день — клиентские слоты не ставим");
          return;
        }
        if (h > freeHours(items, modes, planDate, dailyCap)) {
          showToastLocal(`В этом дне свободно только ${freeHours(items, modes, planDate, dailyCap)} ч`);
          return;
        }
      }
      await mutate(
        () =>
          createPlanItemApi({
            kind: "task",
            title: title.trim() || "Задача без названия",
            project_id: projectId || null,
            plan_date: planDate,
            planned_minutes: mins,
          }),
        planDate ? `Задача поставлена на ${fmtWeekday(parseYmd(planDate))}` : "Задача добавлена в бэклог",
        snap
      );
      if (planDate) onNavigateWeek(planDate);
      return;
    }
    if (!day) return;
    if (kind === "call" || kind === "personal") {
      await mutate(
        () =>
          createPlanItemApi({
            kind,
            title: title.trim() || (kind === "call" ? "Созвон" : "Личное событие"),
            plan_date: day,
            event_time: time,
            duration_label: duration,
          }),
        `${kind === "call" ? "Созвон" : "Событие"} добавлен на ${fmtWeekday(parseYmd(day))}`,
        snap
      );
      onNavigateWeek(day);
      return;
    }
    const modeMap: Record<string, PlanDayMode> = { strategy: "strategy", creative: "creative", rest: "rest" };
    const mode = modeMap[kind]!;
    if (kind !== "strategy" && dayHours(items, day) > 0) {
      showToastLocal("В этом дне есть рабочие слоты — сначала перенесите их");
      return;
    }
    await mutate(
      async () => {
        if (kind !== "rest") {
          for (const [k, v] of modes) {
            if (v === mode && k >= todayKey) await upsertDayModeApi(k, null);
          }
        }
        await upsertDayModeApi(day, mode);
      },
      `${kind === "strategy" ? "День стратегии" : kind === "creative" ? "Творческий день" : "День отдыха"} — ${fmtWeekday(parseYmd(day))}`,
      snap
    );
    onNavigateWeek(day);
  };

  const showToastLocal = (t: string) => mutate(async () => {}, t);

  return (
    <aside className="drawer on" aria-hidden="false">
      <div className="dr-h">
        <div style={{ flex: 1 }}>
          <span className="kick">Календарь</span>
          <h2 className="sec-title" style={{ marginTop: 6 }}>
            Что добавляем
          </h2>
        </div>
        <button type="button" className="wk-btn" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="dr-b">
        <div className="tsel">
          {kinds.map(([k, label]) => (
            <button key={k} type="button" className={kind === k ? "on" : ""} onClick={() => setKind(k)}>
              {label}
            </button>
          ))}
        </div>
        {kind === "task" ? (
          <>
            <div className="fld">
              <label>Название задачи</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, секция отзывов" />
            </div>
            <div className="fld">
              <label>Проект</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Без проекта</option>
                {activeProj.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.businessLineLabel})
                  </option>
                ))}
              </select>
            </div>
            <div className="fld">
              <label>Сколько времени (часы или минуты)</label>
              <input type="text" value={durationInput} onChange={(e) => setDurationInput(e.target.value)} placeholder="2 ч или 90 мин" />
            </div>
            <div className="fld">
              <label>День</label>
              <PlanDateInput value={day} onChange={setDay} />
            </div>
            <div className="fld">
              <label>Без даты (бэклог)</label>
              <select
                value={day === "__backlog__" ? "__backlog__" : "dated"}
                onChange={(e) => setDay(e.target.value === "__backlog__" ? "__backlog__" : defaultDay)}
              >
                <option value="dated">С датой</option>
                <option value="__backlog__">Без даты — в бэклог</option>
              </select>
            </div>
          </>
        ) : kind === "call" || kind === "personal" ? (
          <>
            <div className="fld">
              <label>Название</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={kind === "call" ? "Созвон с клиентом" : "Личное событие"}
              />
            </div>
            <div className="fld2">
              <div className="fld">
                <label>День</label>
                <PlanDateInput value={day} onChange={setDay} />
              </div>
              <div className="fld">
                <label>Время</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <div className="fld">
              <label>Длительность</label>
              <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                {["30 мин", "1 ч", "1,5 ч", "2 ч"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
            <p className="dr-note">Событие встанет выше рабочих слотов и не займёт плановые часы.</p>
          </>
        ) : (
          <>
            <div className="fld">
              <label>День</label>
              <PlanDateInput value={day} onChange={setDay} />
            </div>
            <p className="dr-note">
              {kind === "strategy"
                ? "Защищённый день стратегии: в него можно поставить один слот до двух часов."
                : kind === "creative"
                  ? "Творческий день: клиентские слоты в него не ставим."
                  : "День отдыха: рабочие слоты в него не ставим."}
            </p>
          </>
        )}
      </div>
      <div className="dr-f">
        <button type="button" className="btn btn--pri" onClick={() => void save()}>
          Добавить
        </button>
        <button type="button" className="btn btn--gh" onClick={onClose}>
          Отмена
        </button>
      </div>
    </aside>
  );
}

function ItemDrawer({
  item,
  plan,
  dailyCap,
  modes,
  items,
  onClose,
  mutate,
}: {
  item: PlanItemRow;
  plan: PlanPayload;
  dailyCap: number;
  modes: Map<string, PlanDayMode>;
  items: PlanItemRow[];
  onClose: () => void;
  mutate: (action: () => Promise<unknown>, message: string, snapshot?: PlanPayload) => Promise<void>;
}) {
  const isTask = item.kind === "task";
  const [title, setTitle] = useState(item.title);
  const [projectId, setProjectId] = useState(item.project_id ?? "");
  const [day, setDay] = useState(item.plan_date ?? "");
  const [durationInput, setDurationInput] = useState(
    item.planned_minutes ? (item.planned_minutes % 60 === 0 ? `${item.planned_minutes / 60} ч` : `${item.planned_minutes} мин`) : "2 ч"
  );
  const [time, setTime] = useState(item.event_time ?? "11:00");
  const [durLabel, setDurLabel] = useState(item.duration_label ?? "1 ч");
  const snap = structuredClone(plan);
  const activeProj = plan.projects.filter((p) => p.dispatchWorkStatus !== "done");

  const save = async () => {
    if (isTask) {
      const mins = parseDurationInput(durationInput);
      if (!mins) return;
      if (day && day !== "__backlog__") {
        const h = mins / 60;
        if (h > freeHours(items.filter((i) => i.id !== item.id), modes, day, dailyCap) + itemHours(item)) {
          mutate(async () => {}, "Недостаточно свободных часов в этом дне");
          return;
        }
      }
      await mutate(
        () =>
          updatePlanItemApi(item.id, {
            title: title.trim() || item.title,
            project_id: projectId || null,
            plan_date: day === "__backlog__" || !day ? null : day,
            planned_minutes: mins,
          }),
        `«${title}» обновлён`,
        snap
      );
    } else {
      await mutate(
        () =>
          updatePlanItemApi(item.id, {
            title: title.trim() || item.title,
            plan_date: day || null,
            event_time: time,
            duration_label: durLabel,
          }),
        `«${title}» обновлён`,
        snap
      );
    }
  };

  return (
    <aside className="drawer on" aria-hidden="false">
      <div className="dr-h">
        <div style={{ flex: 1 }}>
          <span className="kick">{isTask ? "Слот в календаре" : item.kind === "call" ? "Созвон" : "Личное событие"}</span>
          <h2 className="sec-title" style={{ marginTop: 6 }}>
            {item.title}
          </h2>
        </div>
        <button type="button" className="wk-btn" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="dr-b">
        <div className="fld">
          <label>Название</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        {isTask ? (
          <>
            <div className="fld">
              <label>Проект</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Без проекта</option>
                {activeProj.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="fld">
              <label>Сколько времени</label>
              <input type="text" value={durationInput} onChange={(e) => setDurationInput(e.target.value)} placeholder="2 ч или 90 мин" />
            </div>
            <div className="fld">
              <label>День</label>
              <PlanDateInput value={day === "__backlog__" ? "" : day} onChange={setDay} />
            </div>
            <button type="button" className="btn btn--gh btn--sm" onClick={() => setDay("__backlog__")}>
              Убрать дату (в бэклог)
            </button>
          </>
        ) : (
          <>
            <div className="fld2">
              <div className="fld">
                <label>День</label>
                <PlanDateInput value={day} onChange={setDay} />
              </div>
              <div className="fld">
                <label>Время</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <div className="fld">
              <label>Длительность</label>
              <select value={durLabel} onChange={(e) => setDurLabel(e.target.value)}>
                {["30 мин", "1 ч", "1,5 ч", "2 ч"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <p className="dr-note">
          {isTask ? "Часы в слоте — запланированный объём, а не отработанное время." : "Часы события входят в сумму дня вместе с рабочими слотами."}
        </p>
      </div>
      <div className="dr-f">
        <button type="button" className="btn btn--pri" onClick={() => void save()}>
          Сохранить
        </button>
        <button
          type="button"
          className="btn btn--gh"
          onClick={() => void mutate(() => deletePlanItemApi(item.id), `«${item.title}» удалён`, snap)}
        >
          Удалить
        </button>
        <button type="button" className="btn btn--gh" onClick={onClose}>
          Отмена
        </button>
      </div>
    </aside>
  );
}

function DayTypeDrawer({
  dateKey,
  plan,
  modes,
  items,
  todayKey,
  onClose,
  mutate,
  onNavigateWeek,
}: {
  dateKey: string;
  plan: PlanPayload;
  modes: Map<string, PlanDayMode>;
  items: PlanItemRow[];
  todayKey: string;
  onClose: () => void;
  mutate: (action: () => Promise<unknown>, message: string, snapshot?: PlanPayload) => Promise<void>;
  onNavigateWeek: (k: string) => void;
}) {
  const current = dmode(modes, dateKey);
  const [sel, setSel] = useState<"norm" | PlanDayMode>(current ?? "norm");
  const [day, setDay] = useState(dateKey);
  const snap = structuredClone(plan);

  const notes: Record<string, string> = {
    norm: "Четыре плановых часа под проектные задачи.",
    strategy: "Защищённый день: один слот до двух часов, клиентские проекты не планируем.",
    creative: "Творческий день: клиентские слоты не ставим, созвоны и личные события можно.",
    rest: "День отдыха: рабочие слоты не ставим.",
  };

  const save = async () => {
    if (!day) return;
    if (sel !== "norm" && sel !== "strategy" && dayHours(items, day) > 0) {
      mutate(async () => {}, "В этом дне есть рабочие слоты — сначала перенесите их");
      return;
    }
    await mutate(
      async () => {
        if (dateKey !== day) await upsertDayModeApi(dateKey, null);
        if (sel === "norm") await upsertDayModeApi(day, null);
        else {
          if (sel !== "rest") {
            for (const [k, v] of modes) {
              if (v === sel && k >= todayKey) await upsertDayModeApi(k, null);
            }
          }
          await upsertDayModeApi(day, sel);
        }
      },
      sel === "norm"
        ? "Метка дня убрана"
        : `${sel === "strategy" ? "День стратегии" : sel === "creative" ? "Творческий день" : "День отдыха"} — ${fmtWeekday(parseYmd(day))}`,
      snap
    );
    onNavigateWeek(day);
  };

  const opts: ["norm" | PlanDayMode, string][] = [
    ["norm", "Обычный день"],
    ["strategy", "День стратегии"],
    ["creative", "Творческий день"],
    ["rest", "День отдыха"],
  ];

  return (
    <aside className="drawer on" aria-hidden="false">
      <div className="dr-h">
        <div style={{ flex: 1 }}>
          <span className="kick">{fmtWeekday(parseYmd(dateKey))}</span>
          <h2 className="sec-title" style={{ marginTop: 6 }}>
            Тип дня
          </h2>
        </div>
        <button type="button" className="wk-btn" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="dr-b">
        <div className="tsel">
          {opts.map(([k, label]) => (
            <button key={k} type="button" className={sel === k ? "on" : ""} onClick={() => setSel(k)}>
              {label}
            </button>
          ))}
        </div>
        <p className="dr-note">{notes[sel === "norm" ? "norm" : sel]}</p>
        <div className="fld">
          <label>День</label>
          <PlanDateInput value={day} onChange={setDay} />
        </div>
        <p className="dr-note">
          Стратегия и творческий день бывают один раз в неделю — прежняя метка переедет на выбранный день. Метку также
          можно перетащить прямо в календаре.
        </p>
      </div>
      <div className="dr-f">
        <button type="button" className="btn btn--pri" onClick={() => void save()}>
          Применить
        </button>
        <button type="button" className="btn btn--gh" onClick={onClose}>
          Отмена
        </button>
      </div>
    </aside>
  );
}

function ProjectDrawer({
  project: p,
  plan,
  items,
  todayKey,
  estFocus,
  onClose,
  mutate,
}: {
  project: PlanProjectView;
  plan: PlanPayload;
  items: PlanItemRow[];
  todayKey: string;
  estFocus?: boolean;
  onClose: () => void;
  mutate: (action: () => Promise<unknown>, message: string, snapshot?: PlanPayload) => Promise<void>;
  onCreateTask: () => void;
}) {
  const [deadline, setDeadline] = useState(toDateInputValue(p.workDeadline));
  const [est, setEst] = useState(p.plannedHoursRemaining != null ? String(p.plannedHoursRemaining) : "");
  const [status, setStatus] = useState(p.dispatchWorkStatus);
  const estRef = useRef<HTMLInputElement>(null);
  const snap = structuredClone(plan);
  const u = unplacedHours(p, items, todayKey);
  const list = items.filter((it) => it.kind === "task" && it.project_id === p.id).sort((a, b) => (a.plan_date ?? "").localeCompare(b.plan_date ?? ""));

  useEffect(() => {
    if (estFocus) estRef.current?.focus();
  }, [estFocus]);

  const save = async () => {
    await mutate(
      () =>
        updateProjectApi(p.id, {
          work_deadline: deadline || null,
          planned_hours_remaining: est === "" ? null : Number(est),
          dispatch_work_status: status,
        }),
      `«${p.name}» обновлён`,
      snap
    );
  };

  const clearFuture = async () => {
    const future = list.filter((t) => t.plan_date && t.plan_date >= todayKey);
    await mutate(
      async () => {
        for (const t of future) await deletePlanItemApi(t.id);
      },
      `Будущие задачи «${p.name}» сняты`,
      snap
    );
  };

  return (
    <aside className="drawer on" aria-hidden="false">
      <div className="dr-h">
        <div style={{ flex: 1 }}>
          <span className="kick">
            {p.businessLineLabel}
          </span>
          <h2 className="sec-title" style={{ marginTop: 6 }}>
            {p.name}
          </h2>
          {p.createdAt ? (
            <p className="sec-sub" style={{ marginTop: 6 }}>
              Создан {fmtLong(new Date(p.createdAt))}
            </p>
          ) : null}
        </div>
        <button type="button" className="wk-btn" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="dr-b">
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <span className={`pill ${STATUS_UI[p.dispatchWorkStatus].css}`}>{STATUS_UI[p.dispatchWorkStatus].label}</span>
          <span className="pill st--plan">в календаре {futureProjectHours(items, p.id, todayKey)} ч</span>
          {p.planHidden ? <span className="pill st--plan">скрыт из плана</span> : null}
          {u === null ? (
            <span className="pill st--plan">оценка не указана</span>
          ) : u > 0 ? (
            <span className="pill st--plan">не размещено ≈ {u} ч</span>
          ) : null}
        </div>
        <div className="fld2">
          <div className="fld">
            <label htmlFor="plan-work-deadline">Рабочий дедлайн</label>
            <PlanDateInput id="plan-work-deadline" value={deadline} onChange={setDeadline} />
          </div>
          <div className="fld">
            <label>Оценка остатка, ч</label>
            <input ref={estRef} type="number" min={0} step={1} placeholder="не указана" value={est} onChange={(e) => setEst(e.target.value)} />
          </div>
        </div>
        <div className="fld">
          <label>Рабочий статус</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as DispatchWorkStatus)}>
            {Object.entries(STATUS_UI).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="kick" style={{ display: "block", marginBottom: 10 }}>
            Задачи проекта в календаре
          </label>
          {list.length ? (
            <div className="tlist">
              {list.map((t) => (
                <div key={t.id} className="trow">
                  <b>{t.title}</b>
                  <span>
                    {t.plan_date ? fmtShort(parseYmd(t.plan_date)) : "без даты"} · {hoursLabel(t)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="dr-note">Задач в календаре нет.</p>
          )}
        </div>
        <div className="dr-acts">
          <button type="button" className="dr-act" onClick={() => mutate(async () => {}, "Используйте «Создать задачу» в календаре")}>
            Добавить задачу проекта
          </button>
          <button type="button" className="dr-act dr-act--dan" onClick={() => void clearFuture()}>
            Снять будущие задачи
          </button>
        </div>
        <button
          type="button"
          className="dr-act"
          onClick={() =>
            void mutate(
              () => updateProjectApi(p.id, { plan_hidden: !p.planHidden }),
              p.planHidden ? `«${p.name}» снова в плане` : `«${p.name}» скрыт из плана`,
              snap
            )
          }
        >
          {p.planHidden ? "Вернуть в план" : "Скрыть из плана"}
        </button>
        <p className="dr-note">
          Оценка остатка — последнее значение, которое вы указали. Система не уменьшает её сама и не считает прошедшие
          слоты выполненными. Скрытие убирает карточку из канбана и списка, но не удаляет проект и не трогает слоты в
          календаре.
        </p>
      </div>
      <div className="dr-f">
        <button type="button" className="btn btn--pri" onClick={() => void save()}>
          Сохранить
        </button>
        <button type="button" className="btn btn--gh" onClick={onClose}>
          Отмена
        </button>
      </div>
    </aside>
  );
}

function CreateProjectDrawer({
  plan,
  onClose,
  mutate,
}: {
  plan: PlanPayload;
  onClose: () => void;
  mutate: (action: () => Promise<unknown>, message: string, snapshot?: PlanPayload) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [est, setEst] = useState("");
  const [deadline, setDeadline] = useState("");
  const [includeFinance, setIncludeFinance] = useState(false);
  const [totalAmount, setTotalAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"not_paid" | "prepaid" | "paid">("not_paid");
  const snap = structuredClone(plan);

  const save = async () => {
    const title = name.trim();
    if (!title) return;
    const hours = est.trim() === "" ? null : Number(est);
    if (hours != null && (!Number.isFinite(hours) || hours < 0)) return;

    let amount: number | null = null;
    let paid: number | null = null;
    if (includeFinance) {
      amount = Number(String(totalAmount).replace(/\s/g, "").replace(",", "."));
      if (!Number.isFinite(amount) || amount < 0) return;
      paid = paidAmount.trim() === "" ? 0 : Number(String(paidAmount).replace(/\s/g, "").replace(",", "."));
      if (!Number.isFinite(paid) || paid < 0) return;
    }

    await mutate(
      () =>
        createPlanProjectApi({
          name: title,
          planned_hours_remaining: hours,
          work_deadline: deadline || null,
          include_in_finance: includeFinance,
          total_amount: amount,
          paid_amount: paid,
          payment_status: includeFinance ? paymentStatus : null,
        }),
      includeFinance
        ? `Проект «${title}» добавлен в план и финансы`
        : `Проект «${title}» добавлен`,
      snap
    );
    onClose();
  };

  return (
    <aside className="drawer on" aria-hidden="false">
      <div className="dr-h">
        <div style={{ flex: 1 }}>
          <span className="kick">Проекты</span>
          <h2 className="sec-title" style={{ marginTop: 6 }}>
            Новый проект
          </h2>
        </div>
        <button type="button" className="wk-btn" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="dr-b">
        <div className="fld">
          <label>Название</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Клиент · задача"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !includeFinance) void save();
            }}
          />
        </div>
        <div className="fld2">
          <div className="fld">
            <label>Оценка остатка, ч</label>
            <input type="number" min={0} step={1} placeholder="необязательно" value={est} onChange={(e) => setEst(e.target.value)} />
          </div>
          <div className="fld">
            <label htmlFor="plan-new-work-deadline">Рабочий дедлайн</label>
            <PlanDateInput id="plan-new-work-deadline" value={deadline} onChange={setDeadline} />
          </div>
        </div>

        <label className="plan-check">
          <input
            type="checkbox"
            checked={includeFinance}
            onChange={(e) => setIncludeFinance(e.target.checked)}
          />
          <span>
            <b>Добавить в финансы</b>
            <em>Появится в «Проекты и финансы» с суммой</em>
          </span>
        </label>

        {includeFinance ? (
          <div className="plan-finance-box">
            <div className="fld">
              <label>Сумма, ₽</label>
              <input
                type="number"
                min={0}
                step={1000}
                placeholder="например 80000"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
            </div>
            <div className="fld2">
              <div className="fld">
                <label>Статус оплаты</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as "not_paid" | "prepaid" | "paid")}
                >
                  <option value="not_paid">Не оплачен</option>
                  <option value="prepaid">Предоплата</option>
                  <option value="paid">Оплачен</option>
                </select>
              </div>
              <div className="fld">
                <label>Оплачено, ₽</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="0"
                  value={paymentStatus === "paid" ? totalAmount : paidAmount}
                  disabled={paymentStatus === "paid"}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="dr-note">Появится в колонке «Запланирован». Финансы можно дописать позже.</p>
        )}
      </div>
      <div className="dr-f">
        <button
          type="button"
          className="btn btn--pri"
          disabled={!name.trim() || (includeFinance && totalAmount.trim() === "")}
          onClick={() => void save()}
        >
          Добавить
        </button>
        <button type="button" className="btn btn--gh" onClick={onClose}>
          Отмена
        </button>
      </div>
    </aside>
  );
}
