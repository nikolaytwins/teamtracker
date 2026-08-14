"use client";

import { appPath } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type {
  BrandColumn,
  BrandDoc,
  BrandSignal,
  BrandVideo,
} from "@/lib/v2/personal/seeds/brand-seed";
import { V2Icons } from "@/components/v2/ui/icons";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const SIG: Record<BrandSignal, { label: string; dots: number; tint: string }> = {
  very: { label: "Очень сильный", dots: 4, tint: "#0E9F6E" },
  strong: { label: "Сильный", dots: 3, tint: "#2A56EB" },
  medium: { label: "Средний", dots: 2, tint: "#B7791F" },
  weak: { label: "Слабый", dots: 1, tint: "#71717A" },
  none: { label: "Нет данных", dots: 0, tint: "#A1A1AA" },
};

const POWER = ["слабый", "повторяется", "сильный", "почти доказано"];
const FILTERS = [
  { id: "all" as const, label: "Все" },
  { id: "pub" as const, label: "Опубликованные" },
  { id: "plan" as const, label: "В работе" },
];

const VIDEO_STATUSES = ["Idea", "Script", "Ready", "Опубликован"];

function IcClose(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className}>
      <path d="m6.5 6.5 11 11m0-11-11 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IcCopy(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className}>
      <rect x="4" y="7" width="11" height="13" rx="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8.5 7V6a2 2 0 0 1 2-2h7.5a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IcCols(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className}>
      <rect x="4" y="5" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 5v14M15 5v14" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function IcQ(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9.8 9.6c.2-1.2 1.1-1.9 2.3-1.9 1.3 0 2.2.8 2.2 1.9 0 1-.6 1.5-1.5 2.1-.6.4-.8.8-.8 1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.2" r=".9" fill="currentColor" />
    </svg>
  );
}

function IcArrowD(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className}>
      <path
        d="M12 5v13m0 0-4.5-4.5M12 18l4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BK({ children, cls = "text-[var(--v2-ink-400)]" }: { children: React.ReactNode; cls?: string }) {
  return <span className={`font-mono text-[10.5px] uppercase tracking-[0.16em] ${cls}`}>{children}</span>;
}

function BGhost({ children, onClick }: { children: React.ReactNode; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="v2-tight inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[12.5px] font-medium text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-card)] transition hover:text-[var(--v2-ink-900)]"
    >
      {children}
    </button>
  );
}

function BSect({
  title,
  sub,
  right,
  children,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-14">
      <div className="mb-5 flex items-end gap-5">
        <div>
          <h2 className="v2-tight text-[21px] font-medium text-[var(--v2-ink-900)]">{title}</h2>
          {sub ? (
            <p className="v2-tight mt-1.5 max-w-[70ch] text-[14px] text-[var(--v2-ink-500)]" style={{ textWrap: "pretty" }}>
              «{sub}»
            </p>
          ) : null}
        </div>
        {right ? <div className="ml-auto flex shrink-0 items-center gap-2 pb-1">{right}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Dots({ n, tint }: { n: number; tint: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i < n ? tint : "#E4E4E7" }} />
      ))}
    </span>
  );
}

function SigCell({ k }: { k: BrandSignal }) {
  const s = SIG[k];
  return (
    <span className="inline-flex items-center gap-2">
      <Dots n={s.dots} tint={s.tint} />
      <span className="v2-tight text-[12.5px]" style={{ color: s.tint }}>
        {s.label}
      </span>
    </span>
  );
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const fieldCls =
  "mt-1.5 h-11 w-full rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3.5 text-[14.5px] text-[var(--v2-ink-900)] outline-none transition placeholder:text-[var(--v2-ink-400)] focus:border-[var(--v2-brand-400)] focus:bg-white v2-tight";
const labCls = "text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]";

export function PersonalBrandClient() {
  const [doc, setDoc] = useState<BrandDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [colsOpen, setColsOpen] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [nextOpen, setNextOpen] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const [videoModal, setVideoModal] = useState(false);
  const [hypModal, setHypModal] = useState(false);
  const [phraseDraft, setPhraseDraft] = useState("");
  const [dirOpen, setDirOpen] = useState<string | null>("crisis");
  const [copied, setCopied] = useState<number | null>(null);

  const saveDoc = useCallback(async (next: BrandDoc) => {
    setDoc(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetchJson<{ doc: BrandDoc }>("/api/v2/personal/life-docs/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc: next }),
      });
      setDoc(res.doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchJson<{ doc: BrandDoc }>("/api/v2/personal/life-docs/brand");
        if (!cancelled) setDoc(res.doc);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!doc) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--v2-ink-500)]">
        {error ?? "Загрузка…"}
      </div>
    );
  }

  const dirName = (id: string) => doc.dirs.find((d) => d.id === id)?.name ?? "—";
  const filter = doc.ui.filter;
  const cols = doc.ui.columns;
  const current = videoId ? doc.videos.find((v) => v.id === videoId) : null;

  const setFilter = (f: BrandDoc["ui"]["filter"]) => {
    void saveDoc({ ...doc, ui: { ...doc.ui, filter: f } });
  };

  const setCols = (updater: (cs: BrandColumn[]) => BrandColumn[]) => {
    void saveDoc({ ...doc, ui: { ...doc.ui, columns: updater(doc.ui.columns) } });
  };

  const addInsight = async (t: string, src: string, power: number) => {
    await saveDoc({
      ...doc,
      insights: [{ t, src, power }, ...doc.insights],
    });
    setInsightOpen(false);
  };

  const addVideo = async (title: string, dir: string, status: string) => {
    const v: BrandVideo = {
      id: uid("v"),
      title,
      sub: "",
      dir,
      status,
      date: "—",
      hyp: "",
      want: "",
      m: null,
      sig: "none",
      learn: "",
      next: "",
      quotes: [],
    };
    await saveDoc({ ...doc, videos: [v, ...doc.videos] });
    setVideoModal(false);
    setVideoId(v.id);
  };

  const createHyp = async (main: string, why: string) => {
    const archived = {
      period: doc.hyp.start || "Архив",
      text: doc.hyp.main,
      why: why || "Смена гипотезы.",
      data: `Статус был: ${doc.hyp.status}`,
    };
    const evolution = doc.evolution.map((e) => ({ ...e, now: false }));
    await saveDoc({
      ...doc,
      hyp: {
        ...doc.hyp,
        main,
        status: "Проверяем",
        start: new Date().toLocaleDateString("ru-RU"),
      },
      evolution: [
        ...evolution.filter((e) => !e.now),
        archived,
        { period: "Текущая гипотеза", text: main, why: why || "Новая гипотеза.", data: "Только создана.", now: true },
      ],
    });
    setHypModal(false);
  };

  const saveVideo = async (id: string, patch: Partial<BrandVideo>) => {
    await saveDoc({
      ...doc,
      videos: doc.videos.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    });
  };

  const addPhrase = async () => {
    const t = phraseDraft.trim();
    if (!t) return;
    await saveDoc({ ...doc, phrases: [t, ...doc.phrases] });
    setPhraseDraft("");
  };

  const copyPhrase = (t: string, i: number) => {
    void navigator.clipboard?.writeText(t);
    setCopied(i);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-24 pt-6" onClick={() => colsOpen && setColsOpen(false)}>
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-10 flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div className="min-w-[280px] max-w-[640px] flex-1">
            <h1 className="v2-tighter text-[52px] font-light leading-none text-[var(--v2-ink-900)]">Личный бренд</h1>
            <p
              className="v2-tight mt-4 text-[16px] leading-relaxed text-[var(--v2-ink-500)]"
              style={{ textWrap: "pretty" }}
            >
              «Лаборатория позиционирования, аудитории и контента. Не угадываем бренд заранее — собираем его из реального
              отклика.»
            </p>
            {error ? <p className="mt-2 text-[13px] text-red-600">{error}</p> : null}
            {saving ? <p className="mt-1 text-[12px] text-[var(--v2-ink-400)]">Сохранение…</p> : null}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 pt-2">
            <BGhost onClick={() => setInsightOpen(true)}>
              <V2Icons.plus className="h-4 w-4 text-[var(--v2-ink-400)]" /> Инсайт аудитории
            </BGhost>
            <BGhost onClick={() => setHypModal(true)}>
              <V2Icons.plus className="h-4 w-4 text-[var(--v2-ink-400)]" /> Гипотеза
            </BGhost>
            <button
              type="button"
              onClick={() => setVideoModal(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)]"
            >
              <V2Icons.plus className="h-4 w-4" /> Ролик
            </button>
          </div>
        </div>

        <div className="mb-14 flex flex-wrap items-center gap-6 rounded-[20px] bg-white px-7 py-5 shadow-[var(--v2-shadow-card)]">
          <div>
            <p className="v2-tight text-[16px] font-medium text-[var(--v2-ink-900)]">Есть достаточно данных для Brand Review</p>
            <p className="v2-tight mt-1 text-[13.5px] text-[var(--v2-ink-500)]">
              {doc.videos.filter((v) => v.status === "Опубликован").length} опубликованных роликов, {doc.dirs.length}{" "}
              направлений, {doc.insights.length} инсайтов.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNextOpen(true)}
            className="ml-auto h-10 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)]"
          >
            Открыть review
          </button>
        </div>

        {/* Hyp */}
        <div className="mb-14 rounded-[24px] bg-white px-11 py-10 shadow-[var(--v2-shadow-soft)]">
          <div className="flex flex-wrap items-center gap-4">
            <BK cls="text-[var(--v2-ink-500)]">Текущая гипотеза</BK>
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[var(--v2-brand-50)] px-2.5 text-[11px] font-semibold text-[var(--v2-brand-700)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--v2-brand-500)]" />
              {doc.hyp.status}
            </span>
            <span className="v2-tight v2-tnum text-[12.5px] text-[var(--v2-ink-400)]">
              начало {doc.hyp.start} · review {doc.hyp.review}
            </span>
            <button
              type="button"
              onClick={() => setHistOpen(true)}
              className="v2-tight ml-auto inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--v2-ink-500)] transition hover:text-[var(--v2-brand-700)]"
            >
              <V2Icons.history className="h-4 w-4" /> История гипотез
            </button>
          </div>
          <p
            className="v2-tighter mt-6 max-w-[48ch] text-[27px] font-light leading-[1.35] text-[var(--v2-ink-900)]"
            style={{ textWrap: "pretty" }}
          >
            «{doc.hyp.main}»
          </p>
          <div className="mt-9 grid gap-9" style={{ gridTemplateColumns: "minmax(0,1.15fr) minmax(0,.9fr) minmax(0,1fr)" }}>
            <div>
              <BK>Что я показываю</BK>
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {doc.hyp.show.map((x, i) => (
                  <li key={i} className="v2-tight text-[14px] leading-relaxed text-[var(--v2-ink-700)]">
                    {x}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <BK>Моя роль</BK>
              <p
                className="v2-tight mt-2.5 text-[16px] font-light leading-[1.5] text-[var(--v2-ink-900)]"
                style={{ whiteSpace: "pre-line", textWrap: "pretty" }}
              >
                «{doc.hyp.role}»
              </p>
            </div>
            <div>
              <BK>Не хочу становиться</BK>
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {doc.hyp.avoid.map((x, i) => (
                  <li key={i} className="v2-tight text-[14px] leading-relaxed text-[var(--v2-ink-500)]">
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <BSect title="Кого мы сейчас считаем ядром">
          <p
            className="v2-tighter mb-8 max-w-[44ch] text-[27px] font-light leading-[1.35] text-[var(--v2-ink-900)]"
            style={{ textWrap: "pretty" }}
          >
            «{doc.core.main}»
          </p>
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px,1fr))" }}>
            {doc.core.blocks.map((b) => (
              <div key={b.t} className="rounded-[20px] bg-white px-6 py-6 shadow-[var(--v2-shadow-card)]">
                <BK>{b.t}</BK>
                {b.lead ? <p className="v2-tight mt-2.5 text-[13px] text-[var(--v2-ink-500)]">{b.lead}</p> : null}
                <ul className="mt-2.5 flex flex-col gap-1.5">
                  {b.items.map((x, i) => (
                    <li key={i} className="v2-tight text-[14px] leading-relaxed text-[var(--v2-ink-700)]" style={{ textWrap: "pretty" }}>
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </BSect>

        <BSect title="Что мы пока не знаем" sub="Гипотеза остаётся гипотезой, пока эти вопросы открыты.">
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px,1fr))" }}>
            {doc.unknown.map((u, i) => (
              <div
                key={i}
                className="group flex flex-col rounded-[20px] border border-[var(--v2-ink-300)]/70 bg-white/60 px-6 py-5 transition hover:bg-white"
              >
                <IcQ className="h-5 w-5 text-[var(--v2-ink-300)]" />
                <p className="v2-tight mt-3 flex-1 text-[15.5px] leading-relaxed text-[var(--v2-ink-800)]" style={{ textWrap: "pretty" }}>
                  {u}
                </p>
                <button
                  type="button"
                  onClick={() => setVideoModal(true)}
                  className="v2-tight mt-4 inline-flex items-center gap-1.5 self-start text-[12.5px] font-medium text-[var(--v2-ink-400)] transition group-hover:text-[var(--v2-brand-700)]"
                >
                  <V2Icons.plus className="h-3.5 w-3.5" /> Создать контент-тест
                </button>
              </div>
            ))}
          </div>
        </BSect>

        <BSect title="Что тестируем" sub="Не окончательные content pillars, а направления эксперимента.">
          <div>
            {doc.dirs.map((d) => {
              const on = dirOpen === d.id;
              return (
                <div key={d.id} className="border-t border-[var(--v2-ink-200)]/80">
                  <button
                    type="button"
                    onClick={() => setDirOpen(on ? null : d.id)}
                    className="group grid w-full items-start gap-8 py-6 text-left"
                    style={{ gridTemplateColumns: "minmax(0,1fr) 200px 150px 24px" }}
                  >
                    <div className="min-w-0">
                      <h3 className="v2-tighter text-[22px] font-light leading-tight text-[var(--v2-ink-900)] transition group-hover:text-[var(--v2-brand-700)]">
                        {d.name}
                      </h3>
                      <p
                        className="v2-tight mt-2 max-w-[64ch] text-[14px] leading-relaxed text-[var(--v2-ink-500)]"
                        style={{ textWrap: "pretty" }}
                      >
                        {d.need}
                      </p>
                    </div>
                    <div>
                      <BK>Статус</BK>
                      <p className="v2-tight mt-1.5 text-[13.5px] font-medium text-[var(--v2-ink-800)]">{d.status}</p>
                    </div>
                    <div>
                      <BK>Роликов</BK>
                      <p className="v2-tnum mt-1.5 text-[13.5px] text-[var(--v2-ink-800)]">
                        {d.videos} · {d.avg}
                      </p>
                    </div>
                    <V2Icons.chev
                      className={`mt-1 h-5 w-5 text-[var(--v2-ink-300)] transition group-hover:text-[var(--v2-ink-500)] ${on ? "rotate-180" : ""}`}
                    />
                  </button>
                  {on ? (
                    <div className="grid gap-8 pb-7" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 260px" }}>
                      <div>
                        <BK>Гипотеза</BK>
                        <p className="v2-tight mt-2 text-[15px] leading-relaxed text-[var(--v2-ink-800)]" style={{ textWrap: "pretty" }}>
                          «{d.hyp}»
                        </p>
                      </div>
                      <div>
                        <BK cls="text-[var(--v2-brand-600)]">Что проверяем</BK>
                        <p className="v2-tight mt-2 text-[15px] leading-relaxed text-[var(--v2-ink-800)]" style={{ textWrap: "pretty" }}>
                          {d.check}
                        </p>
                      </div>
                      <div>
                        <BK>Примеры</BK>
                        <ul className="mt-2 flex flex-col gap-1.5">
                          {d.ex.map((x, i) => (
                            <li key={i} className="v2-tight text-[13.5px] leading-relaxed text-[var(--v2-ink-600)]">
                              {x}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </BSect>

        <BSect
          title="YouTube Lab"
          sub="Каждый ролик — не просто контент, а маленький тест аудитории и позиционирования."
          right={
            <>
              <div className="inline-flex items-center rounded-full bg-white p-1 shadow-[var(--v2-shadow-card)]">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={`v2-tight h-7 rounded-full px-3.5 text-[12px] font-medium transition ${
                      filter === f.id
                        ? "bg-[var(--v2-ink-900)] text-white"
                        : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <BGhost
                  onClick={(e) => {
                    e.stopPropagation();
                    setColsOpen((o) => !o);
                  }}
                >
                  <IcCols className="h-4 w-4 text-[var(--v2-ink-400)]" /> Настроить колонки
                </BGhost>
                {colsOpen ? (
                  <ColumnsMenu cols={cols} setCols={setCols} onClose={() => setColsOpen(false)} />
                ) : null}
              </div>
            </>
          }
        >
          <VideoTable cols={cols} filter={filter} videos={doc.videos} dirName={dirName} onOpen={setVideoId} />
          <p className="v2-tight mt-3 text-[12.5px] text-[var(--v2-ink-400)]">
            Успех ролика — это упаковка (CTR), удержание (avg %), масштаб (views/impressions), конверсия (subs на 1000) и
            глубина отклика. Качественный сигнал ставится вручную.
          </p>
        </BSect>

        <BSect title="Сравнение направлений" sub="Минимум 2 ролика в направлении — иначе это ещё не данные.">
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))" }}>
            {doc.dirStats.map((s) => (
              <div key={s.dir} className="rounded-[20px] bg-white px-6 py-5 shadow-[var(--v2-shadow-card)]">
                <h3 className="v2-tight text-[16px] font-medium text-[var(--v2-ink-900)]">{dirName(s.dir)}</h3>
                <p className="v2-tnum mt-1 text-[12px] text-[var(--v2-ink-400)]">
                  {s.videos} {s.videos === 1 ? "ролик" : "ролика"}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {(
                    [
                      ["Avg CTR", s.ctr],
                      ["Avg viewed", s.viewed],
                      ["Subs / 1000", s.subs],
                    ] as const
                  ).map(([l, v]) => (
                    <div key={l}>
                      <BK>{l}</BK>
                      <p className="v2-tnum mt-1 text-[17px] font-light text-[var(--v2-ink-900)]">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-[var(--v2-ink-100)] pt-4">
                  <SigCell k={s.sig} />
                </div>
              </div>
            ))}
          </div>
          <p className="v2-tight mt-4 text-[13.5px] text-[var(--v2-ink-500)]">
            Похоже, тема кризиса лучше привлекает правильную аудиторию. Данных пока мало.
          </p>
        </BSect>

        <BSect
          title="Что я узнаю о своей аудитории"
          right={
            <BGhost onClick={() => setInsightOpen(true)}>
              <V2Icons.plus className="h-4 w-4 text-[var(--v2-ink-400)]" /> Инсайт
            </BGhost>
          }
        >
          <div className="divide-y divide-[var(--v2-ink-100)] rounded-[20px] bg-white shadow-[var(--v2-shadow-card)]">
            {doc.insights.map((x, i) => (
              <div key={i} className="grid items-start gap-6 px-7 py-5" style={{ gridTemplateColumns: "minmax(0,1fr) 220px 170px" }}>
                <p
                  className="v2-tight text-[16.5px] font-light leading-relaxed text-[var(--v2-ink-900)]"
                  style={{ textWrap: "pretty" }}
                >
                  «{x.t}»
                </p>
                <span className="v2-tight pt-1 text-[12.5px] text-[var(--v2-ink-500)]">{x.src}</span>
                <span className="flex items-center justify-self-end gap-2.5 pt-1">
                  <Dots n={x.power} tint="#2A56EB" />
                  <span className="v2-tight text-[11.5px] text-[var(--v2-ink-400)]">{POWER[x.power - 1]}</span>
                </span>
              </div>
            ))}
          </div>
        </BSect>

        <BSect title="Как менялось позиционирование">
          <div className="flex flex-col">
            {doc.evolution.map((e, i) => (
              <div key={i}>
                <div className={`rounded-[20px] px-7 py-6 ${e.now ? "bg-white shadow-[var(--v2-shadow-card)]" : "bg-[var(--v2-ink-100)]/60"}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <BK cls={e.now ? "text-[var(--v2-brand-600)]" : "text-[var(--v2-ink-400)]"}>{e.period}</BK>
                    {e.now ? (
                      <span className="inline-flex h-6 items-center rounded-full bg-[var(--v2-brand-50)] px-2.5 text-[11px] font-semibold text-[var(--v2-brand-700)]">
                        Актуально
                      </span>
                    ) : null}
                  </div>
                  <p
                    className={`v2-tighter mt-2.5 font-light leading-[1.35] text-[var(--v2-ink-900)] ${e.now ? "text-[22px]" : "text-[18px]"}`}
                    style={{ textWrap: "pretty" }}
                  >
                    «{e.text}»
                  </p>
                  <div className="mt-4 grid max-w-[820px] grid-cols-2 gap-6">
                    <div>
                      <BK>Почему изменили</BK>
                      <p className="v2-tight mt-1.5 text-[13.5px] leading-relaxed text-[var(--v2-ink-600)]">{e.why}</p>
                    </div>
                    <div>
                      <BK>Какие данные привели</BK>
                      <p className="v2-tight mt-1.5 text-[13.5px] leading-relaxed text-[var(--v2-ink-600)]">{e.data}</p>
                    </div>
                  </div>
                </div>
                {i < doc.evolution.length - 1 ? (
                  <div className="flex justify-center py-2">
                    <IcArrowD className="h-5 w-5 text-[var(--v2-ink-300)]" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </BSect>

        <section className="mb-14">
          <div className="rounded-[24px] border border-[var(--v2-ink-300)]/70 bg-[linear-gradient(180deg,#FCFCFD,#F7F8FB)] px-9 py-8">
            <BK cls="text-[var(--v2-ink-500)]">Что я не хочу потерять</BK>
            <ul className="mt-4 grid gap-x-10 gap-y-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))" }}>
              {doc.keep.map((k, i) => (
                <li key={i} className="v2-tight text-[15px] leading-relaxed text-[var(--v2-ink-800)]">
                  {k}
                </li>
              ))}
            </ul>
            <p
              className="v2-tight mt-6 max-w-[76ch] border-t border-[var(--v2-ink-200)] pt-5 text-[15px] leading-relaxed text-[var(--v2-ink-600)]"
              style={{ textWrap: "pretty" }}
            >
              Если какой-либо формат хорошо растёт, но заставляет меня стать человеком, которым я быть не хочу — это важный
              стратегический минус.
            </p>
          </div>
        </section>

        <BSect title="Как бренд сейчас монетизируется">
          <div className="grid gap-5" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) minmax(0,1.1fr)" }}>
            {(
              [
                ["Текущее", doc.money.now],
                ["Будущее", doc.money.future],
              ] as const
            ).map(([t, list]) => (
              <div key={t} className="rounded-[20px] bg-white px-6 py-5 shadow-[var(--v2-shadow-card)]">
                <BK>{t}</BK>
                <div className="mt-3 flex flex-col gap-3">
                  {list.map((x) => (
                    <div key={x.n}>
                      <p className="v2-tight text-[14.5px] font-medium text-[var(--v2-ink-900)]">{x.n}</p>
                      <p className="v2-tight mt-0.5 text-[13px] text-[var(--v2-ink-500)]">{x.d}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex flex-col rounded-[20px] bg-[var(--v2-ink-900)] px-7 py-6 text-white">
              <p className="v2-tighter text-[19px] font-light leading-[1.4]" style={{ textWrap: "pretty" }}>
                «{doc.money.key}»
              </p>
              <div className="mt-auto flex flex-col gap-2 pt-5">
                {doc.money.courseNote.map((n, i) => (
                  <p key={i} className="v2-tight text-[13px] leading-relaxed text-white/60" style={{ textWrap: "pretty" }}>
                    {n}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </BSect>

        <BSect
          title="Что может родиться из аудитории"
          sub="Observation → product hypothesis. Все идеи живут в разделе «Идеи»."
          right={
            <BGhost>
              <Link href={appPath("/v2/personal/ideas")} className="inline-flex items-center gap-1.5 text-inherit no-underline">
                Открыть все идеи <V2Icons.arrowR className="h-3.5 w-3.5" />
              </Link>
            </BGhost>
          }
        >
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px,1fr))" }}>
            {doc.productHyp.map((p) => (
              <div key={p.name} className="flex flex-col rounded-[20px] bg-white px-6 py-5 shadow-[var(--v2-shadow-card)]">
                <div className="flex items-center gap-3">
                  <h3 className="v2-tight text-[16.5px] font-medium text-[var(--v2-ink-900)]">{p.name}</h3>
                  <span className="inline-flex h-6 items-center rounded-full bg-[var(--v2-ink-100)] px-2.5 text-[11px] font-medium text-[var(--v2-ink-600)]">
                    {p.status}
                  </span>
                </div>
                <p className="v2-tight mt-3 text-[14.5px] leading-relaxed text-[var(--v2-ink-700)]" style={{ textWrap: "pretty" }}>
                  «{p.text}»
                </p>
                <p className="v2-tight mt-3 text-[13px] leading-relaxed text-[var(--v2-ink-500)]">
                  <span className="text-[var(--v2-ink-400)]">Почему возникло: </span>
                  {p.why}
                </p>
                <Link
                  href={appPath("/v2/personal/ideas")}
                  className="v2-tight mt-4 inline-flex items-center gap-1.5 self-start text-[12.5px] font-medium"
                >
                  Отправить в Идеи <V2Icons.arrowR className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </BSect>

        <BSect title="Каналы">
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))" }}>
            {doc.channels.map((c) => (
              <div key={c.n} className="rounded-[20px] bg-white px-6 py-5 shadow-[var(--v2-shadow-card)]">
                <h3 className="v2-tight text-[16px] font-medium text-[var(--v2-ink-900)]">{c.n}</h3>
                <p className="v2-tight mt-1.5 text-[13.5px] leading-relaxed text-[var(--v2-ink-500)]" style={{ textWrap: "pretty" }}>
                  {c.d}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-[20px] bg-[var(--v2-ink-100)]/60 px-7 py-5">
            <BK>Правило</BK>
            <p className="v2-tight mt-2 text-[15px] leading-relaxed text-[var(--v2-ink-800)]">
              Не строить три независимые контент-машины. Одна мысль имеет формы:
            </p>
            <div className="v2-tight mt-3 flex flex-wrap items-center gap-3 text-[13.5px] text-[var(--v2-ink-600)]">
              {["YouTube", "Telegram post", "Reel", "Carousel"].map((x, i) => (
                <span key={x} className="contents">
                  <span className="rounded-full bg-white px-3 py-1 shadow-[var(--v2-shadow-card)]">{x}</span>
                  {i < 3 ? <span className="text-[var(--v2-ink-300)]">→</span> : null}
                </span>
              ))}
            </div>
          </div>
        </BSect>

        <BSect title="Что звучит как мой бренд" sub="Библиотека формулировок — можно копировать и отправлять в Идеи.">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              value={phraseDraft}
              onChange={(e) => setPhraseDraft(e.target.value)}
              placeholder="Новая формулировка"
              className="v2-tight h-10 min-w-[280px] flex-1 rounded-xl border border-[var(--v2-ink-200)] bg-white px-3.5 text-[14px] outline-none focus:border-[var(--v2-brand-400)]"
            />
            <button
              type="button"
              onClick={() => void addPhrase()}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-medium text-white"
            >
              <V2Icons.plus className="h-4 w-4" /> Добавить
            </button>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(330px,1fr))" }}>
            {doc.phrases.map((p, i) => (
              <div key={i} className="group relative rounded-[20px] bg-white px-6 py-5 shadow-[var(--v2-shadow-card)]">
                <p
                  className="v2-tight pr-8 text-[17px] font-light leading-[1.45] text-[var(--v2-ink-900)]"
                  style={{ textWrap: "pretty" }}
                >
                  «{p}»
                </p>
                <button
                  type="button"
                  title="Скопировать"
                  onClick={() => copyPhrase(p, i)}
                  className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--v2-ink-300)] opacity-0 transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-800)] group-hover:opacity-100"
                >
                  <IcCopy className="h-4 w-4" />
                </button>
                {copied === i ? (
                  <span className="v2-tight absolute right-14 top-5 text-[11.5px] text-[var(--v2-brand-600)]">скопировано</span>
                ) : null}
              </div>
            ))}
          </div>
        </BSect>

        <div className="flex flex-wrap items-center gap-8 rounded-[24px] bg-[var(--v2-ink-900)] px-9 py-8 text-white">
          <div>
            <p className="v2-tighter text-[24px] font-light leading-tight">Что снимать дальше?</p>
            <p className="v2-tight mt-2 text-[14px] text-white/60">Незакрытые гипотезы и идеи из backlog — без выбора за вас.</p>
          </div>
          <button
            type="button"
            onClick={() => setNextOpen(true)}
            className="ml-auto h-11 rounded-xl bg-white px-5 text-[13.5px] font-medium text-[var(--v2-ink-900)] transition hover:bg-[var(--v2-ink-100)]"
          >
            Открыть
          </button>
        </div>
      </div>

      {current ? (
        <VideoDrawer
          v={current}
          dirName={dirName}
          onClose={() => setVideoId(null)}
          onSave={(patch) => void saveVideo(current.id, patch)}
        />
      ) : null}
      {nextOpen ? <NextOverlay doc={doc} dirName={dirName} onClose={() => setNextOpen(false)} /> : null}
      {insightOpen ? (
        <InsightModal videos={doc.videos} onClose={() => setInsightOpen(false)} onSave={addInsight} />
      ) : null}
      {histOpen ? <HypHistory evolution={doc.evolution} onClose={() => setHistOpen(false)} /> : null}
      {videoModal ? (
        <VideoModal dirs={doc.dirs} onClose={() => setVideoModal(false)} onSave={addVideo} />
      ) : null}
      {hypModal ? <HypModal onClose={() => setHypModal(false)} onSave={createHyp} /> : null}
    </div>
  );
}

function ColumnsMenu({
  cols,
  setCols,
  onClose,
}: {
  cols: BrandColumn[];
  setCols: (u: (cs: BrandColumn[]) => BrandColumn[]) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute right-0 top-11 z-30 w-[260px] rounded-2xl bg-white p-3 shadow-[var(--v2-shadow-pop)]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-2 pb-2">
        <BK>Колонки</BK>
        <button type="button" onClick={onClose} className="text-[var(--v2-ink-400)] transition hover:text-[var(--v2-ink-800)]">
          <IcClose className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {cols.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={c.fixed}
            onClick={() => setCols((cs) => cs.map((x) => (x.id === c.id ? { ...x, on: !x.on } : x)))}
            className={`v2-tight flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13px] transition ${
              c.fixed ? "opacity-40" : "hover:bg-[var(--v2-ink-50)]"
            }`}
          >
            <span
              className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] ${
                c.on ? "bg-[var(--v2-brand-500)]" : "border border-[var(--v2-ink-300)]"
              }`}
            >
              {c.on ? (
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none">
                  <path d="m6 12.5 4 4 8-9" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </span>
            <span className="text-[var(--v2-ink-700)]">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function VideoTable({
  cols,
  filter,
  videos,
  dirName,
  onOpen,
}: {
  cols: BrandColumn[];
  filter: "all" | "pub" | "plan";
  videos: BrandVideo[];
  dirName: (id: string) => string;
  onOpen: (id: string) => void;
}) {
  const on = (id: string) => cols.find((c) => c.id === id)?.on;
  const rows =
    filter === "all"
      ? videos
      : videos.filter((v) => (filter === "pub" ? v.status === "Опубликован" : v.status !== "Опубликован"));
  type Cell = { id: string; label: string; width: number; render: (v: BrandVideo) => React.ReactNode };
  const allCells: Cell[] = [
    {
      id: "dir",
      label: "Направление",
      width: 160,
      render: (v) => <span className="v2-tight text-[12.5px] text-[var(--v2-ink-600)]">{dirName(v.dir)}</span>,
    },
    {
      id: "hyp",
      label: "Гипотеза",
      width: 240,
      render: (v) => <span className="v2-tight line-clamp-2 text-[12.5px] text-[var(--v2-ink-500)]">{v.hyp}</span>,
    },
    {
      id: "date",
      label: "Дата",
      width: 88,
      render: (v) => <span className="v2-tnum text-[12.5px] text-[var(--v2-ink-500)]">{v.date}</span>,
    },
    {
      id: "v24",
      label: "Views 24h",
      width: 88,
      render: (v) => (
        <span className="v2-tnum text-[12.5px] text-[var(--v2-ink-700)]">{v.m ? v.m.v24.toLocaleString("ru") : "—"}</span>
      ),
    },
    {
      id: "v7",
      label: "Views 7d",
      width: 88,
      render: (v) => (
        <span className="v2-tnum text-[12.5px] text-[var(--v2-ink-700)]">{v.m ? v.m.v7.toLocaleString("ru") : "—"}</span>
      ),
    },
    {
      id: "v30",
      label: "Views",
      width: 88,
      render: (v) => (
        <span className="v2-tnum text-[13px] font-medium text-[var(--v2-ink-900)]">
          {v.m ? v.m.v30.toLocaleString("ru") : "—"}
        </span>
      ),
    },
    {
      id: "impressions",
      label: "Impressions",
      width: 100,
      render: (v) => (
        <span className="v2-tnum text-[12.5px] text-[var(--v2-ink-700)]">
          {v.m ? v.m.impressions.toLocaleString("ru") : "—"}
        </span>
      ),
    },
    {
      id: "ctr",
      label: "CTR",
      width: 68,
      render: (v) => <span className="v2-tnum text-[12.5px] text-[var(--v2-ink-700)]">{v.m ? `${v.m.ctr}%` : "—"}</span>,
    },
    {
      id: "avd",
      label: "AVD",
      width: 68,
      render: (v) => <span className="v2-tnum text-[12.5px] text-[var(--v2-ink-700)]">{v.m ? v.m.avd : "—"}</span>,
    },
    {
      id: "avp",
      label: "Avg %",
      width: 68,
      render: (v) => <span className="v2-tnum text-[12.5px] text-[var(--v2-ink-700)]">{v.m ? `${v.m.avp}%` : "—"}</span>,
    },
    {
      id: "subs",
      label: "Subs",
      width: 68,
      render: (v) => <span className="v2-tnum text-[12.5px] text-[var(--v2-ink-700)]">{v.m ? `+${v.m.subs}` : "—"}</span>,
    },
    {
      id: "comments",
      label: "Комментарии",
      width: 100,
      render: (v) => <span className="v2-tnum text-[12.5px] text-[var(--v2-ink-700)]">{v.m ? v.m.comments : "—"}</span>,
    },
    { id: "sig", label: "Сигнал", width: 150, render: (v) => <SigCell k={v.sig} /> },
    {
      id: "learn",
      label: "Вывод",
      width: 260,
      render: (v) => (
        <span className="v2-tight line-clamp-2 text-[12.5px] text-[var(--v2-ink-600)]">{v.learn || "—"}</span>
      ),
    },
  ];
  const cells = allCells.filter((c) => on(c.id));
  const grid = `minmax(240px,1fr) ${cells.map((c) => `${c.width}px`).join(" ")} 32px`;
  return (
    <div className="overflow-x-auto rounded-[20px] bg-white shadow-[var(--v2-shadow-card)]">
      <div className="min-w-[900px]">
        <div
          className="grid gap-5 border-b border-[var(--v2-ink-100)] bg-[var(--v2-ink-50)]/60 px-7 py-3.5"
          style={{ gridTemplateColumns: grid }}
        >
          <BK>Название</BK>
          {cells.map((c) => (
            <BK key={c.id}>{c.label}</BK>
          ))}
          <span />
        </div>
        {rows.map((v) => (
          <div
            key={v.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(v.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onOpen(v.id);
            }}
            className="group grid cursor-pointer items-center gap-5 border-b border-[var(--v2-ink-100)] px-7 py-4 transition last:border-0 hover:bg-[var(--v2-ink-50)]/60"
            style={{ gridTemplateColumns: grid }}
          >
            <div className="min-w-0">
              <p className="v2-tight truncate text-[14.5px] font-medium text-[var(--v2-ink-900)] transition group-hover:text-[var(--v2-brand-700)]">
                {v.title}
              </p>
              <p className="v2-tight mt-0.5 truncate text-[12px] text-[var(--v2-ink-400)]">{v.sub || v.status}</p>
            </div>
            {cells.map((c) => (
              <div key={c.id} className="min-w-0">
                {c.render(v)}
              </div>
            ))}
            <V2Icons.arrowR className="h-4 w-4 text-[var(--v2-ink-300)] transition group-hover:text-[var(--v2-brand-600)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoDrawer({
  v,
  dirName,
  onClose,
  onSave,
}: {
  v: BrandVideo;
  dirName: (id: string) => string;
  onClose: () => void;
  onSave: (patch: Partial<BrandVideo>) => void;
}) {
  const [learn, setLearn] = useState(v.learn);
  const [next, setNext] = useState(v.next);
  const [quotes, setQuotes] = useState(v.quotes);
  const [quoteDraft, setQuoteDraft] = useState("");
  const [quoteSrc, setQuoteSrc] = useState("YouTube");

  useEffect(() => {
    setLearn(v.learn);
    setNext(v.next);
    setQuotes(v.quotes);
  }, [v]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const M = v.m;
  const metrics = M
    ? ([
        ["Impressions", M.impressions.toLocaleString("ru")],
        ["CTR", `${M.ctr}%`],
        ["Views 24h", M.v24.toLocaleString("ru")],
        ["Views 7d", M.v7.toLocaleString("ru")],
        ["Views 30d", M.v30.toLocaleString("ru")],
        ["Avg view duration", M.avd],
        ["Avg % viewed", `${M.avp}%`],
        ["Подписчики", `+${M.subs}`],
        ["Комментарии", String(M.comments)],
      ] as const)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-[var(--v2-ink-900)]/35 backdrop-blur-[2px]" />
      <div
        className="relative h-full w-[680px] max-w-[94vw] overflow-y-auto bg-white shadow-[var(--v2-shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start gap-4 border-b border-[var(--v2-ink-100)] bg-white/92 px-10 pb-4 pt-7 backdrop-blur">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <BK>{dirName(v.dir)}</BK>
              <span className="inline-flex h-6 items-center rounded-full bg-[var(--v2-ink-100)] px-2.5 text-[11px] font-medium text-[var(--v2-ink-600)]">
                {v.status}
              </span>
              {v.date !== "—" ? <span className="v2-tnum text-[12px] text-[var(--v2-ink-400)]">{v.date}</span> : null}
            </div>
            <h2 className="v2-tighter mt-2 text-[29px] font-light leading-[1.12] text-[var(--v2-ink-900)]" style={{ textWrap: "pretty" }}>
              {v.title}
            </h2>
            {v.sub ? <p className="v2-tight mt-1.5 text-[15px] text-[var(--v2-ink-500)]">{v.sub}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--v2-ink-400)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
          >
            <IcClose className="h-[17px] w-[17px]" />
          </button>
        </div>

        <div className="px-10 pb-28 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[var(--v2-ink-50)] p-5">
              <BK>Гипотеза ролика</BK>
              <p className="v2-tight mt-2.5 text-[14.5px] leading-relaxed text-[var(--v2-ink-800)]" style={{ textWrap: "pretty" }}>
                «{v.hyp || "—"}»
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--v2-ink-50)] p-5">
              <BK>Что мы хотим узнать</BK>
              <p className="v2-tight mt-2.5 text-[14.5px] leading-relaxed text-[var(--v2-ink-800)]" style={{ textWrap: "pretty" }}>
                «{v.want || "—"}»
              </p>
            </div>
          </div>

          <section className="mt-8">
            <BK>Показатели</BK>
            {M ? (
              <div className="mt-3 grid grid-cols-3 gap-x-6 gap-y-4">
                {metrics.map(([l, val]) => (
                  <div key={l} className="border-b border-[var(--v2-ink-100)] pb-3">
                    <span className="v2-tight text-[11.5px] text-[var(--v2-ink-400)]">{l}</span>
                    <p className="v2-tnum mt-0.5 text-[19px] font-light text-[var(--v2-ink-900)]">{val}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="v2-tight mt-3 text-[13.5px] text-[var(--v2-ink-400)]">Ролик ещё не опубликован — данных нет.</p>
            )}
            <div className="mt-5 flex items-center gap-3">
              <BK>Качественный сигнал</BK>
              <SigCell k={v.sig} />
            </div>
          </section>

          <section className="mt-8">
            <BK>Качественные сигналы</BK>
            {quotes.length ? (
              <div className="mt-3 flex flex-col gap-2.5">
                {quotes.map((q, i) => (
                  <div key={i} className="rounded-2xl border border-[var(--v2-ink-200)] px-5 py-4">
                    <p className="v2-tight text-[15px] leading-relaxed text-[var(--v2-ink-900)]" style={{ textWrap: "pretty" }}>
                      «{q.t}»
                    </p>
                    <p className="v2-tight mt-1.5 text-[11.5px] text-[var(--v2-ink-400)]">{q.src}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="v2-tight mt-3 text-[13.5px] text-[var(--v2-ink-400)]">Комментариев пока нет.</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={quoteDraft}
                onChange={(e) => setQuoteDraft(e.target.value)}
                placeholder="Цитата"
                className="v2-tight h-9 min-w-[200px] flex-1 rounded-xl border border-dashed border-[var(--v2-ink-300)] px-3 text-[13px] outline-none"
              />
              <select value={quoteSrc} onChange={(e) => setQuoteSrc(e.target.value)} className="v2-tight h-9 rounded-xl border border-[var(--v2-ink-200)] px-2 text-[12px]">
                {["YouTube", "Telegram", "Instagram", "Личка"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (!quoteDraft.trim()) return;
                  setQuotes((q) => [...q, { t: quoteDraft.trim(), src: quoteSrc }]);
                  setQuoteDraft("");
                }}
                className="v2-tight inline-flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-[var(--v2-ink-300)] px-3.5 text-[12.5px] font-medium text-[var(--v2-ink-500)] transition hover:border-[var(--v2-ink-400)] hover:text-[var(--v2-ink-900)]"
              >
                <V2Icons.plus className="h-3.5 w-3.5" /> Сохранить комментарий
              </button>
            </div>
          </section>

          <section className="mt-8">
            <BK cls="text-[var(--v2-brand-600)]">Главный вывод</BK>
            <p className="v2-tight mt-2 text-[13px] text-[var(--v2-ink-400)]">Что этот ролик рассказал мне о моей аудитории?</p>
            <textarea
              value={learn}
              onChange={(e) => setLearn(e.target.value)}
              rows={3}
              placeholder="1–3 предложения"
              className="v2-tight mt-2.5 w-full resize-none rounded-2xl border border-[var(--v2-brand-200)] bg-[var(--v2-brand-50)]/70 px-4 py-3 text-[16px] leading-relaxed text-[var(--v2-ink-900)] outline-none transition placeholder:text-[var(--v2-ink-400)] focus:border-[var(--v2-brand-400)] focus:bg-white"
            />
          </section>

          <section className="mt-8">
            <BK>Следующий тест</BK>
            <textarea
              value={next}
              onChange={(e) => setNext(e.target.value)}
              rows={2}
              placeholder="Что проверить дальше"
              className="v2-tight mt-2 w-full resize-none rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3.5 py-2.5 text-[15px] leading-relaxed outline-none focus:border-[var(--v2-brand-400)] focus:bg-white"
            />
          </section>
        </div>

        <div className="sticky bottom-0 flex items-center gap-2 border-t border-[var(--v2-ink-100)] bg-white/92 px-10 py-4 backdrop-blur">
          <button
            type="button"
            onClick={() => {
              onSave({ learn, next, quotes });
              onClose();
            }}
            className="h-10 rounded-xl bg-[var(--v2-ink-900)] px-5 text-[13px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)]"
          >
            Сохранить
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-xl px-4 text-[13px] font-medium text-[var(--v2-ink-600)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

function InsightModal({
  videos,
  onClose,
  onSave,
}: {
  videos: BrandVideo[];
  onClose: () => void;
  onSave: (t: string, src: string, power: number) => void;
}) {
  const [text, setText] = useState("");
  const [srcKind, setSrcKind] = useState("ролик");
  const [videoTitle, setVideoTitle] = useState("");
  const [power, setPower] = useState(2);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-[var(--v2-ink-900)]/45 p-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-[600px] rounded-[24px] bg-white shadow-[var(--v2-shadow-pop)]" onClick={(e) => e.stopPropagation()}>
        <div className="px-8 pb-6 pt-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="v2-tighter text-[24px] font-light leading-tight text-[var(--v2-ink-900)]">Инсайт аудитории</h2>
              <p className="v2-tight mt-1.5 text-[13px] text-[var(--v2-ink-500)]">
                Одна реплика не становится истиной об аудитории — отмечайте силу сигнала честно.
              </p>
            </div>
            <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--v2-ink-400)] hover:bg-[var(--v2-ink-100)]">
              <IcClose className="h-[17px] w-[17px]" />
            </button>
          </div>
          <label className="mt-6 block">
            <span className={labCls}>Формулировка</span>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Что именно вы поняли об аудитории"
              className="v2-tight mt-1.5 w-full resize-none rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3.5 py-2.5 text-[14.5px] leading-relaxed outline-none focus:border-[var(--v2-brand-400)] focus:bg-white"
            />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <label className="block">
              <span className={labCls}>На основании чего</span>
              <select value={srcKind} onChange={(e) => setSrcKind(e.target.value)} className={`${fieldCls} cursor-pointer appearance-none`}>
                {["ролик", "комментарий", "Telegram", "личное сообщение", "разговор", "другое"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labCls}>Связанные ролики</span>
              <select value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} className={`${fieldCls} cursor-pointer appearance-none`}>
                <option value="">Не выбрано</option>
                {videos.map((v) => (
                  <option key={v.id} value={v.title}>
                    {v.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-5">
            <span className={labCls}>Сила сигнала</span>
            <div className="mt-2 inline-flex rounded-xl bg-[var(--v2-ink-100)] p-1">
              {POWER.map((p, i) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPower(i + 1)}
                  className={`v2-tight h-8 rounded-lg px-3.5 text-[12.5px] font-medium transition ${
                    power === i + 1
                      ? "bg-white text-[var(--v2-ink-900)] shadow-[var(--v2-shadow-card)]"
                      : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 rounded-b-[24px] bg-[var(--v2-ink-50)] px-8 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-[13px] font-medium text-[var(--v2-ink-600)]">
            Отмена
          </button>
          <button
            type="button"
            onClick={() => {
              if (!text.trim()) return;
              const src = [srcKind, videoTitle].filter(Boolean).join(" · ");
              void onSave(text.trim(), src, power);
            }}
            className="h-10 rounded-xl bg-[var(--v2-ink-900)] px-5 text-[13px] font-medium text-white shadow-[var(--v2-shadow-card)]"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoModal({
  dirs,
  onClose,
  onSave,
}: {
  dirs: BrandDoc["dirs"];
  onClose: () => void;
  onSave: (title: string, dir: string, status: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [dir, setDir] = useState(dirs[0]?.id ?? "");
  const [status, setStatus] = useState("Idea");
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-[var(--v2-ink-900)]/45 p-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-[520px] rounded-[24px] bg-white shadow-[var(--v2-shadow-pop)]" onClick={(e) => e.stopPropagation()}>
        <div className="px-8 pb-6 pt-7">
          <h2 className="v2-tighter text-[24px] font-light text-[var(--v2-ink-900)]">Новый ролик</h2>
          <label className="mt-5 block">
            <span className={labCls}>Название</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldCls} placeholder="Название ролика" />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <label className="block">
              <span className={labCls}>Направление</span>
              <select value={dir} onChange={(e) => setDir(e.target.value)} className={`${fieldCls} cursor-pointer appearance-none`}>
                {dirs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labCls}>Статус</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${fieldCls} cursor-pointer appearance-none`}>
                {VIDEO_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 rounded-b-[24px] bg-[var(--v2-ink-50)] px-8 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-[13px] font-medium text-[var(--v2-ink-600)]">
            Отмена
          </button>
          <button
            type="button"
            onClick={() => {
              if (!title.trim() || !dir) return;
              void onSave(title.trim(), dir, status);
            }}
            className="h-10 rounded-xl bg-[var(--v2-ink-900)] px-5 text-[13px] font-medium text-white"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}

function HypModal({ onClose, onSave }: { onClose: () => void; onSave: (main: string, why: string) => void }) {
  const [main, setMain] = useState("");
  const [why, setWhy] = useState("");
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-[var(--v2-ink-900)]/45 p-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-[600px] rounded-[24px] bg-white shadow-[var(--v2-shadow-pop)]" onClick={(e) => e.stopPropagation()}>
        <div className="px-8 pb-6 pt-7">
          <h2 className="v2-tighter text-[24px] font-light text-[var(--v2-ink-900)]">Новая гипотеза</h2>
          <p className="v2-tight mt-1.5 text-[13px] text-[var(--v2-ink-500)]">
            Текущая гипотеза уйдёт в эволюцию позиционирования.
          </p>
          <label className="mt-5 block">
            <span className={labCls}>Формулировка</span>
            <textarea
              rows={3}
              value={main}
              onChange={(e) => setMain(e.target.value)}
              className="v2-tight mt-1.5 w-full resize-none rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3.5 py-2.5 text-[14.5px] outline-none focus:border-[var(--v2-brand-400)] focus:bg-white"
            />
          </label>
          <label className="mt-4 block">
            <span className={labCls}>Почему меняем</span>
            <input value={why} onChange={(e) => setWhy(e.target.value)} className={fieldCls} placeholder="Какие данные привели" />
          </label>
        </div>
        <div className="flex justify-end gap-2 rounded-b-[24px] bg-[var(--v2-ink-50)] px-8 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-[13px] font-medium text-[var(--v2-ink-600)]">
            Отмена
          </button>
          <button
            type="button"
            onClick={() => {
              if (!main.trim()) return;
              void onSave(main.trim(), why.trim());
            }}
            className="h-10 rounded-xl bg-[var(--v2-ink-900)] px-5 text-[13px] font-medium text-white"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}

function HypHistory({
  evolution,
  onClose,
}: {
  evolution: BrandDoc["evolution"];
  onClose: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-[var(--v2-ink-900)]/35 backdrop-blur-[2px]" />
      <div
        className="relative h-full w-[560px] max-w-[92vw] overflow-y-auto bg-white shadow-[var(--v2-shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--v2-ink-100)] px-9 pb-5 pt-7">
          <h2 className="v2-tighter text-[26px] font-light text-[var(--v2-ink-900)]">История гипотез</h2>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--v2-ink-400)] hover:bg-[var(--v2-ink-100)]">
            <IcClose className="h-[17px] w-[17px]" />
          </button>
        </div>
        <div className="flex flex-col gap-5 px-9 py-6">
          {[...evolution].reverse().map((e, i) => (
            <div key={i} className="rounded-2xl bg-[var(--v2-ink-50)] px-6 py-5">
              <BK cls={e.now ? "text-[var(--v2-brand-600)]" : "text-[var(--v2-ink-400)]"}>{e.period}</BK>
              <p className="v2-tight mt-2 text-[16.5px] font-light leading-snug text-[var(--v2-ink-900)]" style={{ textWrap: "pretty" }}>
                «{e.text}»
              </p>
              <p className="v2-tight mt-3 text-[13px] leading-relaxed text-[var(--v2-ink-500)]">{e.why}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NextOverlay({
  doc,
  onClose,
}: {
  doc: BrandDoc;
  dirName: (id: string) => string;
  onClose: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[var(--v2-app-bg,#F4F5F7)]">
      <div className="flex min-h-full flex-col items-center px-8 py-14">
        <div className="w-full max-w-[900px]">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 className="v2-tighter text-[38px] font-light leading-[1.05] text-[var(--v2-ink-900)]">Что снимать дальше?</h2>
              <p className="v2-tight mt-3 max-w-[60ch] text-[15px] text-[var(--v2-ink-500)]" style={{ textWrap: "pretty" }}>
                Сервис не выбирает ролик. Он показывает, какую гипотезу тестирует каждый вариант.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[var(--v2-ink-500)] shadow-[var(--v2-shadow-card)] transition hover:text-[var(--v2-ink-900)]"
            >
              <IcClose className="h-[18px] w-[18px]" />
            </button>
          </div>
          <div className="mt-10 flex flex-col">
            {doc.nextHyp.map((h, i) => (
              <div
                key={i}
                className="grid items-baseline gap-8 border-t border-[var(--v2-ink-200)]/80 py-6"
                style={{ gridTemplateColumns: "minmax(0,1fr) 130px 260px" }}
              >
                <div>
                  <BK>{h.n}</BK>
                  <p className="v2-tighter mt-2 text-[20px] font-light leading-snug text-[var(--v2-ink-900)]" style={{ textWrap: "pretty" }}>
                    {h.text}
                  </p>
                </div>
                <div>
                  <BK>Уже</BK>
                  <p className="v2-tnum mt-1.5 text-[14px] text-[var(--v2-ink-700)]">{h.has}</p>
                </div>
                <div>
                  <BK cls="text-[var(--v2-brand-600)]">Нужно</BK>
                  <p className="v2-tight mt-1.5 text-[14px] leading-relaxed text-[var(--v2-ink-800)]">{h.need}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <BK>Идеи из backlog</BK>
            <div className="mt-3 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))" }}>
              {doc.backlog.map((b, i) => (
                <div key={i} className="rounded-2xl bg-white px-5 py-4 shadow-[var(--v2-shadow-card)]">
                  <p className="v2-tight text-[14.5px] leading-snug text-[var(--v2-ink-900)]">{b.t}</p>
                  <p className="v2-tight mt-1.5 text-[12.5px] text-[var(--v2-ink-400)]">→ {b.d}</p>
                </div>
              ))}
            </div>
            <Link
              href={appPath("/v2/personal/ideas")}
              className="v2-tight mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium"
            >
              Открыть все идеи <V2Icons.arrowR className="h-3.5 w-3.5" />
            </Link>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-12 h-11 rounded-xl bg-[var(--v2-ink-900)] px-6 text-[13.5px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)]"
          >
            Вернуться
          </button>
        </div>
      </div>
    </div>
  );
}
