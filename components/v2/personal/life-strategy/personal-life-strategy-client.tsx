"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode, type SVGProps } from "react";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { V2Icons } from "@/components/v2/ui/icons";
import type {
  LifeStrategyDoc,
  LifeStrategyDirection,
  LifeStrategyPrana,
  LifeStrategySeasonPayload,
} from "@/lib/v2/personal/seeds/life-strategy-seed";
import { seedLifeStrategyDoc } from "@/lib/v2/personal/seeds/life-strategy-seed";

type IconProps = SVGProps<SVGSVGElement>;

function IcClose(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="m6.5 6.5 11 11m0-11-11 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IcInfo(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 11v5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="8.2" r=".9" fill="currentColor" />
    </svg>
  );
}
function IcPause(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M9.5 6v12M14.5 6v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IcChevR(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M9.5 6.5 15 12l-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function payloadFromDoc(doc: LifeStrategyDoc): LifeStrategySeasonPayload {
  return {
    season: doc.season,
    directions: doc.directions,
    maintain: doc.maintain,
    notThis: doc.notThis,
    lila: doc.lila,
    weekRules: doc.weekRules,
    prana: doc.prana,
    openQ: doc.openQ,
    game: doc.game,
    seasonQ: doc.seasonQ,
  };
}

function applyPayload(doc: LifeStrategyDoc, payload: LifeStrategySeasonPayload): LifeStrategyDoc {
  return { ...doc, ...payload };
}

function Sect({
  title,
  sub,
  right,
  children,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-14">
      <div className="mb-5 flex flex-wrap items-end gap-x-5 gap-y-3">
        <div>
          <h2 className="v2-tight text-[21px] font-medium text-[var(--v2-ink-900)]">{title}</h2>
          {sub ? (
            <p className="v2-tight mt-1.5 text-[15px] text-[var(--v2-ink-500)] sm:text-[14px]" style={{ textWrap: "pretty" }}>
              «{sub}»
            </p>
          ) : null}
        </div>
        {right ? <div className="ml-auto shrink-0 pb-1">{right}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Kicker({ children, cls = "text-[var(--v2-ink-400)]" }: { children: ReactNode; cls?: string }) {
  return <span className={`font-mono text-[10.5px] uppercase tracking-[0.16em] ${cls}`}>{children}</span>;
}

function GhostBtn({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[12.5px] sm:h-9 font-medium text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-card)] transition hover:text-[var(--v2-ink-900)]"
    >
      {children}
    </button>
  );
}

function DirectionRow({ d }: { d: LifeStrategyDirection }) {
  const [open, setOpen] = useState(d.n === "01");
  return (
    <div className="border-t border-[var(--v2-ink-200)]/80">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className="group grid cursor-pointer grid-cols-[28px_minmax(0,1fr)] items-start gap-x-3 gap-y-4 py-6 md:grid-cols-[56px_minmax(0,1fr)_300px] md:gap-8 md:py-7"
      >
        <span className="v2-tnum pt-2 font-mono text-[13px] text-[var(--v2-ink-300)]">{d.n}</span>
        <div className="min-w-0">
          <Kicker>{d.kicker}</Kicker>
          <h3 className="v2-tighter mt-1.5 text-[22px] font-light leading-[1.15] sm:text-[26px] text-[var(--v2-ink-900)] transition group-hover:text-[var(--v2-brand-700)]">
            {d.name}
          </h3>
          {open ? (
            <div className="mt-4 flex max-w-[64ch] flex-col gap-4" onClick={(e) => e.stopPropagation()}>
              <div>
                <Kicker>{d.hypLabel}</Kicker>
                <p className="v2-tight mt-1.5 text-[16px] leading-relaxed text-[var(--v2-ink-800)]" style={{ textWrap: "pretty" }}>
                  «{d.hyp}»
                </p>
              </div>
              {d.why ? (
                <div>
                  <Kicker>{d.whyLabel}</Kicker>
                  <p className="v2-tight mt-1.5 text-[16px] leading-relaxed sm:text-[14.5px] text-[var(--v2-ink-600)]" style={{ textWrap: "pretty" }}>
                    «{d.why}»
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <p
              className="v2-tight mt-3 line-clamp-2 max-w-[64ch] text-[15px] leading-relaxed text-[var(--v2-ink-500)]"
              style={{ textWrap: "pretty" }}
            >
              «{d.hyp}»
            </p>
          )}
        </div>
        <div className="col-start-2 flex flex-col gap-3 md:col-start-auto md:pt-1">
          <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-[var(--v2-shadow-card)]">
            <Kicker>Статус</Kicker>
            <p className="v2-tight mt-1.5 text-[13.5px] font-medium text-[var(--v2-ink-900)]">{d.status}</p>
            {d.next ? (
              <>
                <div className="mt-4">
                  <Kicker cls="text-[var(--v2-brand-600)]">Следующий ход</Kicker>
                </div>
                <p className="v2-tight mt-1.5 text-[14px] leading-snug text-[var(--v2-ink-800)]" style={{ textWrap: "pretty" }}>
                  «{d.next}»
                </p>
              </>
            ) : null}
          </div>
          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-1 self-start text-[12.5px] font-medium text-[var(--v2-ink-500)] sm:min-h-0 transition hover:text-[var(--v2-brand-700)]"
          >
            {d.cta} <IcChevR className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryDrawer({
  doc,
  onClose,
  onSwitch,
}: {
  doc: LifeStrategyDoc;
  onClose: () => void;
  onSwitch: (id: string) => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-[var(--v2-ink-900)]/35 backdrop-blur-[2px]" />
      <div
        className="relative h-full max-h-[100dvh] w-[520px] max-w-full overflow-y-auto overscroll-contain sm:max-w-[92vw] bg-white shadow-[var(--v2-shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--v2-ink-100)] px-5 pb-5 pt-[calc(env(safe-area-inset-top)+16px)] sm:px-9 sm:pt-7">
          <h2 className="v2-tighter text-[22px] font-light text-[var(--v2-ink-900)] sm:text-[26px]">История периодов</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-9 sm:w-9 text-[var(--v2-ink-400)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
          >
            <IcClose className="h-[17px] w-[17px]" />
          </button>
        </div>
        <div className="flex flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-6 sm:px-9 sm:py-6">
          {doc.history.map((h, i) => (
            <button
              key={h.id}
              type="button"
              onClick={() => {
                if (h.id !== doc.activeHistoryId) onSwitch(h.id);
              }}
              className={`flex items-start gap-4 py-5 text-left transition hover:opacity-90 ${
                i ? "border-t border-[var(--v2-ink-100)]" : ""
              }`}
            >
              <span
                className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                  h.state === "Активный" ? "bg-[var(--v2-brand-500)]" : "bg-[var(--v2-ink-300)]"
                }`}
              />
              <div>
                <p className="v2-tight text-[16.5px] font-medium text-[var(--v2-ink-900)]">{h.name}</p>
                <p className="v2-tnum mt-1 text-[13px] text-[var(--v2-ink-400)]">{h.dates}</p>
                {h.id !== doc.activeHistoryId ? (
                  <p className="v2-tight mt-1.5 text-[12px] text-[var(--v2-brand-600)]">Сделать активным</p>
                ) : null}
              </div>
              <span
                className={`ml-auto inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-medium ${
                  h.state === "Активный"
                    ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]"
                    : "bg-[var(--v2-ink-100)] text-[var(--v2-ink-500)]"
                }`}
              >
                {h.state}
              </span>
            </button>
          ))}
          <p className="v2-tight mt-6 text-[13px] leading-relaxed text-[var(--v2-ink-400)]">
            Старые стратегии остаются доступными, но не занимают места на основном экране.
          </p>
        </div>
      </div>
    </div>
  );
}

function EditDrawer({
  doc,
  onClose,
  onSave,
}: {
  doc: LifeStrategyDoc;
  onClose: () => void;
  onSave: (patch: {
    kicker: string;
    startDate: string;
    review: string;
    lead: string;
    directionsText: string;
    notThisText: string;
    openQText: string;
    pranaText: string;
    seasonQText: string;
  }) => void;
}) {
  const kickerRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const reviewRef = useRef<HTMLInputElement>(null);
  const leadRef = useRef<HTMLTextAreaElement>(null);
  const dirsRef = useRef<HTMLTextAreaElement>(null);
  const notRef = useRef<HTMLTextAreaElement>(null);
  const openRef = useRef<HTMLTextAreaElement>(null);
  const pranaRef = useRef<HTMLTextAreaElement>(null);
  const sqRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const lab = "text-[11.5px] uppercase tracking-[0.1em] font-semibold text-[var(--v2-ink-400)]";
  const field =
    "v2-tight mt-1.5 h-11 w-full rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3.5 text-[16px] text-[var(--v2-ink-900)] outline-none sm:text-[14.5px] transition placeholder:text-[var(--v2-ink-400)] focus:border-[var(--v2-brand-400)] focus:bg-white";
  const area =
    "v2-tight mt-1.5 w-full resize-none rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3.5 py-2.5 text-[16px] leading-relaxed text-[var(--v2-ink-900)] outline-none sm:text-[14px] transition placeholder:text-[var(--v2-ink-400)] focus:border-[var(--v2-brand-400)] focus:bg-white";

  const lists: [string, string, React.RefObject<HTMLTextAreaElement | null>][] = [
    ["Активные направления", doc.directions.map((d) => d.name).join("\n"), dirsRef],
    ["Что не делаю", doc.notThis.map((n) => n.t).join("\n"), notRef],
    ["Что не решаю", doc.openQ.map((o) => o.q).join("\n"), openRef],
    ["Режим жизни", doc.prana.map((p) => p.label).join("\n"), pranaRef],
    ["Главные вопросы сезона", doc.seasonQ.map((s) => `${s.area} — ${s.q}`).join("\n"), sqRef],
  ];

  return (
    <div className="fixed inset-0 z-[90] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-[var(--v2-ink-900)]/35 backdrop-blur-[2px]" />
      <div
        className="relative h-full max-h-[100dvh] w-[600px] max-w-full overflow-y-auto overscroll-contain sm:max-w-[92vw] bg-white shadow-[var(--v2-shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--v2-ink-100)] bg-white/92 px-5 pb-5 pt-[calc(env(safe-area-inset-top)+16px)] backdrop-blur sm:px-9 sm:pt-7">
          <div>
            <h2 className="v2-tighter text-[22px] font-light text-[var(--v2-ink-900)] sm:text-[26px]">Редактировать стратегию</h2>
            <p className="v2-tight mt-1.5 text-[13px] text-[var(--v2-ink-500)]">Простая форма, а не отдельный конструктор.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-9 sm:w-9 text-[var(--v2-ink-400)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
          >
            <IcClose className="h-[17px] w-[17px]" />
          </button>
        </div>
        <div className="px-5 py-6 pb-10 sm:px-9 sm:pb-28">
          <label className="block">
            <span className={lab}>Название сезона</span>
            <input ref={kickerRef} defaultValue={doc.season.kicker} className={field} />
          </label>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={lab}>Дата начала</span>
              <input ref={startRef} defaultValue={doc.season.startDate} className={field} />
            </label>
            <label className="block">
              <span className={lab}>Следующий review</span>
              <input ref={reviewRef} defaultValue={doc.season.review} className={field} />
            </label>
          </div>
          <label className="mt-4 block">
            <span className={lab}>Описание замысла</span>
            <textarea ref={leadRef} rows={4} defaultValue={doc.season.lead} className={area} />
          </label>
          {lists.map(([l, v, ref]) => (
            <label key={l} className="mt-4 block">
              <span className={lab}>{l}</span>
              <textarea ref={ref} rows={Math.min(v.split("\n").length, 6)} defaultValue={v} className={area} />
            </label>
          ))}
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-[var(--v2-ink-100)] bg-white/92 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 sm:px-9 sm:py-4 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl px-4 text-[13px] font-medium text-[var(--v2-ink-600)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                kicker: kickerRef.current?.value.trim() || doc.season.kicker,
                startDate: startRef.current?.value.trim() || doc.season.startDate,
                review: reviewRef.current?.value.trim() || doc.season.review,
                lead: leadRef.current?.value ?? doc.season.lead,
                directionsText: dirsRef.current?.value ?? "",
                notThisText: notRef.current?.value ?? "",
                openQText: openRef.current?.value ?? "",
                pranaText: pranaRef.current?.value ?? "",
                seasonQText: sqRef.current?.value ?? "",
              })
            }
            className="h-10 rounded-xl bg-[var(--v2-ink-900)] px-5 text-[13px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)]"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

function PranaItem({ p, onChange }: { p: LifeStrategyPrana; onChange: (next: LifeStrategyPrana) => void }) {
  const [tip, setTip] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        if (p.kind === "count") {
          const total = p.total ?? 1;
          const done = typeof p.done === "number" ? p.done : 0;
          onChange({ ...p, done: done >= total ? 0 : done + 1 });
        } else {
          onChange({ ...p, done: !p.done });
        }
      }}
      className="relative flex flex-col rounded-2xl bg-white px-4 py-4 text-left sm:px-5 sm:py-5 shadow-[var(--v2-shadow-card)]"
    >
      <div className="flex items-center gap-1.5">
        <span className="v2-tight text-[13.5px] font-medium text-[var(--v2-ink-800)]">{p.label}</span>
        {p.tip ? (
          <span
            role="presentation"
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse") setTip(true);
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") setTip(false);
            }}
            onClick={(e) => {
              e.stopPropagation();
              setTip((t) => !t);
            }}
            className="-m-2 p-2 text-[var(--v2-ink-300)] transition hover:text-[var(--v2-ink-600)]"
          >
            <IcInfo className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      {p.kind === "count" ? (
        <>
          <p className="v2-tighter v2-tnum mt-3 text-[26px] font-light text-[var(--v2-ink-900)]">
            {p.done as number} <span className="text-[var(--v2-ink-300)]">/ {p.total}</span>
          </p>
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: p.total ?? 0 }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i < (p.done as number) ? "bg-[var(--v2-brand-400)]" : "bg-[var(--v2-ink-200)]"}`}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="mt-3 flex items-center gap-2.5">
          <span
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
              p.done ? "bg-[var(--v2-brand-500)] text-white" : "border border-[var(--v2-ink-300)] text-transparent"
            }`}
          >
            <V2Icons.check className="h-4 w-4" />
          </span>
          <span className="v2-tight text-[13px] text-[var(--v2-ink-500)]">{p.done ? "было на этой неделе" : "пока не было"}</span>
        </div>
      )}
      {tip && p.tip ? (
        <div className="absolute left-0 top-full z-30 mt-2 w-[320px] max-sm:static max-sm:mt-3 max-sm:w-auto max-sm:px-4 max-sm:py-3 rounded-2xl bg-[var(--v2-ink-900)] px-5 py-4 text-white shadow-[var(--v2-shadow-pop)]">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/50">{p.label}</span>
          <p className="v2-tight mt-2 whitespace-pre-line text-[13px] leading-relaxed">{p.tip}</p>
        </div>
      ) : null}
    </button>
  );
}

export function PersonalLifeStrategyClient() {
  const [doc, setDoc] = useState<LifeStrategyDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const [hist, setHist] = useState(false);
  const [seasonQOpen, setSeasonQOpen] = useState(false);
  const [notOpen, setNotOpen] = useState<number | null>(null);
  const saving = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchJson<{ doc: LifeStrategyDoc }>("/api/v2/personal/life-docs/life_strategy");
      setDoc(data.doc ?? seedLifeStrategyDoc());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить");
      setDoc(seedLifeStrategyDoc());
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (next: LifeStrategyDoc) => {
    setDoc(next);
    if (saving.current) return;
    saving.current = true;
    try {
      await fetchJson("/api/v2/personal/life-docs/life_strategy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc: next }),
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      saving.current = false;
    }
  };

  if (!doc) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-16 pt-4 sm:px-8 sm:pt-6">
        <p className="v2-tight text-[14px] text-[var(--v2-ink-500)]">Загрузка…</p>
      </div>
    );
  }

  const switchHistory = (id: string) => {
    const target = doc.history.find((h) => h.id === id);
    if (!target) return;
    const currentPayload = payloadFromDoc(doc);
    const history = doc.history.map((h) => {
      if (h.id === doc.activeHistoryId) {
        return { ...h, state: "Завершён" as const, payload: currentPayload };
      }
      if (h.id === id) {
        return { ...h, state: "Активный" as const };
      }
      return h;
    });
    const next = applyPayload({ ...doc, history, activeHistoryId: id }, target.payload);
    void persist(next);
    setHist(false);
  };

  const applyEdit = (patch: {
    kicker: string;
    startDate: string;
    review: string;
    lead: string;
    directionsText: string;
    notThisText: string;
    openQText: string;
    pranaText: string;
    seasonQText: string;
  }) => {
    const dirNames = patch.directionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const directions = dirNames.map((name, i) => {
      const prev = doc.directions.find((d) => d.name === name) ?? doc.directions[i];
      return (
        prev ?? {
          id: `d${Date.now()}-${i}`,
          n: String(i + 1).padStart(2, "0"),
          kicker: "Направление",
          name,
          status: "В работе",
          hypLabel: "Гипотеза",
          hyp: name,
          cta: "Открыть",
        }
      );
    });

    const notLines = patch.notThisText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const notThis = notLines.map((t) => {
      const prev = doc.notThis.find((n) => n.t === t);
      return prev ?? { t, why: "", when: "" };
    });

    const openLines = patch.openQText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const openQ = openLines.map((q) => {
      const prev = doc.openQ.find((o) => o.q === q);
      return prev ?? { q, st: "", back: "" };
    });

    const pranaLabels = patch.pranaText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const prana = pranaLabels.map((label, i) => {
      const prev = doc.prana.find((p) => p.label === label) ?? doc.prana[i];
      return prev ?? { id: `pr${i}`, label, kind: "bool" as const, done: false };
    });

    const sqLines = patch.seasonQText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const seasonQ = sqLines.map((line) => {
      const parts = line.split("—").map((x) => x.trim());
      if (parts.length >= 2) {
        const area = parts[0]!;
        const q = parts.slice(1).join(" — ");
        const prev = doc.seasonQ.find((s) => s.area === area && s.q === q);
        return prev ?? { area, q };
      }
      const prev = doc.seasonQ.find((s) => s.q === line);
      return prev ?? { area: "—", q: line };
    });

    const season = {
      ...doc.season,
      kicker: patch.kicker,
      startDate: patch.startDate,
      review: patch.review,
      lead: patch.lead,
      dates: doc.season.dates,
    };

    void persist({ ...doc, season, directions, notThis, openQ, prana, seasonQ });
    setEdit(false);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-12 pt-4 sm:px-8 sm:pb-24 sm:pt-6">
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <h1 className="v2-tighter text-[38px] font-light leading-none sm:text-[52px] text-[var(--v2-ink-900)]">Стратегия</h1>
          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:pb-1">
            <GhostBtn onClick={() => setHist(true)}>
              <V2Icons.history className="h-4 w-4 text-[var(--v2-ink-400)]" /> История периодов
            </GhostBtn>
            <button
              type="button"
              onClick={() => setEdit(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)]"
            >
              <V2Icons.edit className="h-4 w-4" /> Редактировать стратегию
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
        ) : null}

        <div className="mb-14 rounded-[24px] bg-white px-5 py-6 sm:px-11 sm:py-10 shadow-[var(--v2-shadow-soft)]">
          <div className="flex flex-wrap items-baseline gap-5">
            <h2 className="text-[15px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-brand-700)]">{doc.season.kicker}</h2>
            <span className="v2-tight v2-tnum text-[13.5px] text-[var(--v2-ink-400)]">{doc.season.dates}</span>
          </div>
          <p
            className="v2-tighter mt-6 max-w-[46ch] text-[21px] font-light sm:text-[27px] leading-[1.35] text-[var(--v2-ink-900)]"
            style={{ whiteSpace: "pre-line", textWrap: "pretty" }}
          >
            «{doc.season.lead}»
          </p>
          <div className="mt-6 flex flex-wrap items-start gap-6 sm:mt-8 sm:gap-10">
            <p
              className="v2-tight max-w-[38ch] border-l-2 border-[var(--v2-brand-300)] pl-4 text-[18px] sm:pl-6 font-light leading-[1.5] text-[var(--v2-brand-800)]"
              style={{ whiteSpace: "pre-line", textWrap: "pretty" }}
            >
              «{doc.season.pull}»
            </p>
            <div className="sm:ml-auto sm:text-right">
              <Kicker>Следующий большой review</Kicker>
              <p className="v2-tight mt-1.5 text-[19px] font-light text-[var(--v2-ink-900)]">{doc.season.review}</p>
            </div>
          </div>
        </div>

        <Sect title="Сейчас" sub="Главные направления, которые имеют право занимать моё внимание.">
          <div>
            {doc.directions.map((d) => (
              <DirectionRow key={d.id} d={d} />
            ))}
          </div>
          <div className="mt-8 rounded-[20px] bg-[var(--v2-ink-100)]/60 px-5 py-5 sm:px-7 sm:py-6">
            <Kicker>Поддерживаю, но не развиваю</Kicker>
            <div className="mt-3 flex flex-col gap-2">
              {doc.maintain.map((m) => (
                <div key={m.name} className="v2-tight flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[15px] sm:text-[14.5px]">
                  <span className="font-medium text-[var(--v2-ink-800)]">{m.name}</span>
                  <span className="text-[var(--v2-ink-400)]">→</span>
                  <span className="text-[var(--v2-ink-500)]">{m.note}</span>
                </div>
              ))}
            </div>
          </div>
        </Sect>

        <Sect title="Не в этом сезоне" sub="Отказ от этих направлений — часть стратегии, а не упущенная возможность.">
          <div className="divide-y divide-[var(--v2-ink-100)] rounded-[20px] bg-white shadow-[var(--v2-shadow-card)]">
            {doc.notThis.map((n, i) => (
              <div key={i}>
                <button
                  type="button"
                  onClick={() => setNotOpen((o) => (o === i ? null : i))}
                  className="group flex w-full items-start gap-3 px-4 py-4 text-left sm:gap-4 sm:px-7 transition hover:bg-[var(--v2-ink-50)]/60"
                >
                  <span className="shrink-0 text-[15px] leading-6 text-[var(--v2-ink-300)]">×</span>
                  <span className="v2-tight text-[15.5px] leading-6 text-[var(--v2-ink-800)]" style={{ textWrap: "pretty" }}>
                    {n.t}
                  </span>
                  <V2Icons.chev
                    className={`ml-auto h-4 w-4 shrink-0 text-[var(--v2-ink-300)] transition group-hover:text-[var(--v2-ink-500)] ${
                      notOpen === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {notOpen === i ? (
                  <div className="grid grid-cols-1 gap-4 px-4 pb-5 pl-[38px] sm:grid-cols-2 sm:gap-6 sm:px-7 sm:pl-[46px]">
                    <div>
                      <Kicker>Почему отложено</Kicker>
                      <p className="v2-tight mt-1.5 text-[15px] leading-relaxed sm:text-[14px] text-[var(--v2-ink-600)]">{n.why}</p>
                    </div>
                    <div>
                      <Kicker>Когда вернуться</Kicker>
                      <p className="v2-tight mt-1.5 text-[15px] leading-relaxed sm:text-[14px] text-[var(--v2-ink-600)]">{n.when}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Sect>

        <section className="mb-14 rounded-[24px] border border-[var(--v2-ink-300)]/70 bg-[linear-gradient(180deg,#FCFCFD,#F7F8FB)] px-5 py-6 sm:px-9 sm:py-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--v2-ink-900)] text-white">
              <IcPause className="h-4 w-4" />
            </span>
            <Kicker cls="text-[var(--v2-ink-500)]">{doc.lila.kicker}</Kicker>
            <span className="inline-flex h-6 items-center rounded-full bg-[var(--v2-ink-900)] px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
              {doc.lila.state}
            </span>
          </div>
          <p className="v2-tighter mt-5 max-w-[52ch] text-[19px] font-light leading-[1.4] text-[var(--v2-ink-900)] sm:text-[21px]" style={{ textWrap: "pretty" }}>
            «{doc.lila.line}»
          </p>
          <div className="mt-7 grid max-w-[860px] grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
            <div>
              <Kicker cls="text-emerald-600">Разрешено</Kicker>
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {doc.lila.allowed.map((x, i) => (
                  <li key={i} className="v2-tight text-[15px] leading-relaxed sm:text-[14px] text-[var(--v2-ink-700)]">
                    {x}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Kicker>Не делаю</Kicker>
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {doc.lila.not.map((x, i) => (
                  <li key={i} className="v2-tight text-[15px] leading-relaxed sm:text-[14px] text-[var(--v2-ink-500)]">
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-end gap-4 border-t sm:gap-8 border-[var(--v2-ink-200)] pt-6">
            <p className="v2-tight max-w-[46ch] text-[18px] font-light leading-[1.45] text-[var(--v2-ink-900)]" style={{ textWrap: "pretty" }}>
              «{doc.lila.main}»
            </p>
            <Link
              href="/v2/personal/my-code"
              className="inline-flex min-h-10 items-center gap-1 text-[12.5px] font-medium text-[var(--v2-ink-700)] sm:ml-auto sm:min-h-0 no-underline hover:text-[var(--v2-brand-700)]"
            >
              Подробнее в Моём коде <IcChevR className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        <Sect title="Помнить на этой неделе">
          <div className="divide-y divide-[var(--v2-ink-100)] rounded-[20px] bg-white shadow-[var(--v2-shadow-card)]">
            {doc.rulePool.map((r, i) => (
              <div key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 sm:flex-nowrap sm:gap-6 sm:px-7 sm:py-5">
                <span className="v2-tnum w-6 font-mono text-[12px] text-[var(--v2-ink-300)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p
                  className="v2-tight min-w-0 flex-1 text-[17px] font-light leading-snug sm:text-[19px] text-[var(--v2-ink-900)]"
                  style={{ textWrap: "pretty" }}
                >
                  «{r.text}»
                </p>
                <Link href="/v2/personal/my-code" className="v2-tight w-full pl-10 text-[12px] text-[var(--v2-ink-500)] hover:text-[var(--v2-brand-700)] sm:w-auto sm:shrink-0 sm:pl-0">
                  почему · {r.why}
                </Link>
              </div>
            ))}
            {!doc.rulePool.length ? (
              <p className="v2-tight px-4 py-6 text-[14px] sm:px-7 text-[var(--v2-ink-500)]">Правил пока нет.</p>
            ) : null}
          </div>
        </Sect>

        <Sect
          title="Режим жизни"
          sub="Минимальные условия, без которых стратегический спринт перестаёт быть жизнью и снова превращается в гонку."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(190px,1fr))] sm:gap-4">
            {doc.prana.map((p) => (
              <PranaItem
                key={p.id}
                p={p}
                onChange={(next) => {
                  void persist({ ...doc, prana: doc.prana.map((x) => (x.id === next.id ? next : x)) });
                }}
              />
            ))}
          </div>
          <p className="v2-tighter mt-7 max-w-[44ch] text-[21px] font-light leading-[1.45] text-[var(--v2-ink-900)]" style={{ textWrap: "pretty" }}>
            «Часть энергии должна оставаться просто на то, чтобы мне нравилось жить сегодня.»
          </p>
        </Sect>

        <Sect title="Можно пока не знать">
          <div className="divide-y divide-[var(--v2-ink-100)] rounded-[20px] bg-white shadow-[var(--v2-shadow-card)]">
            {doc.openQ.map((o, i) => (
              <div
                key={i}
                className="grid grid-cols-1 items-baseline gap-1.5 px-4 py-4 sm:px-7 sm:py-5 lg:grid-cols-[minmax(0,1fr)_280px_260px] lg:gap-6"
              >
                <p className="v2-tight text-[17px] font-light leading-snug text-[var(--v2-ink-900)]" style={{ textWrap: "pretty" }}>
                  «{o.q}»
                </p>
                <span className="v2-tight text-[13.5px] text-[var(--v2-ink-500)]">{o.st}</span>
                <span className="v2-tight text-[13px] lg:justify-self-end lg:text-right text-[var(--v2-ink-400)]">{o.back}</span>
              </div>
            ))}
          </div>
        </Sect>

        <Sect
          title="Что игра уже показала"
          right={
            <GhostBtn>
              <Link href="/v2/personal/my-code" className="inline-flex items-center gap-1 text-inherit no-underline">
                Все выводы <IcChevR className="h-3.5 w-3.5" />
              </Link>
            </GhostBtn>
          }
        >
          <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
            {doc.game.map((g, i) => (
              <div key={i} className="flex gap-4 border-t border-[var(--v2-ink-200)]/80 py-5 sm:gap-6">
                <span className="v2-tnum pt-1.5 font-mono text-[11.5px] text-[var(--v2-ink-300)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="v2-tight text-[17px] font-light leading-[1.45] text-[var(--v2-ink-900)] sm:text-[18px]" style={{ textWrap: "pretty" }}>
                  «{g}»
                </p>
              </div>
            ))}
          </div>
        </Sect>

        <section className="mb-14">
          <button
            type="button"
            onClick={() => setSeasonQOpen((o) => !o)}
            className="group flex w-full flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--v2-ink-200)]/80 py-4"
          >
            <h2 className="v2-tight text-[21px] font-medium text-[var(--v2-ink-900)]">Что проверяем к концу сезона</h2>
            <span className="v2-tnum text-[12px] text-[var(--v2-ink-400)]">{doc.seasonQ.length} вопросов</span>
            <V2Icons.chev
              className={`ml-auto h-5 w-5 text-[var(--v2-ink-400)] transition group-hover:text-[var(--v2-ink-700)] ${
                seasonQOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {seasonQOpen ? (
            <div className="mt-3 grid grid-cols-1 gap-x-12 md:grid-cols-2">
              {doc.seasonQ.map((s, i) => (
                <div key={i} className="flex flex-col gap-2 border-t border-[var(--v2-ink-100)] py-5 sm:flex-row sm:gap-6">
                  <span className="shrink-0 sm:w-[104px]">
                    <Kicker>{s.area}</Kicker>
                  </span>
                  <p className="v2-tight text-[15.5px] leading-relaxed text-[var(--v2-ink-800)]" style={{ textWrap: "pretty" }}>
                    «{s.q}»
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      {edit ? <EditDrawer doc={doc} onClose={() => setEdit(false)} onSave={applyEdit} /> : null}
      {hist ? <HistoryDrawer doc={doc} onClose={() => setHist(false)} onSwitch={switchHistory} /> : null}
    </div>
  );
}
