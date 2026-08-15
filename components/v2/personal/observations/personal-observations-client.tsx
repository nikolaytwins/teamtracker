"use client";

import { appPath } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  OBSERVATION_FILTER_TYPES,
  OBSERVATION_LINKS,
  OBSERVATION_TYPE_META,
  type ObservationType,
} from "@/lib/v2/personal/observations-meta";
import type {
  PersonalObservation,
  PersonalObservationTag,
} from "@/lib/v2/personal/personal-observations-repo";
import { V2Icons } from "@/components/v2/ui/icons";
import { useCallback, useEffect, useMemo, useState } from "react";

function IcClose(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className}>
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IcLink(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className}>
      <path
        d="M10.5 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 1 0-5.7-5.7l-1 1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M13.5 10.5a4 4 0 0 0-5.7 0L5.5 12.8a4 4 0 1 0 5.7 5.7l1-1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IcTag(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className}>
      <path
        d="M4 10.5V5.6A1.6 1.6 0 0 1 5.6 4h4.9c.4 0 .8.2 1.1.5l7.9 7.9a1.6 1.6 0 0 1 0 2.2l-4.8 4.8a1.6 1.6 0 0 1-2.2 0L4.5 11.6a1.6 1.6 0 0 1-.5-1.1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
    </svg>
  );
}

function IcChev(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className}>
      <path d="m8 10 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatDateFull(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function monthKey(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

type Board = {
  observations: PersonalObservation[];
  tags: PersonalObservationTag[];
  counts: Record<string, number>;
};

export function PersonalObservationsClient() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<ObservationType | "all">("all");
  const [link, setLink] = useState("all");
  const [period, setPeriod] = useState("all");
  const [tag, setTag] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<Board>("/api/v2/personal/observations");
      setBoard(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAdding(false);
        setExportOpen(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const periodOptions = useMemo(() => {
    const keys = new Set<string>();
    for (const o of board?.observations ?? []) {
      const k = monthKey(o.observed_at);
      if (k) keys.add(k);
    }
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [board]);

  const list = useMemo(() => {
    const items = board?.observations ?? [];
    return items.filter((i) => {
      if (type !== "all" && i.type !== type) return false;
      if (link !== "all" && i.link_key !== link) return false;
      if (tag && !i.tags.includes(tag)) return false;
      if (period !== "all" && monthKey(i.observed_at) !== period) return false;
      if (q.trim()) {
        const hay = `${i.title} ${i.body} ${i.why} ${i.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [board, type, link, tag, period, q]);

  const counts = board?.counts ?? { all: 0 };
  const tagCounts = (board?.tags ?? []).map((t) => [t.name, t.count] as [string, number]);
  const knownTags = useMemo(
    () => Array.from(new Set(tagCounts.map(([n]) => n))),
    [tagCounts]
  );

  const monthStats = useMemo(() => {
    const now = new Date();
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    const all = board?.observations ?? [];
    return {
      month: monthLabel(cur),
      total: all.filter((o) => monthKey(o.observed_at) === cur).length,
      prevMonth: monthLabel(prev),
      prevTotal: all.filter((o) => monthKey(o.observed_at) === prev).length,
    };
  }, [board]);

  const create = async (payload: {
    type: ObservationType;
    title: string;
    text: string;
    tags: string[];
    link?: string;
    why?: string;
  }) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetchJson<{ observation: PersonalObservation }>("/api/v2/personal/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: payload.type,
          title: payload.title,
          body: payload.text,
          tags: payload.tags,
          linkKey: payload.link || null,
          why: payload.why || "",
        }),
      });
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              observations: [res.observation, ...prev.observations],
              counts: {
                ...prev.counts,
                all: (prev.counts.all || 0) + 1,
                [res.observation.type]: (prev.counts[res.observation.type] || 0) + 1,
              },
            }
          : prev
      );
      setOpenIds((ids) => [...ids, res.observation.id]);
      await load();
      setAdding(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Удалить наблюдение?")) return;
    try {
      await fetchJson(`/api/v2/personal/observations/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить");
    }
  };

  const exportHref = (format: "md" | "json" | "jsonl") => {
    const sp = new URLSearchParams();
    sp.set("format", format);
    if (type !== "all") sp.set("type", type);
    if (link !== "all") sp.set("link", link);
    if (tag) sp.set("tag", tag);
    if (period !== "all") {
      const [y, m] = period.split("-").map(Number);
      if (y && m) {
        const from = new Date(y, m - 1, 1);
        const to = new Date(y, m, 0, 23, 59, 59, 999);
        sp.set("from", from.toISOString());
        sp.set("to", to.toISOString());
      }
    }
    if (q.trim()) sp.set("q", q.trim());
    return appPath(`/api/v2/personal/observations/export?${sp.toString()}`);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-24 pt-6">
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 max-w-[62ch]">
            <h1 className="v2-tighter text-[42px] font-semibold leading-[1.02] text-[var(--v2-ink-900)]">
              Наблюдения
            </h1>
            <p className="v2-tight mt-2.5 text-[14.5px] text-[var(--v2-ink-500)]" style={{ textWrap: "pretty" }}>
              Не выводы о всей жизни. Просто то, что реально произошло и может оказаться значимым.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="flex h-10 w-[210px] items-center gap-2 rounded-xl bg-white px-3 shadow-[var(--v2-shadow-card)]">
              <V2Icons.search className="h-[15px] w-[15px] shrink-0 text-[var(--v2-ink-400)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск"
                className="v2-tight min-w-0 flex-1 bg-transparent text-[13px] text-[var(--v2-ink-900)] outline-none placeholder:text-[var(--v2-ink-400)]"
              />
            </div>
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-[13px] font-medium text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
            >
              Экспорт
            </button>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)]"
            >
              <V2Icons.plus className="h-4 w-4" /> Наблюдение
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
        ) : null}

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setType("all")}
            className={`v2-tight inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition ${
              type === "all"
                ? "bg-[var(--v2-ink-900)] text-white shadow-[var(--v2-shadow-card)]"
                : "bg-white text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] hover:shadow-[var(--v2-shadow-cardHv)]"
            }`}
          >
            Все
            <span className={`v2-tnum text-[11px] ${type === "all" ? "text-white/60" : "text-[var(--v2-ink-400)]"}`}>
              {counts.all || 0}
            </span>
          </button>
          {OBSERVATION_FILTER_TYPES.map((id) => {
            const active = type === id;
            const t = OBSERVATION_TYPE_META[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => setType(id)}
                className={`v2-tight inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition ${
                  active
                    ? "bg-[var(--v2-ink-900)] text-white shadow-[var(--v2-shadow-card)]"
                    : "bg-white text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] hover:shadow-[var(--v2-shadow-cardHv)]"
                }`}
              >
                <span className="text-[11px] leading-none">{t.emoji}</span>
                {t.short}
                <span className={`v2-tnum text-[11px] ${active ? "text-white/60" : "text-[var(--v2-ink-400)]"}`}>
                  {counts[id] || 0}
                </span>
              </button>
            );
          })}
          <span className="mx-1 h-5 w-px bg-[var(--v2-ink-200)]" />
          <div className="relative">
            <select
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="v2-tight h-8 cursor-pointer appearance-none rounded-full bg-white pl-3 pr-8 text-[12.5px] font-medium text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] outline-none"
            >
              <option value="all">Проект: все</option>
              {Object.entries(OBSERVATION_LINKS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <IcChev className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--v2-ink-400)]" />
          </div>
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="v2-tight h-8 cursor-pointer appearance-none rounded-full bg-white pl-3 pr-8 text-[12.5px] font-medium text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] outline-none"
            >
              <option value="all">Период: всё</option>
              {periodOptions.map((k) => (
                <option key={k} value={k}>
                  {monthLabel(k)}
                </option>
              ))}
            </select>
            <IcChev className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--v2-ink-400)]" />
          </div>
        </div>

        {loading && !board ? (
          <p className="v2-tight text-[14px] text-[var(--v2-ink-500)]">Загрузка…</p>
        ) : (
          <div className="grid items-start gap-6" style={{ gridTemplateColumns: "minmax(0,1fr) 300px" }}>
            <section className="rounded-2xl bg-white px-7 py-3 shadow-[var(--v2-shadow-soft)]">
              <div className="relative">
                <span className="absolute bottom-8 left-[4.5px] top-8 w-px bg-[var(--v2-ink-200)]" />
                <div className="relative divide-y divide-[var(--v2-ink-100)]">
                  {list.map((it, i) => {
                    const t = OBSERVATION_TYPE_META[it.type];
                    const open = openIds.includes(it.id);
                    const paras = it.body.split(/\n\n+/).filter(Boolean);
                    const shown = open ? paras : paras.slice(0, 1);
                    return (
                      <article key={it.id} className="relative py-7 pl-7 pr-1" style={{ animationDelay: `${Math.min(i, 10) * 28}ms` }}>
                        <span
                          className="absolute left-0 top-[34px] h-2.5 w-2.5 rounded-full ring-4 ring-white"
                          style={{ background: t.tint }}
                        />
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em]"
                            style={{ color: t.tint }}
                          >
                            <span className="text-[12px] leading-none">{t.emoji}</span>
                            {t.label}
                          </span>
                          <span className="v2-tight text-[11.5px] text-[var(--v2-ink-400)]">
                            {formatDateFull(it.observed_at)}
                          </span>
                          <button
                            type="button"
                            onClick={() => void remove(it.id)}
                            className="v2-tight ml-auto text-[11.5px] text-[var(--v2-ink-300)] hover:text-red-600"
                          >
                            Удалить
                          </button>
                        </div>
                        <h3
                          className="v2-tight mt-2.5 max-w-[52ch] text-[20px] font-semibold leading-[1.25] text-[var(--v2-ink-900)]"
                          style={{ textWrap: "pretty" }}
                        >
                          {it.title}
                        </h3>
                        <div
                          className={`relative mt-3 flex max-w-[68ch] flex-col gap-3.5 ${open ? "" : "max-h-[132px] overflow-hidden"}`}
                        >
                          {shown.map((p, idx) => (
                            <p
                              key={idx}
                              className="v2-tight text-[15px] leading-[1.7] text-[var(--v2-ink-700)]"
                              style={{ textWrap: "pretty" }}
                            >
                              {p}
                            </p>
                          ))}
                          {!open && paras.length > 1 ? (
                            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white to-transparent" />
                          ) : null}
                        </div>
                        {paras.length > 1 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setOpenIds((p) => (p.includes(it.id) ? p.filter((x) => x !== it.id) : [...p, it.id]))
                            }
                            className="v2-tight mt-2.5 text-[12.5px] font-medium text-[var(--v2-brand-700)] hover:text-[var(--v2-brand-800)]"
                          >
                            {open ? "Свернуть" : `Читать дальше · ещё ${paras.length - 1} абз.`}
                          </button>
                        ) : null}
                        {it.why && open ? (
                          <p className="v2-tight mt-4 max-w-[62ch] border-l-2 border-[var(--v2-ink-200)] pl-3.5 text-[13.5px] leading-relaxed text-[var(--v2-ink-500)]">
                            Почему может быть интересно: {it.why}
                          </p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap items-center gap-1.5">
                          {it.tags.map((tg) => (
                            <button
                              key={tg}
                              type="button"
                              onClick={() => setTag(tag === tg ? null : tg)}
                              className={`v2-tight inline-flex h-[26px] items-center gap-1 rounded-md px-2 text-[11.5px] font-medium transition ${
                                tag === tg
                                  ? "bg-[var(--v2-ink-900)] text-white"
                                  : "bg-[var(--v2-ink-100)] text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-200)]/70 hover:text-[var(--v2-ink-900)]"
                              }`}
                            >
                              <span className={tag === tg ? "text-white/50" : "text-[var(--v2-ink-400)]"}>#</span>
                              {tg}
                            </button>
                          ))}
                          {it.link_key && OBSERVATION_LINKS[it.link_key] ? (
                            <span className="v2-tight inline-flex h-[26px] items-center gap-1.5 rounded-md bg-white px-2 text-[11.5px] font-medium text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)]">
                              <IcLink className="h-3 w-3 text-[var(--v2-ink-400)]" />
                              {OBSERVATION_LINKS[it.link_key]!.label}
                            </span>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
              {!list.length ? (
                <div className="v2-tight py-16 text-center text-[13.5px] text-[var(--v2-ink-400)]">
                  Ничего не найдено. Это нормально.
                </div>
              ) : null}
            </section>

            <div className="sticky top-4 flex flex-col gap-5">
              <section className="rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-card)]">
                <div className="flex items-center gap-2">
                  <IcTag className="h-[15px] w-[15px] text-[var(--v2-ink-400)]" />
                  <h2 className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">Теги</h2>
                  {tag ? (
                    <button
                      type="button"
                      onClick={() => setTag(null)}
                      className="v2-tight ml-auto text-[11.5px] text-[var(--v2-ink-500)] hover:text-[var(--v2-ink-900)]"
                    >
                      сбросить
                    </button>
                  ) : null}
                </div>
                <p className="v2-tight mt-1.5 text-[12px] text-[var(--v2-ink-500)]">
                  Ставишь сам. Повторяются те, что нужны.
                </p>
                <div className="mt-3.5 flex flex-col gap-0.5">
                  {tagCounts.length ? (
                    tagCounts.map(([name, n]) => {
                      const active = tag === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setTag(active ? null : name)}
                          className={`v2-tight -mx-1 flex h-8 items-center gap-2 rounded-lg px-2 text-[13px] transition ${
                            active
                              ? "bg-[var(--v2-ink-900)] text-white"
                              : "text-[var(--v2-ink-700)] hover:bg-[var(--v2-ink-50)]"
                          }`}
                        >
                          <span className={active ? "text-white/45" : "text-[var(--v2-ink-300)]"}>#</span>
                          <span className="flex-1 truncate text-left font-medium">{name}</span>
                          <span className={`v2-tnum text-[12px] ${active ? "text-white/60" : "text-[var(--v2-ink-400)]"}`}>
                            {n}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="v2-tight px-1 py-2 text-[12.5px] text-[var(--v2-ink-400)]">Пока нет тегов</p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl bg-[var(--v2-ink-900)] p-5 text-white shadow-[var(--v2-shadow-soft)]">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  Обзор за период · {monthStats.month}
                </div>
                <p className="v2-tight mt-2 text-[16px] leading-snug">
                  За этот месяц накопилось <span className="v2-tnum">{monthStats.total}</span> наблюдений.
                </p>
                <p className="v2-tight v2-tnum mt-1.5 text-[13px] text-white/55">
                  В {monthStats.prevMonth.toLowerCase()} было {monthStats.prevTotal}.
                </p>
                <p className="v2-tight mt-4 border-t border-white/10 pt-4 text-[13.5px]">
                  Есть ли здесь что-то, что меняет твою стратегию?
                </p>
              </section>

              <p className="v2-tight px-1 text-[12px] leading-relaxed text-[var(--v2-ink-400)]">
                Записывать каждый день не нужно. Если месяц ничего не произошло — страница может месяц не меняться.
              </p>
            </div>
          </div>
        )}
      </div>

      {adding ? (
        <AddModal
          knownTags={knownTags}
          saving={saving}
          onClose={() => setAdding(false)}
          onCreate={(p) => void create(p)}
        />
      ) : null}

      {exportOpen ? (
        <ExportModal
          onClose={() => setExportOpen(false)}
          hrefMd={exportHref("md")}
          hrefJson={exportHref("json")}
          hrefJsonl={exportHref("jsonl")}
          count={list.length}
        />
      ) : null}
    </div>
  );
}

function AddModal({
  knownTags,
  saving,
  onClose,
  onCreate,
}: {
  knownTags: string[];
  saving: boolean;
  onClose: () => void;
  onCreate: (p: {
    type: ObservationType;
    title: string;
    text: string;
    tags: string[];
    link?: string;
    why?: string;
  }) => void;
}) {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ObservationType>("loop");
  const [link, setLink] = useState("");
  const [why, setWhy] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  const addTag = (t: string) => {
    const v = t.trim().replace(/^#/, "").toLowerCase();
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setDraft("");
  };
  const suggestions = knownTags
    .filter((t) => !tags.includes(t) && (!draft || t.includes(draft.toLowerCase().replace(/^#/, ""))))
    .slice(0, 8);

  const today = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

  return (
    <div className="fade-in fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-[var(--v2-ink-900)]/30 backdrop-blur-sm" />
      <div
        className="relative max-h-[92vh] w-[620px] max-w-full overflow-y-auto rounded-2xl bg-white shadow-[var(--v2-shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-6 pb-4 pt-5">
          <div>
            <h3 className="v2-tight text-[19px] font-semibold text-[var(--v2-ink-900)]">Что произошло?</h3>
            <p className="v2-tight mt-0.5 text-[12.5px] text-[var(--v2-ink-500)]">
              Дата поставится сама — {today}. Пиши столько, сколько нужно.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--v2-ink-500)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
          >
            <IcClose className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-2.5 px-6">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заголовок одной строкой — необязательно"
            className="v2-tight h-11 w-full rounded-xl bg-[var(--v2-ink-50)] px-3.5 text-[15px] font-medium text-[var(--v2-ink-900)] outline-none transition placeholder:font-normal placeholder:text-[var(--v2-ink-400)] focus:bg-white focus:shadow-[var(--v2-shadow-card)]"
          />
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={9}
            placeholder="Что случилось, что заметил, какие детали. Абзацами, как в дневнике."
            className="v2-tight w-full resize-y rounded-xl bg-[var(--v2-ink-50)] px-3.5 py-3 text-[14.5px] leading-[1.7] text-[var(--v2-ink-900)] outline-none transition placeholder:text-[var(--v2-ink-400)] focus:bg-white focus:shadow-[var(--v2-shadow-card)]"
          />
        </div>
        <div className="px-6 pt-5">
          <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">Тип</div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(OBSERVATION_TYPE_META) as ObservationType[]).map((id) => {
              const t = OBSERVATION_TYPE_META[id];
              const on = type === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setType(id)}
                  className={`v2-tight inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-medium transition ${
                    on ? "" : "border-transparent bg-[var(--v2-ink-50)] text-[var(--v2-ink-700)] hover:bg-[var(--v2-ink-100)]"
                  }`}
                  style={on ? { background: t.bg, borderColor: t.border, color: t.tint } : undefined}
                >
                  <span className="text-[12px] leading-none">{t.emoji}</span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="px-6 pt-5">
          <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">Теги</div>
          <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-xl bg-[var(--v2-ink-50)] px-2.5 py-2">
            {tags.map((t) => (
              <span
                key={t}
                className="v2-tight inline-flex h-7 items-center gap-1 rounded-md bg-[var(--v2-ink-900)] pl-2 pr-1 text-[12px] font-medium text-white"
              >
                <span className="text-white/50">#</span>
                {t}
                <button
                  type="button"
                  onClick={() => setTags(tags.filter((x) => x !== t))}
                  className="inline-flex h-5 w-5 items-center justify-center rounded text-white/60 hover:text-white"
                >
                  <IcClose className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(draft);
                }
                if (e.key === "Backspace" && !draft && tags.length) setTags(tags.slice(0, -1));
              }}
              placeholder={tags.length ? "" : "vibecoding, аркалиум…"}
              className="v2-tight h-7 min-w-[120px] flex-1 bg-transparent text-[13px] text-[var(--v2-ink-900)] outline-none placeholder:text-[var(--v2-ink-400)]"
            />
          </div>
          {suggestions.length ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="v2-tight mr-0.5 text-[11.5px] text-[var(--v2-ink-400)]">Уже использовались:</span>
              {suggestions.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => addTag(t)}
                  className="v2-tight inline-flex h-[26px] items-center gap-1 rounded-md bg-[var(--v2-ink-100)] px-2 text-[11.5px] font-medium text-[var(--v2-ink-600)] transition hover:bg-[var(--v2-ink-200)]/70 hover:text-[var(--v2-ink-900)]"
                >
                  <span className="text-[var(--v2-ink-400)]">#</span>
                  {t}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3 px-6 pt-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
              Связать с <span className="font-normal normal-case tracking-normal text-[var(--v2-ink-300)]">— необязательно</span>
            </span>
            <div className="relative">
              <select
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="v2-tight h-9 w-full cursor-pointer appearance-none rounded-xl bg-[var(--v2-ink-50)] pl-3 pr-8 text-[13px] text-[var(--v2-ink-800)] outline-none"
              >
                <option value="">Ничего</option>
                {Object.entries(OBSERVATION_LINKS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
              <IcChev className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--v2-ink-400)]" />
            </div>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
              Почему интересно{" "}
              <span className="font-normal normal-case tracking-normal text-[var(--v2-ink-300)]">— необязательно</span>
            </span>
            <input
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="Одна строка"
              className="v2-tight h-9 rounded-xl bg-[var(--v2-ink-50)] px-3 text-[13px] text-[var(--v2-ink-900)] outline-none placeholder:text-[var(--v2-ink-400)]"
            />
          </label>
        </div>
        <div className="mt-5 flex items-center gap-3 bg-[var(--v2-ink-50)]/70 px-6 py-5">
          <span className="v2-tight text-[12px] text-[var(--v2-ink-400)]">Оценивать ничего не нужно.</span>
          <button
            type="button"
            disabled={!text.trim() || saving}
            onClick={() =>
              onCreate({
                type,
                title: title.trim() || text.trim().split("\n")[0]!.slice(0, 70),
                text: text.trim(),
                tags,
                link: link || undefined,
                why: why.trim() || undefined,
              })
            }
            className="v2-tight ml-auto h-10 rounded-xl bg-[var(--v2-ink-900)] px-5 text-[13px] font-medium text-white transition hover:bg-[var(--v2-ink-700)] disabled:opacity-35 disabled:hover:bg-[var(--v2-ink-900)]"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExportModal({
  onClose,
  hrefMd,
  hrefJson,
  hrefJsonl,
  count,
}: {
  onClose: () => void;
  hrefMd: string;
  hrefJson: string;
  hrefJsonl: string;
  count: number;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-[var(--v2-ink-900)]/30 backdrop-blur-sm" />
      <div
        className="relative w-[440px] max-w-full rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div>
            <h3 className="v2-tight text-[18px] font-semibold text-[var(--v2-ink-900)]">Экспорт для нейросети</h3>
            <p className="v2-tight mt-1 text-[13px] text-[var(--v2-ink-500)]">
              Скачает текущую выборку ({count} записей) с учётом типа, тега, связи и периода.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--v2-ink-400)] hover:bg-[var(--v2-ink-100)]"
          >
            <IcClose className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <a
            href={hrefMd}
            className="v2-tight flex h-11 items-center justify-between rounded-xl bg-[var(--v2-ink-50)] px-4 text-[13.5px] font-medium text-[var(--v2-ink-900)] no-underline transition hover:bg-[var(--v2-ink-100)]"
          >
            Markdown (.md)
            <span className="text-[12px] font-normal text-[var(--v2-ink-400)]">удобно в чат</span>
          </a>
          <a
            href={hrefJson}
            className="v2-tight flex h-11 items-center justify-between rounded-xl bg-[var(--v2-ink-50)] px-4 text-[13.5px] font-medium text-[var(--v2-ink-900)] no-underline transition hover:bg-[var(--v2-ink-100)]"
          >
            JSON
            <span className="text-[12px] font-normal text-[var(--v2-ink-400)]">структура + фильтр</span>
          </a>
          <a
            href={hrefJsonl}
            className="v2-tight flex h-11 items-center justify-between rounded-xl bg-[var(--v2-ink-50)] px-4 text-[13.5px] font-medium text-[var(--v2-ink-900)] no-underline transition hover:bg-[var(--v2-ink-100)]"
          >
            JSONL
            <span className="text-[12px] font-normal text-[var(--v2-ink-400)]">по строке на запись</span>
          </a>
        </div>
      </div>
    </div>
  );
}
