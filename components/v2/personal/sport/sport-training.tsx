"use client";

import { useState } from "react";
import { V2Icons } from "@/components/v2/ui/icons";
import type { SportExercise, SportProgramDay, SportSetLog, SportWeek } from "@/lib/v2/personal/seeds/sport-seed";
import { SpArea, SpCard, SpChip, SpInp } from "@/components/v2/personal/sport/sport-primitives";

function SpSetCell({
  v,
  onW,
  onR,
  i,
}: {
  v?: SportSetLog;
  onW: (v: string) => void;
  onR: (v: string) => void;
  i: number;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-[var(--v2-ink-200)] bg-white py-1.5 pl-2 pr-1.5 transition focus-within:border-[var(--v2-brand-400)] focus-within:shadow-[0_0_0_3px_rgba(59,111,247,0.10)]">
      <span className="v2-tnum text-[10.5px] font-semibold text-[var(--v2-ink-300)]">{i + 1}</span>
      <input
        value={v?.w || ""}
        onChange={(e) => onW(e.target.value)}
        placeholder="кг"
        className="v2-tnum w-[38px] bg-transparent text-right text-[14px] font-semibold text-[var(--v2-ink-900)] outline-none"
      />
      <span className="text-[12px] text-[var(--v2-ink-300)]">×</span>
      <input
        value={v?.r || ""}
        onChange={(e) => onR(e.target.value)}
        placeholder="—"
        className="v2-tnum w-[30px] bg-transparent text-[14px] font-semibold text-[var(--v2-ink-900)] outline-none"
      />
    </div>
  );
}

function SpExerciseCard({
  ex,
  no,
  act,
  setEx,
  setAct,
  del,
}: {
  ex: SportExercise;
  no: string;
  act?: SportSetLog[];
  setEx: (k: keyof SportExercise, v: unknown) => void;
  setAct: (i: number, k: keyof SportSetLog, v: string) => void;
  del: () => void;
}) {
  const sets = Math.max(1, Math.min(6, parseInt(String(ex.sets)) || 3));
  const done = (act || []).filter((s) => s?.w).length;

  return (
    <div className="group overflow-hidden rounded-2xl border border-[var(--v2-ink-100)] bg-white">
      <div className="flex items-start gap-3 px-4 pb-3 pt-3.5">
        <span className="v2-tnum mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--v2-ink-100)] text-[12.5px] font-semibold text-[var(--v2-ink-600)]">
          {no}
        </span>
        <div className="min-w-0 flex-1">
          <SpInp
            value={ex.n}
            onChange={(v) => setEx("n", v)}
            w="100%"
            align="left"
            ph="Название упражнения"
            mono={false}
            size="15px"
            className="v2-tight leading-snug"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SpChip tint="#2244D8" bg="#EFF4FF">
              <SpInp
                value={ex.sets}
                onChange={(v) => setEx("sets", v)}
                w="20px"
                align="center"
                size="12.5px"
                className="!mx-0 !px-0 !text-[var(--v2-brand-700)]"
              />
              <span className="opacity-50">×</span>
              <SpInp
                value={ex.reps}
                onChange={(v) => setEx("reps", v)}
                w="42px"
                align="center"
                size="12.5px"
                className="!mx-0 !px-0 !text-[var(--v2-brand-700)]"
              />
            </SpChip>
            <SpChip tint="#18181B" bg="#F4F4F5">
              <SpInp
                value={ex.w}
                onChange={(v) => setEx("w", v)}
                w="36px"
                align="center"
                size="12.5px"
                className="!mx-0 !px-0"
                ph="—"
              />
              <span className="text-[var(--v2-ink-400)]">кг</span>
            </SpChip>
            {ex.goal ? <span className="text-[12.5px] text-[var(--v2-ink-500)]">{ex.goal}</span> : null}
            <span
              className={`v2-tnum ml-auto whitespace-nowrap rounded-lg px-2 py-1 text-[11.5px] font-medium ${done >= sets ? "bg-emerald-50 text-emerald-700" : done ? "bg-amber-50 text-amber-700" : "bg-[var(--v2-ink-100)] text-[var(--v2-ink-400)]"}`}
            >
              {done} / {sets} подх.
            </span>
            <button
              type="button"
              onClick={del}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--v2-ink-300)] opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
            >
              <V2Icons.trash className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="px-4 pb-2 pl-[60px]">
        <SpArea value={ex.note || ""} onChange={(v) => setEx("note", v)} ph="Техника, замена, на что акцент…" rows={2} className="!text-[13px] !text-[var(--v2-ink-500)]" />
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 pb-3.5 pl-[60px]">
        {Array.from({ length: sets }).map((_, i) => (
          <SpSetCell
            key={i}
            i={i}
            v={act?.[i]}
            onW={(v) => setAct(i, "w", v)}
            onR={(v) => setAct(i, "r", v)}
          />
        ))}
      </div>
      {ex.log && ex.log.length > 0 ? (
        <div className="flex flex-col gap-1 border-t border-[var(--v2-ink-100)] bg-[var(--v2-ink-50)]/70 px-4 py-2.5 pl-[60px]">
          {ex.log.map((l, i) => (
            <div key={i} className="v2-tnum text-[12.5px] text-[var(--v2-ink-500)]" style={{ textWrap: "pretty" }}>
              {l}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SportProgram({
  program,
  setProgram,
  acts,
  setActs,
  weeks,
  wid,
  setWid,
}: {
  program: SportProgramDay[];
  setProgram: (p: SportProgramDay[]) => void;
  acts: Record<string, Record<string, SportSetLog[]>>;
  setActs: (a: Record<string, Record<string, SportSetLog[]>>) => void;
  weeks: SportWeek[];
  wid: string;
  setWid: (id: string) => void;
}) {
  const [tab, setTab] = useState("A");
  const tr = program.find((t) => t.id === tab) || program[0];
  if (!tr) return null;
  const key = `${wid}|${tr.id}`;

  const upEx = (exId: string, k: keyof SportExercise, v: unknown) =>
    setProgram(
      program.map((t) =>
        t.id !== tr.id ? t : { ...t, ex: t.ex.map((e) => (e.id !== exId ? e : { ...e, [k]: v })) }
      )
    );

  const addEx = () =>
    setProgram(
      program.map((t) =>
        t.id !== tr.id
          ? t
          : {
              ...t,
              ex: [...t.ex, { id: "e" + Date.now(), n: "", sets: 3, reps: "8–12", w: "", note: "", log: [] }],
            }
      )
    );

  const delEx = (exId: string) =>
    setProgram(program.map((t) => (t.id !== tr.id ? t : { ...t, ex: t.ex.filter((e) => e.id !== exId) })));

  const setAct = (exId: string, i: number, k: keyof SportSetLog, v: string) => {
    const cur = acts[key] || {};
    const arr = Array.from({ length: 6 }, (_, j) => (cur[exId] || [])[j] || {});
    arr[i] = { ...arr[i], [k]: v };
    setActs({ ...acts, [key]: { ...cur, [exId]: arr } });
  };

  const setsTotal = tr.ex.reduce((s, e) => s + (parseInt(String(e.sets)) || 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-2xl bg-white p-1 shadow-[var(--v2-shadow-soft)]">
          {program.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`v2-tight flex h-10 items-center gap-2 rounded-xl px-4 text-[13.5px] transition ${tab === t.id ? "bg-[var(--v2-ink-900)] font-semibold text-white" : "text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-900)]"}`}
            >
              {t.name}
              <span
                className={`v2-tnum rounded-md px-1.5 py-0.5 text-[11px] ${tab === t.id ? "bg-white/20 text-white" : "bg-[var(--v2-ink-100)] text-[var(--v2-ink-500)]"}`}
              >
                {t.ex.length}
              </span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[12.5px] text-[var(--v2-ink-400)]">факт за</span>
          <select
            value={wid}
            onChange={(e) => setWid(e.target.value)}
            className="h-10 rounded-xl border border-[var(--v2-ink-200)] bg-white px-3 text-[13px] text-[var(--v2-ink-800)] outline-none focus:border-[var(--v2-brand-400)]"
          >
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <SpCard className="p-6">
        <div className="flex items-start gap-4 border-b border-[var(--v2-ink-100)] pb-5">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--v2-brand-500)] to-[var(--v2-brand-700)] text-[19px] font-semibold text-white">
            {tr.id}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="v2-tighter text-[20px] font-semibold text-[var(--v2-ink-900)]">{tr.name}</h3>
            <SpArea
              value={tr.focus}
              onChange={(v) => setProgram(program.map((t) => (t.id !== tr.id ? t : { ...t, focus: v })))}
              ph="Что качаем на этой тренировке"
              rows={2}
              className="!mt-0.5 !text-[var(--v2-ink-500)]"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SpChip tint="#18181B" bg="#F4F4F5">
              {tr.ex.length} упражнений
            </SpChip>
            <SpChip tint="#18181B" bg="#F4F4F5">
              {tr.total || `${setsTotal} подходов`}
            </SpChip>
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-5">
          {tr.ex.length ? (
            tr.ex.map((e, i) => (
              <SpExerciseCard
                key={e.id}
                ex={e}
                no={String(i + 1).padStart(2, "0")}
                act={(acts[key] || {})[e.id]}
                setEx={(k, v) => upEx(e.id, k, v)}
                setAct={(i2, k, v) => setAct(e.id, i2, k, v)}
                del={() => delEx(e.id)}
              />
            ))
          ) : (
            <div className="py-10 text-center text-[13.5px] text-[var(--v2-ink-400)]">Упражнений пока нет</div>
          )}
          <button
            type="button"
            onClick={addEx}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[var(--v2-ink-200)] text-[13px] font-medium text-[var(--v2-ink-500)] transition hover:border-[var(--v2-ink-300)] hover:bg-[var(--v2-ink-50)]/60 hover:text-[var(--v2-ink-900)]"
          >
            <V2Icons.plus className="h-4 w-4" />
            Упражнение
          </button>
        </div>
      </SpCard>
    </div>
  );
}

export function SportStrategy({
  str,
  setStr,
}: {
  str: Array<{ id: string; h: string; t: string }>;
  setStr: (s: Array<{ id: string; h: string; t: string }>) => void;
}) {
  return (
    <div className="flex max-w-[880px] flex-col gap-4">
      {str.map((s, i) => (
        <SpCard key={s.id || i} className="group px-8 py-7">
          <div className="flex items-start gap-3">
            <input
              value={s.h}
              onChange={(e) => setStr(str.map((x, j) => (j === i ? { ...x, h: e.target.value } : x)))}
              placeholder="Заголовок раздела"
              className="v2-tighter -mx-2 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-[22px] font-semibold text-[var(--v2-ink-900)] outline-none transition hover:border-[var(--v2-ink-200)] focus:border-[var(--v2-brand-400)]"
            />
            {str.length > 1 ? (
              <button
                type="button"
                onClick={() => setStr(str.filter((_, j) => j !== i))}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--v2-ink-300)] opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
              >
                <V2Icons.trash className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <textarea
            value={s.t}
            onChange={(e) => setStr(str.map((x, j) => (j === i ? { ...x, t: e.target.value } : x)))}
            rows={14}
            placeholder="Вставь текст стратегии. Пустая строка между абзацами — и читается как документ."
            className="-mx-3 mt-3 w-full resize-y rounded-xl border border-transparent bg-transparent px-3 py-2 text-[15px] leading-[1.7] text-[var(--v2-ink-700)] outline-none transition hover:border-[var(--v2-ink-200)] focus:border-[var(--v2-brand-400)] focus:bg-white"
            style={{ textWrap: "pretty" }}
          />
        </SpCard>
      ))}
      <button
        type="button"
        onClick={() => setStr([...str, { id: "s" + Date.now(), h: "", t: "" }])}
        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[var(--v2-ink-200)] text-[13px] font-medium text-[var(--v2-ink-500)] transition hover:border-[var(--v2-ink-300)] hover:bg-white hover:text-[var(--v2-ink-900)]"
      >
        <V2Icons.plus className="h-4 w-4" />
        Раздел
      </button>
    </div>
  );
}
