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
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";

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

/** Сворачивать только очень длинные записи — обычная заметка всегда целиком. */
const COLLAPSE_AFTER_CHARS = 2200;

function rebuildTagCounts(observations: PersonalObservation[]): PersonalObservationTag[] {
  const map = new Map<string, number>();
  for (const o of observations) {
    for (const t of o.tags) map.set(t, (map.get(t) || 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
    .map(([name, count]) => ({ id: name, name, count }));
}

function displayText(it: PersonalObservation): string {
  const title = it.title.trim();
  const body = it.body.trim();
  if (!body) return title;
  if (!title) return body;
  const first = body.split("\n")[0]?.trim() ?? "";
  if (first === title || body.startsWith(title)) return body;
  return `${title}\n\n${body}`;
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
  const [periodReady, setPeriodReady] = useState(false);
  const [tag, setTag] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [extraKnownTags, setExtraKnownTags] = useState<string[]>([]);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const rememberTag = useCallback((name: string) => {
    const v = name.trim().replace(/^#/, "").toLowerCase();
    if (!v) return;
    setExtraKnownTags((prev) => (prev.includes(v) ? prev : [...prev, v]));
  }, []);

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
      if (e.key === "Escape") setExportOpen(false);
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

  useEffect(() => {
    if (!board || periodReady) return;
    if (periodOptions[0]) setPeriod(periodOptions[0]);
    setPeriodReady(true);
  }, [board, periodOptions, periodReady]);

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
  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of board?.tags ?? []) map.set(t.name, t.count);
    for (const name of extraKnownTags) {
      if (!map.has(name)) map.set(name, 0);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"));
  }, [board, extraKnownTags]);
  const knownTags = useMemo(
    () => tagCounts.map(([n]) => n),
    [tagCounts]
  );

  const monthStats = useMemo(() => {
    const all = board?.observations ?? [];
    const key = period !== "all" ? period : periodOptions[0] || "";
    if (!key) {
      return { key: "", month: "—", total: all.length, prevMonth: "", prevTotal: 0 };
    }
    const idx = periodOptions.indexOf(key);
    const prevKey = idx >= 0 ? periodOptions[idx + 1] : "";
    return {
      key,
      month: monthLabel(key),
      total: all.filter((o) => monthKey(o.observed_at) === key).length,
      prevMonth: prevKey ? monthLabel(prevKey) : "",
      prevTotal: prevKey ? all.filter((o) => monthKey(o.observed_at) === prevKey).length : 0,
    };
  }, [board, period, periodOptions]);

  const periodIndex = period === "all" ? -1 : periodOptions.indexOf(period);
  const canNewer = period === "all" ? periodOptions.length > 0 : periodIndex > 0;
  const canOlder = period === "all" ? periodOptions.length > 0 : periodIndex >= 0 && periodIndex < periodOptions.length - 1;

  const goNewer = () => {
    if (period === "all") {
      if (periodOptions[0]) setPeriod(periodOptions[0]);
      return;
    }
    if (canNewer) setPeriod(periodOptions[periodIndex - 1]!);
  };
  const goOlder = () => {
    if (period === "all") {
      if (periodOptions[0]) setPeriod(periodOptions[0]);
      return;
    }
    if (canOlder) setPeriod(periodOptions[periodIndex + 1]!);
  };

  const create = async (payload: {
    type: ObservationType;
    title: string;
    text: string;
    tags: string[];
    link?: string;
    why?: string;
  }): Promise<boolean> => {
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
      setBoard((prev) => {
        if (!prev) return prev;
        const observations = [res.observation, ...prev.observations.filter((o) => o.id !== res.observation.id)];
        return {
          ...prev,
          observations,
          tags: rebuildTagCounts(observations),
          counts: {
            ...prev.counts,
            all: observations.length,
            [res.observation.type]: (prev.counts[res.observation.type] || 0) + 1,
          },
        };
      });
      setOpenIds((ids) => [...ids, res.observation.id]);
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const update = async (
    id: string,
    payload: { type: ObservationType; title: string; text: string; tags: string[]; link?: string; why?: string }
  ): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetchJson<{ observation: PersonalObservation }>(`/api/v2/personal/observations/${id}`, {
        method: "PATCH",
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
      setBoard((prev) => {
        if (!prev) return prev;
        const observations = prev.observations.map((o) => (o.id === id ? res.observation : o));
        return { ...prev, observations, tags: rebuildTagCounts(observations) };
      });
      setEditingId(null);
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Удалить запись?")) return;
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
              Дневник
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
              onClick={() => {
                composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                composerRef.current?.focus();
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)]"
            >
              <V2Icons.plus className="h-4 w-4" /> Запись
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
          <div className="flex items-center gap-1 rounded-full bg-white py-0.5 pl-1 pr-1 shadow-[var(--v2-shadow-card)]">
            <button
              type="button"
              onClick={goOlder}
              disabled={!canOlder}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--v2-ink-600)] transition hover:bg-[var(--v2-ink-50)] disabled:opacity-30"
              title="Предыдущий месяц"
            >
              <span className="text-[15px] leading-none">‹</span>
            </button>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="v2-tight h-7 min-w-[9.5rem] cursor-pointer appearance-none bg-transparent px-1 text-center text-[12.5px] font-medium text-[var(--v2-ink-800)] outline-none"
            >
              <option value="all">Все месяцы</option>
              {periodOptions.map((k) => (
                <option key={k} value={k}>
                  {monthLabel(k)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={goNewer}
              disabled={!canNewer}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--v2-ink-600)] transition hover:bg-[var(--v2-ink-50)] disabled:opacity-30"
              title="Следующий месяц"
            >
              <span className="text-[15px] leading-none">›</span>
            </button>
          </div>
        </div>

        <div className="grid items-start gap-6" style={{ gridTemplateColumns: "minmax(0,1fr) 300px" }}>
            <div className="flex min-w-0 flex-col gap-4">
              <Composer
                knownTags={knownTags}
                defaultType={type === "all" ? "other" : type}
                saving={saving}
                textareaRef={composerRef}
                onCreate={(p) => create(p)}
                onTagAdded={rememberTag}
              />
              {loading && !board ? (
                <p className="v2-tight px-1 text-[14px] text-[var(--v2-ink-500)]">Загрузка…</p>
              ) : (
              <section className="rounded-2xl bg-white px-7 py-3 shadow-[var(--v2-shadow-soft)]">
              <div className="relative">
                <span className="absolute bottom-8 left-[4.5px] top-8 w-px bg-[var(--v2-ink-200)]" />
                <div className="relative divide-y divide-[var(--v2-ink-100)]">
                  {list.map((it, i) => {
                    const t = OBSERVATION_TYPE_META[it.type];
                    const text = displayText(it);
                    const isLong = text.length > COLLAPSE_AFTER_CHARS;
                    const open = !isLong || openIds.includes(it.id);
                    const shown = open ? text : `${text.slice(0, COLLAPSE_AFTER_CHARS).trimEnd()}…`;
                    const editing = editingId === it.id;
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
                          <div className="ml-auto flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setEditingId(editing ? null : it.id)}
                              className="v2-tight text-[11.5px] text-[var(--v2-ink-400)] hover:text-[var(--v2-ink-900)]"
                            >
                              {editing ? "Закрыть" : "Редактировать"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void remove(it.id)}
                              className="v2-tight text-[11.5px] text-[var(--v2-ink-300)] hover:text-red-600"
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                        {editing ? (
                          <div className="mt-3">
                            <Composer
                              knownTags={knownTags}
                              onTagAdded={rememberTag}
                              defaultType={it.type}
                              saving={saving}
                              initial={{
                                text: it.body,
                                type: it.type,
                                tags: it.tags,
                                title: it.title,
                                link: it.link_key ?? "",
                                why: it.why,
                              }}
                              submitLabel="Сохранить"
                              onCreate={(p) => update(it.id, p)}
                            />
                          </div>
                        ) : (
                          <>
                            <h3
                              className="v2-tight mt-2.5 max-w-[62ch] whitespace-pre-wrap text-[20px] font-semibold leading-[1.35] text-[var(--v2-ink-900)]"
                              style={{ textWrap: "pretty" }}
                            >
                              {shown}
                            </h3>
                            {isLong ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenIds((p) => (p.includes(it.id) ? p.filter((x) => x !== it.id) : [...p, it.id]))
                                }
                                className="v2-tight mt-2.5 text-[12.5px] font-medium text-[var(--v2-brand-700)] hover:text-[var(--v2-brand-800)]"
                              >
                                {open ? "Свернуть" : "Читать дальше"}
                              </button>
                            ) : null}
                            {it.why ? (
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
                          </>
                        )}
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
              )}
            </div>

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
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={goOlder}
                    disabled={!canOlder}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 disabled:opacity-25"
                    title="Предыдущий месяц"
                  >
                    ‹
                  </button>
                  <div className="min-w-0 flex-1 text-center text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/45">
                    {period === "all" ? "Все месяцы" : monthStats.month}
                  </div>
                  <button
                    type="button"
                    onClick={goNewer}
                    disabled={!canNewer}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 disabled:opacity-25"
                    title="Следующий месяц"
                  >
                    ›
                  </button>
                </div>
                <p className="v2-tight mt-2 text-[16px] leading-snug">
                  {period === "all" ? (
                    <>
                      Всего <span className="v2-tnum">{board?.observations.length ?? 0}</span> записей.
                    </>
                  ) : (
                    <>
                      За этот месяц накопилось <span className="v2-tnum">{monthStats.total}</span> записей.
                    </>
                  )}
                </p>
                {period !== "all" && monthStats.prevMonth ? (
                  <p className="v2-tight v2-tnum mt-1.5 text-[13px] text-white/55">
                    В {monthStats.prevMonth.toLowerCase()} было {monthStats.prevTotal}.
                  </p>
                ) : null}
                <p className="v2-tight mt-4 border-t border-white/10 pt-4 text-[13.5px]">
                  Есть ли здесь что-то, что меняет твою стратегию?
                </p>
              </section>

              <p className="v2-tight px-1 text-[12px] leading-relaxed text-[var(--v2-ink-400)]">
                Записывать каждый день не нужно. Если месяц ничего не произошло — страница может месяц не меняться.
              </p>
            </div>
          </div>
      </div>

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

function Composer({
  knownTags,
  defaultType,
  saving,
  textareaRef,
  onCreate,
  onTagAdded,
  initial,
  submitLabel = "Опубликовать",
}: {
  knownTags: string[];
  defaultType: ObservationType;
  saving: boolean;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  initial?: {
    text: string;
    type: ObservationType;
    tags: string[];
    title: string;
    link: string;
    why: string;
  };
  submitLabel?: string;
  onTagAdded?: (name: string) => void;
  onCreate: (p: {
    type: ObservationType;
    title: string;
    text: string;
    tags: string[];
    link?: string;
    why?: string;
  }) => Promise<boolean>;
}) {
  const [text, setText] = useState(initial?.text ?? "");
  const [type, setType] = useState<ObservationType>(initial?.type ?? defaultType);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [draft, setDraft] = useState("");
  const [more, setMore] = useState(Boolean(initial?.title || initial?.link || initial?.why));
  const [title, setTitle] = useState(initial?.title ?? "");
  const [link, setLink] = useState(initial?.link ?? "");
  const [why, setWhy] = useState(initial?.why ?? "");
  const localRef = useRef<HTMLTextAreaElement>(null);
  const areaRef = textareaRef ?? localRef;

  useEffect(() => {
    if (!text.trim()) setType(defaultType);
  }, [defaultType, text]);

  const addTag = (t: string) => {
    const v = t.trim().replace(/^#/, "").toLowerCase().slice(0, 48);
    if (!v) return;
    setTags((prev) => (prev.includes(v) ? prev : [...prev, v]));
    onTagAdded?.(v);
    setDraft("");
  };

  const tagsForSave = () => {
    const pending = draft.trim().replace(/^#/, "").toLowerCase().slice(0, 48);
    if (pending && !tags.includes(pending)) {
      onTagAdded?.(pending);
      return [...tags, pending];
    }
    return tags;
  };

  const suggestions = knownTags
    .filter((t) => !tags.includes(t) && (!draft || t.includes(draft.toLowerCase().replace(/^#/, ""))))
    .slice(0, 12);

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 52), 280)}px`;
  };

  useEffect(() => {
    if (areaRef.current) grow(areaRef.current);
  }, [areaRef]);

  const submit = async () => {
    const body = text.trim();
    if (!body || saving) return;
    const ok = await onCreate({
      type,
      title: title.trim() || body.split("\n")[0]!.slice(0, 70),
      text: body,
      tags: tagsForSave(),
      link: link || undefined,
      why: why.trim() || undefined,
    });
    if (!ok) return;
    if (initial) return;
    setText("");
    setTags([]);
    setDraft("");
    setTitle("");
    setLink("");
    setWhy("");
    setMore(false);
    if (areaRef.current) {
      areaRef.current.style.height = "52px";
      areaRef.current.focus();
    }
  };

  return (
    <section className="rounded-2xl bg-white px-5 py-4 shadow-[var(--v2-shadow-soft)]">
      <textarea
        ref={areaRef}
        value={text}
        rows={2}
        placeholder="Что произошло?"
        onChange={(e) => {
          setText(e.target.value);
          grow(e.target);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submit();
          }
        }}
        className="v2-tight w-full resize-none bg-transparent text-[15.5px] leading-[1.55] text-[var(--v2-ink-900)] outline-none placeholder:text-[var(--v2-ink-400)]"
        style={{ minHeight: 52 }}
      />
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--v2-ink-100)] pt-3">
        {(Object.keys(OBSERVATION_TYPE_META) as ObservationType[]).map((id) => {
          const t = OBSERVATION_TYPE_META[id];
          const on = type === id;
          return (
            <button
              key={id}
              type="button"
              title={t.label}
              onClick={() => setType(id)}
              className={`v2-tight inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-medium transition ${
                on ? "" : "bg-[var(--v2-ink-50)] text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-100)]"
              }`}
              style={on ? { background: t.bg, color: t.tint } : undefined}
            >
              <span className="text-[12px] leading-none">{t.emoji}</span>
              <span className="hidden sm:inline">{t.short}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <div className="flex min-h-[36px] min-w-[180px] flex-1 flex-wrap items-center gap-1.5 rounded-xl bg-[var(--v2-ink-50)] px-2.5 py-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="v2-tight inline-flex h-6 items-center gap-1 rounded-md bg-[var(--v2-ink-900)] pl-1.5 pr-0.5 text-[11.5px] font-medium text-white"
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
            onBlur={() => {
              if (draft.trim()) addTag(draft);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
                if (draft.trim()) {
                  e.preventDefault();
                  addTag(draft);
                }
              }
              if (e.key === "Backspace" && !draft && tags.length) setTags(tags.slice(0, -1));
            }}
            placeholder={tags.length ? "" : "Тег… Enter"}
            className="v2-tight h-6 min-w-[80px] flex-1 bg-transparent text-[13px] text-[var(--v2-ink-900)] outline-none placeholder:text-[var(--v2-ink-400)]"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            if (draft.trim()) addTag(draft);
          }}
          className="v2-tight h-9 rounded-xl px-3 text-[12.5px] font-medium text-[var(--v2-ink-500)] transition hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-800)]"
        >
          + тег
        </button>
        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          className="v2-tight h-9 rounded-xl px-3 text-[12.5px] font-medium text-[var(--v2-ink-500)] transition hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-800)]"
        >
          {more ? "Свернуть" : "Ещё"}
        </button>
        <button
          type="button"
          disabled={!text.trim() || saving}
          onClick={() => void submit()}
          className="v2-tight ml-auto h-9 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-medium text-white transition hover:bg-[var(--v2-ink-700)] disabled:opacity-35 disabled:hover:bg-[var(--v2-ink-900)]"
        >
          {saving ? "…" : submitLabel}
        </button>
      </div>
      {suggestions.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((t) => (
            <button
              key={t}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(t)}
              className="v2-tight inline-flex h-[26px] items-center gap-1 rounded-md bg-[var(--v2-ink-100)] px-2 text-[11.5px] font-medium text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
            >
              <span className="text-[var(--v2-ink-400)]">#</span>
              {t}
            </button>
          ))}
        </div>
      ) : null}
      {more ? (
        <div className="mt-3 grid gap-2 border-t border-[var(--v2-ink-100)] pt-3 sm:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заголовок — необязательно"
            className="v2-tight h-9 rounded-xl bg-[var(--v2-ink-50)] px-3 text-[13px] text-[var(--v2-ink-900)] outline-none placeholder:text-[var(--v2-ink-400)] sm:col-span-2"
          />
          <div className="relative">
            <select
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="v2-tight h-9 w-full cursor-pointer appearance-none rounded-xl bg-[var(--v2-ink-50)] pl-3 pr-8 text-[13px] text-[var(--v2-ink-800)] outline-none"
            >
              <option value="">Без связи</option>
              {Object.entries(OBSERVATION_LINKS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <IcChev className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--v2-ink-400)]" />
          </div>
          <input
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="Почему интересно"
            className="v2-tight h-9 rounded-xl bg-[var(--v2-ink-50)] px-3 text-[13px] text-[var(--v2-ink-900)] outline-none placeholder:text-[var(--v2-ink-400)]"
          />
        </div>
      ) : null}
    </section>
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
