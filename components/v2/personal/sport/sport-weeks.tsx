"use client";

import { useEffect, useRef, useState } from "react";
import { V2Icons } from "@/components/v2/ui/icons";
import { SP_DAYS, fatPct, n1, n2, num, spAvg } from "@/lib/v2/personal/sport-helpers";
import type { SportWeek } from "@/lib/v2/personal/seeds/sport-seed";
import { SpArea, SpDelta, SpInp } from "@/components/v2/personal/sport/sport-primitives";
import { SpCard } from "@/components/v2/personal/sport/sport-primitives";

function Th({ children, className = "", w }: { children: React.ReactNode; className?: string; w?: string }) {
  return (
    <th
      className={`px-3 py-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)] ${className}`}
      style={w ? { width: w } : undefined}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-3.5 align-middle ${className}`}>{children}</td>;
}

/** Цифра в таблице: клик → поле ввода → Enter/blur сохраняет */
function EditableNumCell({
  display,
  editValue,
  onCommit,
  w = "64px",
  placeholder = "—",
}: {
  display: string;
  editValue: string;
  onCommit: (raw: string) => void;
  w?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(editValue);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) return;
    setDraft(editValue);
    ref.current?.focus();
    ref.current?.select();
  }, [editing, editValue]);

  const commit = () => {
    onCommit(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            setDraft(editValue);
            setEditing(false);
          }
        }}
        className="v2-tnum rounded-lg border border-[var(--v2-brand-400)] bg-white px-2 py-1.5 text-right text-[15px] font-semibold text-[var(--v2-ink-900)] shadow-[0_0_0_3px_rgba(59,111,247,0.10)] outline-none"
        style={{ width: w }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Нажми, чтобы изменить"
      className={`v2-tnum inline-block rounded-lg px-2 py-1.5 text-right text-[15px] font-semibold transition hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-brand-700)] ${
        display === "—" ? "text-[var(--v2-ink-300)]" : "text-[var(--v2-ink-900)]"
      }`}
      style={{ minWidth: w }}
    >
      {display}
    </button>
  );
}

function setManualAvg(set: (k: keyof SportWeek, v: unknown) => void, a: ReturnType<typeof spAvg>, patch: { w?: number | null; f?: number | null }) {
  const w = patch.w !== undefined ? patch.w : (a?.w ?? null);
  const f = patch.f !== undefined ? patch.f : (a?.f ?? null);
  set("days", []);
  set("avg", {
    w,
    f,
    l: w != null && f != null ? w - f : null,
  });
}

function fmtEdit(n: number | null | undefined, dec: 1 | 2 = 2): string {
  if (n == null || Number.isNaN(n)) return "";
  return dec === 2 ? n.toFixed(2) : n.toFixed(1);
}

function SpWeekRow({
  wk,
  prev,
  set,
  open,
  toggle,
  last,
  del,
}: {
  wk: SportWeek;
  prev?: SportWeek;
  set: (k: keyof SportWeek, v: unknown) => void;
  open: boolean;
  toggle: () => void;
  last: boolean;
  del: () => void;
}) {
  const a = spAvg(wk);
  const b = prev ? spAvg(prev) : null;
  const pc = fatPct(a);
  const dd = (k: "w" | "f" | "l") => (a && b && a[k] != null && b[k] != null ? (a[k] as number) - (b[k] as number) : null);
  const days = wk.days || [];
  const dset = (i: number, k: "w" | "f", v: string) => {
    const nd = Array.from({ length: 7 }, (_, j) => days[j] || {});
    nd[i] = { ...nd[i], [k]: v };
    set("days", nd);
  };

  return (
    <>
      <tr className={`group border-t border-[var(--v2-ink-100)] transition ${last ? "bg-[var(--v2-brand-50)]/40" : "hover:bg-[var(--v2-ink-50)]/50"}`}>
        <Td className="pl-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={toggle} className="flex min-w-0 items-center gap-2 text-left">
              <V2Icons.chev className={`h-[15px] w-[15px] shrink-0 text-[var(--v2-ink-400)] transition ${open ? "" : "-rotate-90"}`} />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className={`v2-tight truncate text-[14.5px] ${last ? "font-semibold text-[var(--v2-brand-700)]" : "font-medium text-[var(--v2-ink-900)]"}`}>
                  {wk.label}
                </span>
                {a && a.n ? (
                  <span className="text-[11px] text-[var(--v2-ink-400)]">средний из {a.n} дн.</span>
                ) : wk.dates ? (
                  <span className="text-[11px] text-[var(--v2-ink-400)]">{wk.dates}</span>
                ) : null}
              </span>
            </button>
            <button
              type="button"
              onClick={del}
              title="Удалить неделю"
              className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--v2-ink-300)] opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
            >
              <V2Icons.trash className="h-4 w-4" />
            </button>
          </div>
        </Td>
        <Td className="text-right">
          <EditableNumCell
            display={n2(a?.w)}
            editValue={fmtEdit(a?.w)}
            onCommit={(raw) => setManualAvg(set, a, { w: num(raw) })}
          />
        </Td>
        <Td className="text-right">
          <SpDelta v={dd("w")} d={2} good="up" />
        </Td>
        <Td className="text-right">
          <EditableNumCell
            display={n2(a?.f)}
            editValue={fmtEdit(a?.f)}
            onCommit={(raw) => setManualAvg(set, a, { f: num(raw) })}
          />
        </Td>
        <Td className="text-right">
          <SpDelta v={dd("f")} d={2} good="down" />
        </Td>
        <Td className="text-right">
          <span className="v2-tnum text-[15px] font-semibold text-[var(--v2-ink-600)]">{n1(pc)}</span>
        </Td>
        <Td className="text-right">
          <span className="v2-tnum text-[15px] font-semibold text-[var(--v2-ink-900)]">{n2(a?.l)}</span>
        </Td>
        <Td className="text-right">
          <SpDelta v={dd("l")} d={2} good="up" />
        </Td>
        <Td className="text-right">
          <EditableNumCell
            display={wk.wn != null ? n1(wk.wn) : "—"}
            editValue={fmtEdit(wk.wn, 1)}
            w="54px"
            onCommit={(raw) => set("wn", num(raw))}
          />
        </Td>
        <Td className="text-right">
          <EditableNumCell
            display={wk.ww != null ? n1(wk.ww) : "—"}
            editValue={fmtEdit(wk.ww, 1)}
            w="54px"
            onCommit={(raw) => set("ww", num(raw))}
          />
        </Td>
        <Td className="text-right">
          <EditableNumCell
            display={wk.kcal != null ? String(wk.kcal) : "—"}
            editValue={wk.kcal != null ? String(wk.kcal) : ""}
            w="62px"
            onCommit={(raw) => set("kcal", num(raw))}
          />
        </Td>
        <Td className="text-right">
          <EditableNumCell
            display={wk.protein != null ? String(wk.protein) : "—"}
            editValue={wk.protein != null ? String(wk.protein) : ""}
            w="52px"
            onCommit={(raw) => set("protein", num(raw))}
          />
        </Td>
        <Td className="pr-4">
          <SpArea value={wk.note || ""} onChange={(v) => set("note", v)} ph="Заметки, аномалии: сон, соль, стресс, пропуски…" rows={2} />
        </Td>
      </tr>
      {open ? (
        <tr className="border-t border-[var(--v2-ink-100)] bg-[var(--v2-ink-50)]/60">
          <td colSpan={13} className="px-4 py-4">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[var(--v2-ink-400)]">
                Ежедневные замеры
              </span>
              <span className="text-[12px] text-[var(--v2-ink-400)]">заполнил дни — средний за неделю считается по ним</span>
            </div>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(7,minmax(0,1fr))" }}>
              {SP_DAYS.map((d, i) => (
                <div key={d} className="rounded-xl border border-[var(--v2-ink-100)] bg-white px-3 py-2.5">
                  <div className="mb-1.5 text-[11.5px] font-semibold text-[var(--v2-ink-500)]">{d}</div>
                  <div className="flex items-center gap-1">
                    <span className="w-7 shrink-0 text-[11px] text-[var(--v2-ink-400)]">вес</span>
                    <SpInp value={(days[i] || {}).w} onChange={(v) => dset(i, "w", v)} w="100%" size="13.5px" />
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="w-7 shrink-0 text-[11px] text-[var(--v2-ink-400)]">жир</span>
                    <SpInp value={(days[i] || {}).f} onChange={(v) => dset(i, "f", v)} w="100%" size="13.5px" />
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function SpDraftRow({
  nextLabel,
  commit,
  lastKcal,
  lastProtein,
}: {
  nextLabel: string;
  commit: (d: {
    w: number | null;
    f: number | null;
    kcal: number | null;
    protein: number | null;
    wn: number | null;
    ww: number | null;
    note: string;
  }) => void;
  lastKcal?: number | null;
  lastProtein?: number | null;
}) {
  const [d, setD] = useState<Record<string, string>>({});
  const s = (k: string, v: string) => setD({ ...d, [k]: v });
  const ready = num(d.w) != null;
  const go = () => {
    if (!ready) return;
    commit({
      w: num(d.w),
      f: num(d.f),
      kcal: num(d.kcal),
      protein: num(d.protein),
      wn: num(d.wn),
      ww: num(d.ww),
      note: d.note || "",
    });
    setD({});
  };
  const kd = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") go();
  };

  return (
    <tr className="border-t border-dashed border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)]/40">
      <Td className="pl-4">
        <div className="flex items-center gap-2 text-[var(--v2-ink-400)]">
          <V2Icons.plus className="h-[15px] w-[15px] shrink-0" />
          <span className="v2-tight text-[14.5px] font-medium">{nextLabel}</span>
        </div>
      </Td>
      <Td className="text-right">
        <SpInp value={d.w} onChange={(v) => s("w", v)} onKeyDown={kd} w="64px" size="15px" ph="вес" />
      </Td>
      <Td />
      <Td className="text-right">
        <SpInp value={d.f} onChange={(v) => s("f", v)} onKeyDown={kd} w="64px" size="15px" ph="жир" />
      </Td>
      <Td />
      <Td />
      <Td className="text-right">
        <span className="text-[13px] text-[var(--v2-ink-300)]">авто</span>
      </Td>
      <Td />
      <Td className="text-right">
        <SpInp value={d.wn} onChange={(v) => s("wn", v)} onKeyDown={kd} w="54px" size="15px" />
      </Td>
      <Td className="text-right">
        <SpInp value={d.ww} onChange={(v) => s("ww", v)} onKeyDown={kd} w="54px" size="15px" />
      </Td>
      <Td className="text-right">
        <SpInp
          value={d.kcal}
          onChange={(v) => s("kcal", v)}
          onKeyDown={kd}
          w="62px"
          size="15px"
          ph={lastKcal ? String(lastKcal) : "ккал"}
        />
      </Td>
      <Td className="text-right">
        <SpInp
          value={d.protein}
          onChange={(v) => s("protein", v)}
          onKeyDown={kd}
          w="52px"
          size="15px"
          ph={lastProtein ? String(lastProtein) : "г"}
        />
      </Td>
      <Td className="pr-4">
        <div className="flex items-start gap-2">
          <SpArea value={d.note || ""} onChange={(v) => s("note", v)} ph="Заметка к неделе…" rows={2} />
          <button
            type="button"
            onClick={go}
            disabled={!ready}
            className={`h-9 shrink-0 rounded-lg px-3.5 text-[12.5px] font-medium transition ${ready ? "bg-[var(--v2-ink-900)] text-white hover:bg-[var(--v2-ink-800)]" : "cursor-default bg-[var(--v2-ink-100)] text-[var(--v2-ink-400)]"}`}
          >
            Добавить
          </button>
        </div>
      </Td>
    </tr>
  );
}

export function SportWeeksTable({
  weeks,
  setWeek,
  commitWeek,
  delWeek,
}: {
  weeks: SportWeek[];
  setWeek: (i: number, k: keyof SportWeek, v: unknown) => void;
  commitWeek: (d: {
    w: number | null;
    f: number | null;
    kcal: number | null;
    protein: number | null;
    wn: number | null;
    ww: number | null;
    note: string;
  }) => void;
  delWeek: (i: number) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const nextN = weeks.filter((w) => /^Неделя/.test(w.label)).length + 1;
  const lastW = weeks[weeks.length - 1] || {};

  return (
    <SpCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 1180 }}>
          <thead>
            <tr className="bg-[var(--v2-ink-50)]/70">
              <Th className="pl-4 text-left" w="190px">
                Неделя
              </Th>
              <Th className="text-right" w="78px">
                Вес
              </Th>
              <Th className="text-right" w="66px">
                Δ
              </Th>
              <Th className="text-right" w="78px">
                Жир, кг
              </Th>
              <Th className="text-right" w="66px">
                Δ
              </Th>
              <Th className="text-right" w="66px">
                Жир, %
              </Th>
              <Th className="text-right" w="86px">
                Безжир.
              </Th>
              <Th className="text-right" w="66px">
                Δ
              </Th>
              <Th className="text-right" w="68px">
                Пупок
              </Th>
              <Th className="text-right" w="68px">
                Широк.
              </Th>
              <Th className="text-right" w="78px">
                Ккал
              </Th>
              <Th className="text-right" w="66px">
                Белок
              </Th>
              <Th className="pr-4 text-left">Комментарий</Th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((wk, i) => (
              <SpWeekRow
                key={wk.id}
                wk={wk}
                prev={weeks[i - 1]}
                last={i === weeks.length - 1}
                open={open === wk.id}
                toggle={() => setOpen(open === wk.id ? null : wk.id)}
                set={(k, v) => setWeek(i, k, v)}
                del={() => delWeek(i)}
              />
            ))}
            <SpDraftRow
              nextLabel={`Неделя ${nextN}`}
              commit={commitWeek}
              lastKcal={lastW.kcal}
              lastProtein={lastW.protein}
            />
          </tbody>
        </table>
      </div>
    </SpCard>
  );
}
