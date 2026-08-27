"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { appPath } from "@/lib/api-url";
import { SP_GOAL, normalizeSportDoc, type SportDoc, type SportView, type SportWeek } from "@/lib/v2/personal/seeds/sport-seed";
import { fatPct, n1, sgn, spAvg, spVerdict } from "@/lib/v2/personal/sport-helpers";
import { SportChartsGrid } from "@/components/v2/personal/sport/sport-charts";
import { SpCard, SpDelta, SpKick, SpSect } from "@/components/v2/personal/sport/sport-primitives";
import { SportProgram, SportStrategy } from "@/components/v2/personal/sport/sport-training";
import { SportWeeksTable } from "@/components/v2/personal/sport/sport-weeks";

const TABS: [SportView, string][] = [
  ["metrics", "Показатели"],
  ["weeks", "Недели"],
  ["training", "Тренировки"],
  ["strategy", "Стратегия"],
];

function SpKpi({
  label,
  value,
  unit,
  delta,
  dec = 1,
  good = "down",
}: {
  label: string;
  value: string;
  unit: string;
  delta: number | null;
  dec?: number;
  good?: "down" | "up" | "none";
}) {
  return (
    <div className="flex flex-col gap-1">
      <SpKick>{label}</SpKick>
      <div className="flex items-baseline gap-1.5 whitespace-nowrap">
        <span className="v2-tighter v2-tnum text-[30px] font-semibold leading-none text-[var(--v2-ink-900)]">{value}</span>
        <span className="text-[12.5px] text-[var(--v2-ink-400)]">{unit}</span>
        <span className="ml-1">
          <SpDelta v={delta} d={dec} good={good} />
        </span>
      </div>
    </div>
  );
}

function SpBanner({
  cur,
  prev,
  weekLabel,
  verdict,
}: {
  cur: ReturnType<typeof spAvg>;
  prev: ReturnType<typeof spAvg>;
  weekLabel: string;
  verdict: ReturnType<typeof spVerdict>;
}) {
  const d = (k: "w" | "f" | "l") =>
    cur && prev && cur[k] != null && prev[k] != null ? (cur[k] as number) - (prev[k] as number) : null;
  const pc = fatPct(cur);
  const pp = fatPct(prev);

  return (
    <SpCard className="relative overflow-hidden">
      {/* Широкий hero: женщина справа, плавный переход с белой плашки слева */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-[min(62%,560px)] min-w-[220px] sm:min-w-[280px]"
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={appPath("/sport/hero-banner.png")}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "78% 18%" }}
        />
        <div
          className="absolute inset-y-0 left-0 w-[62%]"
          style={{
            background:
              "linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.96) 14%, rgba(255,255,255,0.72) 36%, rgba(255,255,255,0.28) 58%, rgba(255,255,255,0) 100%)",
          }}
        />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-[min(52%,480px)]"
        aria-hidden
        style={{
          background:
            "linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.88) 55%, rgba(255,255,255,0) 100%)",
        }}
      />

      <div className="relative z-10 min-w-0 max-w-[min(100%,640px)] px-7 py-6 pr-[min(34%,200px)] sm:pr-[min(38%,240px)]">
        <SpKick className="text-[var(--v2-brand-600)]">Спорт · {weekLabel}</SpKick>
        <h1 className="v2-tighter v2-tnum mt-2 text-[27px] font-semibold leading-[1.15] text-[var(--v2-ink-900)]">
          {verdict.head}
        </h1>
        <p className="mt-2 max-w-[520px] text-[13.5px] text-[var(--v2-ink-500)]" style={{ textWrap: "pretty" }}>
          {verdict.sub}
        </p>
        <div className="mt-6 flex flex-wrap items-start gap-x-8 gap-y-4">
          <SpKpi label="Средний вес" value={n1(cur?.w)} unit="кг" delta={d("w")} good="up" />
          <SpKpi label="Жир" value={n1(cur?.f)} unit="кг" delta={d("f")} good="down" dec={2} />
          <SpKpi label="Безжировая" value={n1(cur?.l)} unit="кг" delta={d("l")} good="up" />
          <SpKpi label="Жир" value={n1(pc)} unit="%" delta={pc != null && pp != null ? pc - pp : null} good="down" />
        </div>
      </div>
    </SpCard>
  );
}

function SpGoal({ cur }: { cur: ReturnType<typeof spAvg> }) {
  const pc = fatPct(cur);
  const dL = cur?.l != null ? SP_GOAL.lTarget - cur.l : null;
  const dF = cur?.f != null ? SP_GOAL.fTarget - cur.f : null;
  const dW = cur?.w != null ? SP_GOAL.lTarget + SP_GOAL.fTarget - cur.w : null;

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(240px,300px) minmax(0,1fr)" }}>
      <SpCard className="flex flex-col p-5">
        <SpKick className="text-[var(--v2-brand-600)]">Цель</SpKick>
        <div className="mt-3 flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="v2-tighter v2-tnum text-[30px] font-semibold leading-none text-[var(--v2-ink-900)]">
            {SP_GOAL.wLo}–{SP_GOAL.wHi}
          </span>
          <span className="text-[13px] text-[var(--v2-ink-400)]">кг</span>
        </div>
        <div className="mt-4 grid gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] text-[var(--v2-ink-500)]">Безжировая</span>
            <span className="v2-tnum whitespace-nowrap text-[15px] font-semibold text-[var(--v2-ink-900)]">
              {SP_GOAL.lTarget} кг
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] text-[var(--v2-ink-500)]">Жир</span>
            <span className="v2-tnum whitespace-nowrap text-[15px] font-semibold text-[var(--v2-ink-900)]">
              {SP_GOAL.fTarget} кг · {SP_GOAL.fLo}–{SP_GOAL.fHi}%
            </span>
          </div>
        </div>
        <div className="mt-5 grid gap-2.5 border-t border-[var(--v2-ink-100)] pt-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] text-[var(--v2-ink-500)]">Набрать мышц</span>
            <span className="v2-tnum whitespace-nowrap text-[15px] font-semibold" style={{ color: "#047857" }}>
              {dL != null ? sgn(dL, 1) : "—"} кг
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] text-[var(--v2-ink-500)]">Скинуть жира</span>
            <span className="v2-tnum whitespace-nowrap text-[15px] font-semibold" style={{ color: "#B45309" }}>
              {dF != null ? sgn(dF, 1) : "—"} кг
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] text-[var(--v2-ink-500)]">Итого по весу</span>
            <span className="v2-tnum whitespace-nowrap text-[15px] font-semibold text-[var(--v2-ink-900)]">
              {dW != null ? sgn(dW, 1) : "—"} кг
            </span>
          </div>
        </div>
        <p className="mt-4 text-[12.5px] text-[var(--v2-ink-400)]" style={{ textWrap: "pretty" }}>
          Сейчас {n1(cur?.l)} кг безжировой и {n1(cur?.f)} кг жира, это {n1(pc)}%. Вес растёт — вся прибавка
          должна идти в безжировую массу.
        </p>
      </SpCard>
      <SpCard className="p-4">
        <div className="mb-3 flex items-center gap-2 px-1">
          <SpKick>Референсы</SpKick>
          <span className="text-[12px] text-[var(--v2-ink-400)]">фото прогресса — скоро</span>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex aspect-[3/4] items-center justify-center rounded-xl bg-[var(--v2-ink-50)] text-[13px] text-[var(--v2-ink-400)]"
            >
              Референс {i}
            </div>
          ))}
        </div>
      </SpCard>
    </div>
  );
}

function SpPhotos({ weeks }: { weeks: SportWeek[] }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))" }}>
      {weeks.map((wk) => {
        const a = spAvg(wk);
        return (
          <SpCard key={wk.id} className="p-3">
            <div className="flex aspect-[3/4] items-center justify-center rounded-xl bg-[var(--v2-ink-50)] text-[12px] text-[var(--v2-ink-400)]">
              {wk.label}
            </div>
            <div className="mt-2.5 px-0.5 leading-tight">
              <div className="v2-tight truncate text-[13px] font-medium text-[var(--v2-ink-900)]">{wk.label}</div>
              <div className="v2-tnum mt-0.5 whitespace-nowrap text-[12.5px] text-[var(--v2-ink-500)]">
                {n1(a?.w)} кг · {n1(fatPct(a))}%
              </div>
            </div>
          </SpCard>
        );
      })}
    </div>
  );
}

export function PersonalSportClient() {
  const [doc, setDoc] = useState<SportDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSave = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchJson<{ doc: SportDoc }>("/api/v2/personal/life-docs/sport");
      setDoc(normalizeSportDoc(res.doc));
    } finally {
      setLoading(false);
      skipSave.current = true;
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = useCallback((fn: (d: SportDoc) => SportDoc) => {
    setDoc((prev) => (prev ? fn(prev) : prev));
  }, []);

  useEffect(() => {
    if (!doc || skipSave.current) {
      skipSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await fetchJson<{ doc: SportDoc }>("/api/v2/personal/life-docs/sport", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doc }),
        });
        setDoc(normalizeSportDoc(res.doc));
      } finally {
        setSaving(false);
      }
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [doc]);

  const rows = useMemo(
    () => (doc ? doc.weeks.map((w) => ({ ...w, a: spAvg(w) })) : []),
    [doc]
  );
  const cur = rows.length ? rows[rows.length - 1]?.a : null;
  const prev = rows.length > 1 ? rows[rows.length - 2]?.a : null;
  const verdict = useMemo(() => spVerdict(rows), [rows]);

  if (loading || !doc) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-[14px] text-[var(--v2-ink-500)]">
        Загрузка…
      </div>
    );
  }

  const setWeek = (i: number, k: keyof SportWeek, v: unknown) =>
    patch((d) => ({ ...d, weeks: d.weeks.map((w, j) => (j === i ? { ...w, [k]: v } : w)) }));

  const delWeek = (i: number) => patch((d) => ({ ...d, weeks: d.weeks.filter((_, j) => j !== i) }));

  const commitWeek = (payload: {
    w: number | null;
    f: number | null;
    kcal: number | null;
    protein: number | null;
    wn: number | null;
    ww: number | null;
    note: string;
  }) => {
    patch((d) => {
      const n = d.weeks.filter((w) => /^Неделя/.test(w.label)).length + 1;
      const lastW = d.weeks[d.weeks.length - 1] || {};
      const w = payload.w ?? 0;
      const f = payload.f;
      const week: SportWeek = {
        id: "w" + Date.now(),
        label: `Неделя ${n}`,
        dates: "",
        days: [],
        kcal: payload.kcal != null ? payload.kcal : lastW.kcal,
        protein: payload.protein != null ? payload.protein : lastW.protein,
        wn: payload.wn,
        ww: payload.ww,
        note: payload.note,
        avg: { w, f: f ?? undefined, l: f != null ? w - f : null },
      };
      return { ...d, weeks: [...d.weeks, week], wid: week.id };
    });
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-end gap-1 px-8">
        {TABS.map(([k, t]) => (
          <button
            key={k}
            type="button"
            onClick={() => patch((d) => ({ ...d, view: k }))}
            className={`v2-tight inline-flex h-8 items-center rounded-lg px-3.5 text-[13px] transition ${doc.view === k ? "bg-white font-medium text-[var(--v2-ink-900)] shadow-[var(--v2-shadow-card)]" : "text-[var(--v2-ink-500)] hover:bg-white/70 hover:text-[var(--v2-ink-900)]"}`}
          >
            {t}
          </button>
        ))}
        {saving ? <span className="ml-auto text-[12px] text-[var(--v2-ink-400)]">Сохранение…</span> : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-9 px-8 pb-16 pt-2 max-w-[1240px]">
        <SpBanner
          cur={cur}
          prev={prev}
          weekLabel={rows[rows.length - 1]?.label ?? "—"}
          verdict={verdict}
        />

        {doc.view === "metrics" ? (
          <>
            <SpSect accent="#0EA5A4" title="Динамика" hint="по средним за неделю · клик — полный график">
              <SportChartsGrid rows={rows} />
            </SpSect>
            <SpSect accent="#C2410C" title="К чему стремлюсь">
              <SpGoal cur={cur} />
            </SpSect>
            <SpSect accent="#0A0A0B" title="Фото недель">
              <SpPhotos weeks={doc.weeks} />
            </SpSect>
          </>
        ) : null}

        {doc.view === "weeks" ? (
          <SpSect accent="#3B6FF7" title="Недели" hint="средние за неделю · клик по неделе — ежедневные замеры">
            <SportWeeksTable weeks={doc.weeks} setWeek={setWeek} commitWeek={commitWeek} delWeek={delWeek} />
          </SpSect>
        ) : null}

        {doc.view === "training" ? (
          <SpSect accent="#7C3AED" title="Программа тренировок" hint="план обновляешь раз в неделю, факт — по подходам">
            <SportProgram
              program={doc.program}
              setProgram={(p) => patch((d) => ({ ...d, program: p }))}
              acts={doc.acts}
              setActs={(a) => patch((d) => ({ ...d, acts: a }))}
              weeks={doc.weeks}
              wid={doc.wid || doc.weeks[doc.weeks.length - 1]?.id || ""}
              setWid={(id) => patch((d) => ({ ...d, wid: id }))}
            />
          </SpSect>
        ) : null}

        {doc.view === "strategy" ? (
          <SpSect accent="#52525B" title="Стратегия" hint="вставь свой текст, разбей на разделы">
            <SportStrategy str={doc.strategy} setStr={(s) => patch((d) => ({ ...d, strategy: s }))} />
          </SpSect>
        ) : null}
      </div>
    </div>
  );
}
