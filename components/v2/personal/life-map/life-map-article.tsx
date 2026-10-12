"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { appPath } from "@/lib/api-url";
import {
  LIFE_MAP_SLOTS,
  lifeMapChapters,
  type LifeMapBlock,
  type LifeMapDoc,
} from "@/lib/v2/personal/seeds/life-map-seed";

const HERO_BLUE = "#2d5eef";
const PRIV_KEY = "tt-life-map-priv";

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 88, behavior: "smooth" });
}

function Kicker({ children, tint }: { children: ReactNode; tint?: string }) {
  return (
    <span
      className="text-[11.5px] font-semibold uppercase tracking-[0.13em]"
      style={{ color: tint ?? "var(--v2-ink-400)" }}
    >
      {children}
    </span>
  );
}

function Photo({ id, className }: { id: string; className?: string }) {
  const src = LIFE_MAP_SLOTS[id];
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={appPath(src)} alt="" className={className ?? "block h-auto w-full"} />
  );
}

function Shot({ id }: { id: string }) {
  if (!LIFE_MAP_SLOTS[id]) return null;
  return (
    <div className="overflow-hidden rounded-[20px] bg-[var(--v2-ink-50)]">
      <Photo id={id} />
    </div>
  );
}

function Pair({ a, b }: { a: string; b: string }) {
  const left = LIFE_MAP_SLOTS[a];
  const right = LIFE_MAP_SLOTS[b];
  if (!left && !right) return null;
  return (
    <div className={`grid gap-3 ${left && right ? "md:grid-cols-2" : "grid-cols-1"}`}>
      {left ? <Shot id={a} /> : null}
      {right ? <Shot id={b} /> : null}
    </div>
  );
}

function BlockView({ b, blur }: { b: LifeMapBlock; blur: boolean }) {
  const text = blur ? "blur-[9px] select-none" : "";

  switch (b.type) {
    case "h2":
      return (
        <div id={b.id} className="scroll-mt-[88px] pt-2">
          <Kicker tint="var(--v2-brand-600)">{b.eb}</Kicker>
          <h2 className="v2-tight mt-2 text-[28px] font-semibold leading-[1.15] tracking-[-0.032em] text-[var(--v2-ink-900)]">
            {b.t}
          </h2>
        </div>
      );
    case "h3":
      return (
        <div className="pt-1">
          {b.eb ? <Kicker>{b.eb}</Kicker> : null}
          <h3 className={`v2-tight text-[19px] font-semibold tracking-[-0.022em] text-[var(--v2-ink-900)] ${b.eb ? "mt-1.5" : ""}`}>
            {b.t}
          </h3>
        </div>
      );
    case "lead":
      return (
        <p
          className={`v2-tight max-w-[72ch] rounded-[20px] bg-[var(--v2-brand-50)] px-6 py-5 text-[18px] font-medium leading-[1.45] tracking-[-0.02em] text-[var(--v2-brand-800)] ${text}`}
          style={{ boxShadow: "inset 4px 0 0 var(--v2-brand-600)", textWrap: "pretty" }}
        >
          {b.t}
        </p>
      );
    case "p":
      return (
        <p
          className={`v2-tight max-w-[78ch] text-[16px] leading-[1.7] text-[var(--v2-ink-600)] ${text}`}
          style={{ textWrap: "pretty" }}
        >
          {b.t}
        </p>
      );
    case "img":
      return <Shot id={b.id} />;
    case "pair":
      return <Pair a={b.a} b={b.b} />;
    case "figs":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {b.list.map((f) => (
            <div
              key={f.l}
              className="rounded-[18px] bg-[#2d5eef] px-5 py-4 text-white shadow-[0_16px_40px_-18px_rgba(45,94,239,0.85)]"
            >
              <div className="v2-tnum text-[24px] font-semibold tracking-[-0.03em]">{f.v}</div>
              <div className="mt-1.5 text-[12.5px] font-medium text-white/70">{f.l}</div>
            </div>
          ))}
        </div>
      );
    case "items":
      return (
        <div className="flex flex-col gap-2.5">
          {b.list.map((it) => (
            <article key={it.n + it.t} className="rounded-[18px] bg-[var(--v2-ink-50)] px-5 py-4">
              <Kicker tint="var(--v2-brand-600)">{it.n}</Kicker>
              <div className={`v2-tight mt-1.5 text-[16.5px] font-semibold tracking-[-0.018em] text-[var(--v2-ink-900)] ${text}`}>
                {it.t}
              </div>
              {(it.d || []).map((d) => (
                <p
                  key={d}
                  className={`v2-tight mt-2 max-w-[72ch] text-[14.5px] leading-relaxed text-[var(--v2-ink-600)] ${text}`}
                  style={{ textWrap: "pretty" }}
                >
                  {d}
                </p>
              ))}
              {(it.kv || []).map((r) => (
                <div key={r.k} className="mt-2 grid grid-cols-[140px_minmax(0,1fr)] gap-3 text-[13.5px]">
                  <span className="text-[var(--v2-ink-400)]">{r.k}</span>
                  <span className={`text-[var(--v2-ink-700)] ${text}`}>{r.v}</span>
                </div>
              ))}
            </article>
          ))}
        </div>
      );
    case "facts":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {b.list.map((r) => (
            <div key={r.k} className="rounded-[18px] bg-[var(--v2-ink-50)] px-5 py-4">
              <Kicker>{r.k}</Kicker>
              <div className={`v2-tight mt-1.5 text-[15.5px] font-medium text-[var(--v2-ink-800)] ${text}`}>{r.v}</div>
            </div>
          ))}
        </div>
      );
    case "bullets":
      return (
        <ul className="grid grid-cols-1 gap-2.5 lg:grid-cols-3">
          {b.list.map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-[16px] bg-[var(--v2-ink-50)] px-4 py-3.5">
              <span className="mt-[8px] h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--v2-brand-500)]" />
              <span className={`v2-tight text-[15px] leading-[1.5] text-[var(--v2-ink-700)] ${text}`}>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "note":
      return (
        <aside className="rounded-[20px] bg-[#FFF7E8] px-6 py-5">
          <Kicker tint="#B54708">{b.label}</Kicker>
          {b.title ? (
            <div className={`v2-tight mt-2 text-[17px] font-semibold tracking-[-0.02em] text-[#7A2E0E] ${text}`}>
              {b.title}
            </div>
          ) : null}
          {b.t.map((p) => (
            <p
              key={p}
              className={`v2-tight mt-2 max-w-[72ch] text-[14.5px] leading-relaxed text-[#9A3412] ${text}`}
              style={{ textWrap: "pretty" }}
            >
              {p}
            </p>
          ))}
          {b.crit ? (
            <div className={`mt-4 border-t border-[#F5D0A8] pt-3 text-[13.5px] leading-relaxed text-[#9A3412] ${text}`}>
              <span className="font-semibold text-[#B54708]">Критерий достижения: </span>
              {b.crit}
            </div>
          ) : null}
        </aside>
      );
    case "quote":
      return (
        <blockquote
          className="rounded-[20px] bg-[var(--v2-brand-50)] px-7 py-6"
          style={{ boxShadow: "inset 4px 0 0 var(--v2-brand-600)" }}
        >
          <p className={`v2-tight text-[19px] font-medium leading-[1.45] tracking-[-0.02em] text-[var(--v2-brand-800)] ${text}`}>
            {b.t}
          </p>
        </blockquote>
      );
    case "mantra":
      return (
        <div
          className="rounded-[20px] px-7 py-6 text-white"
          style={{ background: HERO_BLUE, boxShadow: "0 16px 40px -18px rgba(45,94,239,0.85)" }}
        >
          <Kicker tint="rgba(255,255,255,.55)">Мантра</Kicker>
          <p className={`v2-tight mt-2 text-[22px] font-semibold leading-[1.3] tracking-[-0.028em] ${text}`}>{b.t}</p>
        </div>
      );
    default:
      return null;
  }
}

function sectionize(blocks: LifeMapBlock[]) {
  const sections: { id: string | null; items: LifeMapBlock[] }[] = [];
  let current: { id: string | null; items: LifeMapBlock[] } = { id: null, items: [] };
  for (const b of blocks) {
    if (b.type === "h2") {
      if (current.items.length) sections.push(current);
      current = { id: b.id, items: [b] };
    } else {
      current.items.push(b);
    }
  }
  if (current.items.length) sections.push(current);
  return sections;
}

export function LifeMapArticle({ doc }: { doc: LifeMapDoc }) {
  const chapters = useMemo(() => lifeMapChapters(doc), [doc]);
  const sections = useMemo(() => sectionize(doc.blocks), [doc.blocks]);
  const [active, setActive] = useState(chapters[0]?.id ?? "");
  const [priv, setPriv] = useState(false);

  useEffect(() => {
    if (!doc.privateText) return;
    try {
      setPriv(localStorage.getItem(PRIV_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, [doc.privateText]);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) setTimeout(() => scrollToId(hash), 80);
  }, [doc.kind]);

  useEffect(() => {
    const nodes = chapters
      .map((c) => document.getElementById(c.id))
      .filter((n): n is HTMLElement => Boolean(n));
    if (!nodes.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = visible[0]?.target.id;
        if (id) setActive(id);
      },
      { rootMargin: "-12% 0px -70% 0px", threshold: [0.05, 0.3, 0.6] }
    );
    nodes.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, [chapters]);

  const togglePriv = () => {
    const next = !priv;
    setPriv(next);
    try {
      localStorage.setItem(PRIV_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-[1720px] flex-col gap-7 px-9 pb-24 pt-7">
        <section className="v2-card relative overflow-hidden">
          <div className="relative h-[210px] overflow-hidden sm:h-[240px] lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={appPath(doc.hero)} alt="" className="h-full w-full object-cover object-[72%_28%]" />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={appPath(doc.hero)}
            alt=""
            className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-[78%_42%] lg:block"
          />
          <div
            className="pointer-events-none absolute inset-y-0 left-0 hidden lg:block"
            style={{
              width: "62%",
              background:
                "linear-gradient(90deg, #ffffff 0%, #ffffff 42%, rgba(255,255,255,0.86) 62%, rgba(255,255,255,0) 100%)",
            }}
          />
          <div className="relative z-10 flex min-h-0 max-w-[720px] flex-col justify-center gap-5 px-8 py-8 lg:min-h-[420px] lg:px-10">
            <div>
              <Kicker tint="var(--v2-brand-600)">{doc.eyebrow}</Kicker>
              <h1 className="v2-tight mt-2 text-[40px] font-semibold leading-[1.08] tracking-[-0.036em] text-[var(--v2-ink-900)]">
                {doc.title}
              </h1>
              <p className="v2-tight mt-3 max-w-[52ch] text-[16px] leading-relaxed text-[var(--v2-ink-500)]">{doc.lead}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {doc.chips.map((c) => (
                <span
                  key={c.n}
                  className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-[13px] font-medium text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] ring-1 ring-inset ring-[var(--v2-ink-100)]"
                >
                  <span className="v2-tnum text-[12px] text-[var(--v2-brand-600)]">{c.n}</span>
                  {c.t}
                </span>
              ))}
            </div>
            {doc.privateText ? (
              <button
                type="button"
                onClick={togglePriv}
                className="inline-flex h-10 w-fit items-center gap-2 rounded-[12px] bg-white px-3.5 text-[13px] font-medium text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-card)] hover:text-[var(--v2-ink-900)]"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: priv ? "#fb7185" : "var(--v2-brand-500)" }}
                />
                {priv ? "Текст скрыт" : "Скрыть текст"}
              </button>
            ) : null}
          </div>
        </section>

        <nav className="v2-card sticky top-0 z-10 flex flex-wrap gap-1.5 px-4 py-3">
          {chapters.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setActive(c.id);
                scrollToId(c.id);
              }}
              className={`v2-tight rounded-[10px] px-3 py-1.5 text-[13px] font-medium transition ${
                active === c.id
                  ? "bg-[var(--v2-brand-600)] text-white"
                  : "bg-[var(--v2-ink-50)] text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
              }`}
            >
              <span className="v2-tnum mr-1.5 opacity-55">{String(i + 1).padStart(2, "0")}</span>
              {c.toc || c.t}
            </button>
          ))}
        </nav>

        {sections.map((section, i) => (
          <section key={section.id ?? `intro-${i}`} className="v2-card flex flex-col gap-5 px-8 py-7">
            {section.items.map((b, j) => (
              <BlockView key={`${section.id ?? "intro"}-${j}`} b={b} blur={priv && !!doc.privateText} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
