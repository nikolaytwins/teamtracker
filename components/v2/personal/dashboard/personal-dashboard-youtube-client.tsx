"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import type {
  BrandDoc,
  BrandSignal,
  BrandVideo,
  BrandVideoMetrics,
} from "@/lib/v2/personal/seeds/brand-seed";
import { normalizeBrandDoc } from "@/lib/v2/personal/seeds/brand-seed";
import { V2Icons } from "@/components/v2/ui/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SIG: Record<BrandSignal, { label: string; dots: number; tint: string }> = {
  very: { label: "Очень сильный", dots: 4, tint: "#0E9F6E" },
  strong: { label: "Сильный", dots: 3, tint: "#2A56EB" },
  medium: { label: "Средний", dots: 2, tint: "#B7791F" },
  weak: { label: "Слабый", dots: 1, tint: "#71717A" },
  none: { label: "Нет данных", dots: 0, tint: "#A1A1AA" },
};

const FILTERS = [
  { id: "all" as const, label: "Все" },
  { id: "pub" as const, label: "Опубликованные" },
  { id: "plan" as const, label: "В работе" },
];

const VIDEO_STATUSES = ["Idea", "Script", "Ready", "Опубликован"];
const SIG_CYCLE: BrandSignal[] = ["none", "weak", "medium", "strong", "very"];

type FilterId = (typeof FILTERS)[number]["id"];
type MetricKey = keyof Pick<BrandVideoMetrics, "v30" | "ctr" | "avp" | "subs" | "impressions" | "v24" | "v7" | "comments">;

function BK({ children, cls = "text-[var(--v2-ink-400)]" }: { children: React.ReactNode; cls?: string }) {
  return <span className={`font-mono text-[10.5px] uppercase tracking-[0.16em] ${cls}`}>{children}</span>;
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

function emptyMetrics(): BrandVideoMetrics {
  return {
    impressions: 0,
    ctr: 0,
    v24: 0,
    v7: 0,
    v30: 0,
    avd: "0:00",
    avp: 0,
    subs: 0,
    comments: 0,
  };
}

function parseNum(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".").replace("%", "").replace("+", "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function computeDirComparison(doc: BrandDoc) {
  return doc.dirs
    .map((dir) => {
      const all = doc.videos.filter((v) => v.dir === dir.id);
      const withMetrics = all.filter((v) => v.m);
      const n = withMetrics.length;
      if (!all.length) return null;
      if (!n) {
        return {
          dir: dir.id,
          name: dir.name,
          videos: all.length,
          ctr: "—",
          viewed: "—",
          subs: "—",
          sig: "none" as BrandSignal,
        };
      }
      const avgCtr = withMetrics.reduce((s, v) => s + (v.m?.ctr ?? 0), 0) / n;
      const avgAvp = withMetrics.reduce((s, v) => s + (v.m?.avp ?? 0), 0) / n;
      const totalViews = withMetrics.reduce((s, v) => s + (v.m?.v30 ?? 0), 0);
      const totalSubs = withMetrics.reduce((s, v) => s + (v.m?.subs ?? 0), 0);
      const subsPer1000 = totalViews > 0 ? Math.round((totalSubs / totalViews) * 1000) : 0;
      let sig: BrandSignal = "none";
      if (n >= 1) {
        if (avgCtr >= 6 && avgAvp >= 45) sig = "very";
        else if (avgCtr >= 5 || avgAvp >= 45) sig = "strong";
        else if (avgCtr >= 3.5 || avgAvp >= 35) sig = "medium";
        else sig = "weak";
      }
      return {
        dir: dir.id,
        name: dir.name,
        videos: all.length,
        ctr: `${Math.round(avgCtr * 10) / 10}%`,
        viewed: `${Math.round(avgAvp)}%`,
        subs: String(subsPer1000),
        sig,
      };
    })
    .filter(Boolean) as Array<{
    dir: string;
    name: string;
    videos: number;
    ctr: string;
    viewed: string;
    subs: string;
    sig: BrandSignal;
  }>;
}

const fieldCls =
  "h-9 w-full rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3 text-[13.5px] text-[var(--v2-ink-900)] outline-none transition placeholder:text-[var(--v2-ink-400)] focus:border-[var(--v2-brand-400)] focus:bg-white v2-tight";

export function PersonalDashboardYoutubeClient() {
  const [doc, setDoc] = useState<BrandDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<FilterId>("all");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickDir, setQuickDir] = useState("");
  const [editing, setEditing] = useState<{ id: string; field: MetricKey | "date" | "title" | "sub" } | null>(null);

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
        if (cancelled) return;
        const normalized = normalizeBrandDoc(res.doc);
        setDoc(normalized);
        setQuickDir(normalized.dirs[0]?.id ?? "");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dirName = useCallback(
    (id: string) => doc?.dirs.find((d) => d.id === id)?.name ?? "—",
    [doc]
  );

  const rows = useMemo(() => {
    if (!doc) return [] as BrandVideo[];
    if (filter === "all") return doc.videos;
    return doc.videos.filter((v) =>
      filter === "pub" ? v.status === "Опубликован" : v.status !== "Опубликован"
    );
  }, [doc, filter]);

  const dirStats = useMemo(() => (doc ? computeDirComparison(doc) : []), [doc]);

  if (!doc) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--v2-ink-500)]">
        {error ?? "Загрузка…"}
      </div>
    );
  }

  const patchVideo = async (id: string, patch: Partial<BrandVideo>) => {
    await saveDoc({
      ...doc,
      videos: doc.videos.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    });
  };

  const patchMetric = async (id: string, key: MetricKey, value: number) => {
    const v = doc.videos.find((x) => x.id === id);
    if (!v) return;
    const m = { ...(v.m ?? emptyMetrics()), [key]: value };
    await patchVideo(id, { m });
  };

  const cycleSignal = async (id: string) => {
    const v = doc.videos.find((x) => x.id === id);
    if (!v) return;
    const i = SIG_CYCLE.indexOf(v.sig);
    const next = SIG_CYCLE[(i + 1) % SIG_CYCLE.length]!;
    await patchVideo(id, { sig: next });
  };

  const cycleStatus = async (id: string) => {
    const v = doc.videos.find((x) => x.id === id);
    if (!v) return;
    const i = VIDEO_STATUSES.indexOf(v.status);
    const next = VIDEO_STATUSES[(i + 1) % VIDEO_STATUSES.length]!;
    await patchVideo(id, { status: next });
  };

  const quickAdd = async () => {
    const title = quickTitle.trim();
    if (!title) return;
    const dir = quickDir || doc.dirs[0]?.id || "";
    const v: BrandVideo = {
      id: uid("v"),
      title,
      sub: "",
      dir,
      status: "Idea",
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
    setQuickTitle("");
  };

  const grid =
    "minmax(220px,1.4fr) 150px 88px 88px 68px 68px 68px 150px minmax(160px,1fr)";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-24 pt-6">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-[240px] max-w-[680px] flex-1">
            <h1 className="v2-tighter text-[42px] font-light leading-none text-[var(--v2-ink-900)]">YouTube Lab</h1>
            <p
              className="v2-tight mt-3 text-[15px] leading-relaxed text-[var(--v2-ink-500)]"
              style={{ textWrap: "pretty" }}
            >
              «Каждый ролик — не просто контент, а маленький тест аудитории и позиционирования.»
            </p>
            {error ? <p className="mt-2 text-[13px] text-red-600">{error}</p> : null}
            {saving ? <p className="mt-1 text-[12px] text-[var(--v2-ink-400)]">Сохранение…</p> : null}
          </div>
          <div className="inline-flex items-center rounded-full bg-white p-1 shadow-[var(--v2-shadow-card)]">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`v2-tight h-8 rounded-full px-3.5 text-[12.5px] font-medium transition ${
                  filter === f.id
                    ? "bg-[var(--v2-ink-900)] text-white"
                    : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[20px] bg-white px-4 py-3 shadow-[var(--v2-shadow-card)]">
          <V2Icons.plus className="h-4 w-4 shrink-0 text-[var(--v2-ink-400)]" />
          <input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void quickAdd();
              }
            }}
            placeholder="Быстро добавить ролик — название"
            className={`${fieldCls} max-w-[420px] flex-1 border-0 bg-transparent px-1 focus:bg-transparent`}
          />
          <select
            value={quickDir}
            onChange={(e) => setQuickDir(e.target.value)}
            className="v2-tight h-9 cursor-pointer appearance-none rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3 text-[12.5px] text-[var(--v2-ink-700)] outline-none"
          >
            {doc.dirs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void quickAdd()}
            disabled={!quickTitle.trim()}
            className="v2-tight h-9 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[12.5px] font-medium text-white transition hover:bg-[var(--v2-ink-700)] disabled:opacity-40"
          >
            Добавить
          </button>
        </div>

        <div className="overflow-x-auto rounded-[20px] bg-white shadow-[var(--v2-shadow-card)]">
          <div className="min-w-[1100px]">
            <div
              className="grid gap-4 border-b border-[var(--v2-ink-100)] bg-[var(--v2-ink-50)]/60 px-6 py-3.5"
              style={{ gridTemplateColumns: grid }}
            >
              {["Название", "Направление", "Дата", "Views", "CTR", "Avg %", "Subs", "Сигнал", "Вывод"].map((h) => (
                <BK key={h}>{h}</BK>
              ))}
            </div>

            {rows.map((v) => (
              <div
                key={v.id}
                className="grid items-center gap-4 border-b border-[var(--v2-ink-100)] px-6 py-3.5 last:border-0 hover:bg-[var(--v2-ink-50)]/40"
                style={{ gridTemplateColumns: grid }}
              >
                <div className="min-w-0">
                  <EditableText
                    editing={editing?.id === v.id && editing.field === "title"}
                    value={v.title}
                    className="v2-tight truncate text-[14.5px] font-medium text-[var(--v2-ink-900)]"
                    onStart={() => setEditing({ id: v.id, field: "title" })}
                    onCancel={() => setEditing(null)}
                    onCommit={(val) => {
                      setEditing(null);
                      if (val.trim() && val !== v.title) void patchVideo(v.id, { title: val.trim() });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void cycleStatus(v.id)}
                    className="v2-tight mt-0.5 text-left text-[12px] text-[var(--v2-ink-400)] transition hover:text-[var(--v2-brand-700)]"
                    title="Сменить статус"
                  >
                    {v.sub || v.status}
                  </button>
                </div>

                <select
                  value={v.dir}
                  onChange={(e) => void patchVideo(v.id, { dir: e.target.value })}
                  className="v2-tight h-8 w-full cursor-pointer appearance-none rounded-lg border-0 bg-transparent py-0 pl-0 text-[12.5px] text-[var(--v2-ink-600)] outline-none hover:text-[var(--v2-ink-900)]"
                  title={dirName(v.dir)}
                >
                  {doc.dirs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>

                <EditableText
                  editing={editing?.id === v.id && editing.field === "date"}
                  value={v.date === "—" ? "" : v.date}
                  display={v.date}
                  className="v2-tnum text-[12.5px] text-[var(--v2-ink-500)]"
                  onStart={() => setEditing({ id: v.id, field: "date" })}
                  onCancel={() => setEditing(null)}
                  onCommit={(val) => {
                    setEditing(null);
                    void patchVideo(v.id, { date: val.trim() || "—" });
                  }}
                />

                <EditableMetric
                  editing={editing?.id === v.id && editing.field === "v30"}
                  display={v.m ? v.m.v30.toLocaleString("ru") : "—"}
                  raw={v.m ? String(v.m.v30) : ""}
                  strong
                  onStart={() => setEditing({ id: v.id, field: "v30" })}
                  onCancel={() => setEditing(null)}
                  onCommit={(n) => {
                    setEditing(null);
                    if (n != null) void patchMetric(v.id, "v30", Math.round(n));
                  }}
                />

                <EditableMetric
                  editing={editing?.id === v.id && editing.field === "ctr"}
                  display={v.m ? `${v.m.ctr}%` : "—"}
                  raw={v.m ? String(v.m.ctr) : ""}
                  onStart={() => setEditing({ id: v.id, field: "ctr" })}
                  onCancel={() => setEditing(null)}
                  onCommit={(n) => {
                    setEditing(null);
                    if (n != null) void patchMetric(v.id, "ctr", Math.round(n * 10) / 10);
                  }}
                />

                <EditableMetric
                  editing={editing?.id === v.id && editing.field === "avp"}
                  display={v.m ? `${v.m.avp}%` : "—"}
                  raw={v.m ? String(v.m.avp) : ""}
                  onStart={() => setEditing({ id: v.id, field: "avp" })}
                  onCancel={() => setEditing(null)}
                  onCommit={(n) => {
                    setEditing(null);
                    if (n != null) void patchMetric(v.id, "avp", Math.round(n));
                  }}
                />

                <EditableMetric
                  editing={editing?.id === v.id && editing.field === "subs"}
                  display={v.m ? `+${v.m.subs}` : "—"}
                  raw={v.m ? String(v.m.subs) : ""}
                  onStart={() => setEditing({ id: v.id, field: "subs" })}
                  onCancel={() => setEditing(null)}
                  onCommit={(n) => {
                    setEditing(null);
                    if (n != null) void patchMetric(v.id, "subs", Math.round(n));
                  }}
                />

                <button
                  type="button"
                  onClick={() => void cycleSignal(v.id)}
                  className="text-left transition hover:opacity-80"
                  title="Сменить сигнал"
                >
                  <SigCell k={v.sig} />
                </button>

                <EditableText
                  editing={editing?.id === v.id && editing.field === "sub"}
                  value={v.learn}
                  display={v.learn || "—"}
                  className="v2-tight line-clamp-2 text-[12.5px] text-[var(--v2-ink-600)]"
                  onStart={() => setEditing({ id: v.id, field: "sub" })}
                  onCancel={() => setEditing(null)}
                  onCommit={(val) => {
                    setEditing(null);
                    if (val !== v.learn) void patchVideo(v.id, { learn: val });
                  }}
                />
              </div>
            ))}

            {!rows.length ? (
              <p className="v2-tight px-6 py-10 text-center text-[14px] text-[var(--v2-ink-500)]">
                Нет роликов в этом фильтре. Добавьте первый сверху.
              </p>
            ) : null}
          </div>
        </div>

        <p className="v2-tight mt-4 text-[12.5px] text-[var(--v2-ink-400)]">
          Клик по цифре — правка. Клик по статусу под названием и по сигналу — цикл значений. Данные общие с личным
          брендом.
        </p>

        <section className="mt-14">
          <div className="mb-5">
            <h2 className="v2-tight text-[21px] font-medium text-[var(--v2-ink-900)]">Сравнение направлений</h2>
            <p className="v2-tight mt-1.5 max-w-[70ch] text-[14px] text-[var(--v2-ink-500)]" style={{ textWrap: "pretty" }}>
              «Минимум 2 ролика в направлении — иначе это ещё не данные.»
            </p>
          </div>
          {dirStats.length ? (
            <>
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))" }}>
                {dirStats.map((s) => (
                  <div key={s.dir} className="rounded-[20px] bg-white px-6 py-5 shadow-[var(--v2-shadow-card)]">
                    <h3 className="v2-tight text-[16px] font-medium text-[var(--v2-ink-900)]">{s.name}</h3>
                    <p className="v2-tnum mt-1 text-[12px] text-[var(--v2-ink-400)]">
                      {s.videos} {s.videos === 1 ? "ролик" : s.videos < 5 ? "ролика" : "роликов"}
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
                Считается по роликам с метриками. Меняете цифры в таблице — сравнение обновляется.
              </p>
            </>
          ) : (
            <p className="v2-tight rounded-[20px] bg-white px-6 py-8 text-[14px] text-[var(--v2-ink-500)] shadow-[var(--v2-shadow-card)]">
              Пока нет роликов по направлениям.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function EditableText({
  editing,
  value,
  display,
  className,
  onStart,
  onCancel,
  onCommit,
}: {
  editing: boolean;
  value: string;
  display?: string;
  className?: string;
  onStart: () => void;
  onCancel: () => void;
  onCommit: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) {
      setDraft(value);
      requestAnimationFrame(() => ref.current?.select());
    }
  }, [editing, value]);
  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit(draft);
          if (e.key === "Escape") onCancel();
        }}
        className="v2-tight h-8 w-full rounded-lg border border-[var(--v2-brand-400)] bg-white px-2 text-[13px] outline-none"
      />
    );
  }
  return (
    <button type="button" onClick={onStart} className={`block w-full truncate text-left ${className ?? ""}`}>
      {display ?? value}
    </button>
  );
}

function EditableMetric({
  editing,
  display,
  raw,
  strong,
  onStart,
  onCancel,
  onCommit,
}: {
  editing: boolean;
  display: string;
  raw: string;
  strong?: boolean;
  onStart: () => void;
  onCancel: () => void;
  onCommit: (n: number | null) => void;
}) {
  const [draft, setDraft] = useState(raw);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) {
      setDraft(raw);
      requestAnimationFrame(() => ref.current?.select());
    }
  }, [editing, raw]);
  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(parseNum(draft))}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit(parseNum(draft));
          if (e.key === "Escape") onCancel();
        }}
        className="v2-tnum h-8 w-full rounded-lg border border-[var(--v2-brand-400)] bg-white px-2 text-[13px] outline-none"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={onStart}
      className={`v2-tnum block w-full text-left text-[12.5px] transition hover:text-[var(--v2-brand-700)] ${
        strong ? "font-medium text-[var(--v2-ink-900)]" : "text-[var(--v2-ink-700)]"
      }`}
    >
      {display}
    </button>
  );
}
