"use client";

import { appPath } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type {
  BrandDoc,
  BrandLabItem,
  BrandSignal,
  BrandVideo,
} from "@/lib/v2/personal/seeds/brand-seed";
import { normalizeBrandDoc } from "@/lib/v2/personal/seeds/brand-seed";
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

const VIDEO_STATUSES = ["Idea", "Script", "Ready", "Опубликован"];

function IcClose(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className}>
      <path d="m6.5 6.5 11 11m0-11-11 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
  const [videoId, setVideoId] = useState<string | null>(null);
  const [insightOpen, setInsightOpen] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const [videoModal, setVideoModal] = useState(false);
  const [hypModal, setHypModal] = useState(false);
  const [dirOpen, setDirOpen] = useState<string | null>("crisis");
  const [labFilter, setLabFilter] = useState<"all" | "insight" | "hypothesis">("all");

  const saveDoc = useCallback(async (next: BrandDoc) => {
    const normalized = normalizeBrandDoc(next);
    setDoc(normalized);
    setSaving(true);
    setError(null);
    try {
      const res = await fetchJson<{ doc: BrandDoc }>("/api/v2/personal/life-docs/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc: normalized }),
      });
      setDoc(normalizeBrandDoc(res.doc));
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
        if (!cancelled) setDoc(normalizeBrandDoc(res.doc));
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
  const current = videoId ? doc.videos.find((v) => v.id === videoId) : null;

  const addInsight = async (t: string, src: string, power: number) => {
    const item: BrandLabItem = {
      id: uid("lab"),
      kind: "insight",
      text: t.trim(),
      note: src.trim(),
      power,
      createdAt: new Date().toISOString(),
      status: "open",
    };
    await saveDoc({
      ...doc,
      insights: [{ t: item.text, src: item.note, power }, ...doc.insights],
      labBacklog: [item, ...(doc.labBacklog ?? [])],
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
    const item: BrandLabItem = {
      id: uid("lab"),
      kind: "hypothesis",
      text: main.trim(),
      note: why.trim(),
      createdAt: new Date().toISOString(),
      status: "open",
    };
    await saveDoc({
      ...doc,
      labBacklog: [item, ...(doc.labBacklog ?? [])],
    });
    setHypModal(false);
  };

  const promoteHypFromBacklog = async (item: BrandLabItem) => {
    if (item.kind !== "hypothesis") return;
    const archived = {
      period: doc.hyp.start || "Архив",
      text: doc.hyp.main,
      why: item.note || "Смена гипотезы из бэклога.",
      data: `Статус был: ${doc.hyp.status}`,
    };
    const evolution = doc.evolution.map((e) => ({ ...e, now: false }));
    await saveDoc({
      ...doc,
      hyp: {
        ...doc.hyp,
        main: item.text,
        status: "Проверяем",
        start: new Date().toLocaleDateString("ru-RU"),
      },
      evolution: [
        ...evolution.filter((e) => !e.now),
        archived,
        {
          period: "Текущая гипотеза",
          text: item.text,
          why: item.note || "Поднята из бэклога.",
          data: "Из бэклога.",
          now: true,
        },
      ],
      labBacklog: (doc.labBacklog ?? []).map((x) =>
        x.id === item.id ? { ...x, status: "done" as const } : x
      ),
    });
  };

  const setLabItemStatus = async (id: string, status: BrandLabItem["status"]) => {
    await saveDoc({
      ...doc,
      labBacklog: (doc.labBacklog ?? []).map((x) => (x.id === id ? { ...x, status } : x)),
    });
  };

  const removeLabItem = async (id: string) => {
    await saveDoc({
      ...doc,
      labBacklog: (doc.labBacklog ?? []).filter((x) => x.id !== id),
    });
  };

  const saveVideo = async (id: string, patch: Partial<BrandVideo>) => {
    await saveDoc({
      ...doc,
      videos: doc.videos.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    });
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-24 pt-6">
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

        <BSect
          title="Бэклог"
          sub="Инсайты и гипотезы с шапки страницы. Гипотезу можно поднять в текущую, когда она созреет."
          right={
            <div className="inline-flex items-center rounded-full bg-white p-1 shadow-[var(--v2-shadow-card)]">
              {(
                [
                  ["all", "Все"],
                  ["insight", "Инсайты"],
                  ["hypothesis", "Гипотезы"],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setLabFilter(k)}
                  className={`v2-tight h-7 rounded-full px-3.5 text-[12px] font-medium transition ${
                    labFilter === k
                      ? "bg-[var(--v2-ink-900)] text-white"
                      : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          }
        >
          {(() => {
            const items = (doc.labBacklog ?? []).filter(
              (x) => labFilter === "all" || x.kind === labFilter
            );
            const openCount = items.filter((x) => x.status === "open").length;
            if (!items.length) {
              return (
                <div className="rounded-[24px] border border-dashed border-[var(--v2-ink-200)] bg-white/70 px-8 py-12 text-center">
                  <p className="v2-tighter text-[22px] font-light text-[var(--v2-ink-800)]">Пока пусто</p>
                  <p className="v2-tight mx-auto mt-2 max-w-[42ch] text-[14px] text-[var(--v2-ink-500)]">
                    Добавьте инсайт аудитории или гипотезу кнопками сверху — они появятся здесь.
                  </p>
                </div>
              );
            }
            return (
              <div className="overflow-hidden rounded-[24px] bg-white shadow-[var(--v2-shadow-soft)]">
                <div className="flex items-center justify-between gap-4 border-b border-[var(--v2-ink-100)] px-7 py-4">
                  <BK cls="text-[var(--v2-ink-500)]">Записи лаборатории</BK>
                  <span className="v2-tnum text-[12.5px] text-[var(--v2-ink-400)]">
                    {openCount} открытых · {items.length} всего
                  </span>
                </div>
                <div className="divide-y divide-[var(--v2-ink-100)]">
                  {items.map((item) => {
                    const isHyp = item.kind === "hypothesis";
                    const done = item.status === "done";
                    return (
                      <div
                        key={item.id}
                        className={`group grid items-start gap-5 px-7 py-5 transition ${
                          done ? "bg-[var(--v2-ink-50)]/50 opacity-70" : "hover:bg-[var(--v2-ink-50)]/40"
                        }`}
                        style={{ gridTemplateColumns: "112px minmax(0,1fr) auto" }}
                      >
                        <div className="pt-0.5">
                          <span
                            className={`inline-flex h-7 items-center rounded-full px-2.5 text-[11px] font-semibold ${
                              isHyp
                                ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {isHyp ? "Гипотеза" : "Инсайт"}
                          </span>
                          {typeof item.power === "number" ? (
                            <p className="v2-tight mt-2 text-[11px] text-[var(--v2-ink-400)]">
                              {POWER[Math.max(0, Math.min(3, item.power - 1))] ?? "сигнал"}
                            </p>
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`v2-tight text-[16px] font-light leading-snug text-[var(--v2-ink-900)] ${
                              done ? "line-through decoration-[var(--v2-ink-300)]" : ""
                            }`}
                            style={{ textWrap: "pretty" }}
                          >
                            «{item.text}»
                          </p>
                          {item.note ? (
                            <p className="v2-tight mt-2 text-[13px] text-[var(--v2-ink-500)]">{item.note}</p>
                          ) : null}
                          <p className="v2-tnum mt-2 text-[11.5px] text-[var(--v2-ink-400)]">
                            {new Date(item.createdAt).toLocaleDateString("ru-RU", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                            {done ? " · взято в работу" : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5 opacity-0 transition group-hover:opacity-100">
                          {isHyp && !done ? (
                            <button
                              type="button"
                              onClick={() => void promoteHypFromBacklog(item)}
                              className="v2-tight h-8 rounded-lg bg-[var(--v2-ink-900)] px-3 text-[12px] font-medium text-white"
                            >
                              Сделать текущей
                            </button>
                          ) : null}
                          {!done ? (
                            <button
                              type="button"
                              onClick={() => void setLabItemStatus(item.id, "done")}
                              className="v2-tight h-8 rounded-lg px-3 text-[12px] font-medium text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-800)]"
                            >
                              Готово
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void setLabItemStatus(item.id, "open")}
                              className="v2-tight h-8 rounded-lg px-3 text-[12px] font-medium text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-800)]"
                            >
                              Вернуть
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void removeLabItem(item.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--v2-ink-300)] hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-800)]"
                            title="Удалить"
                          >
                            <V2Icons.trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </BSect>

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
      </div>

      {current ? (
        <VideoDrawer
          v={current}
          dirName={dirName}
          onClose={() => setVideoId(null)}
          onSave={(patch) => void saveVideo(current.id, patch)}
        />
      ) : null}
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
          <section>
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
            Попадёт в бэклог. Текущую гипотезу не заменит — поднять можно оттуда.
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
            <span className={labCls}>Заметка / почему</span>
            <input value={why} onChange={(e) => setWhy(e.target.value)} className={fieldCls} placeholder="Откуда идея, какие данные" />
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
            В бэклог
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
