"use client";

import { Unbounded } from "next/font/google";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { appPath } from "@/lib/api-url";
import {
  LIFE_MAP_SLOTS,
  lifeMapChapters,
  type LifeMapBlock,
  type LifeMapDoc,
} from "@/lib/v2/personal/seeds/life-map-seed";
import "./life-map-article.css";

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["200", "300", "400", "600", "800"],
  display: "swap",
  variable: "--font-unbounded",
});

const PRIV_KEY = "tt-life-map-priv";

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 24, behavior: "smooth" });
}

function Photo({ id }: { id: string }) {
  const src = LIFE_MAP_SLOTS[id];
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={appPath(src)} alt="" />;
}

function BlockView({ b, blur }: { b: LifeMapBlock; blur: boolean }) {
  const fade = blur ? { filter: "blur(9px)" } : undefined;

  if (b.type === "h2") {
    return (
      <div id={b.id} className="tt-lm-h2">
        <div className="tt-lm-kicker">{b.eb}</div>
        <div className="tt-lm-h2-t">{b.t}</div>
      </div>
    );
  }
  if (b.type === "h3") {
    return (
      <div className="tt-lm-h3">
        {b.eb ? <div className="tt-lm-kicker" style={{ color: "var(--lm-gold)" }}>{b.eb}</div> : null}
        <div className="tt-lm-h3-t">{b.t}</div>
      </div>
    );
  }
  if (b.type === "lead") return <div className="tt-lm-lead">{b.t}</div>;
  if (b.type === "p") {
    return (
      <div className="tt-lm-p" style={fade}>
        {b.t}
      </div>
    );
  }
  if (b.type === "img") {
    if (!LIFE_MAP_SLOTS[b.id]) return null;
    return (
      <div className="tt-lm-shot">
        <Photo id={b.id} />
      </div>
    );
  }
  if (b.type === "pair") {
    const a = LIFE_MAP_SLOTS[b.a];
    const c = LIFE_MAP_SLOTS[b.b];
    if (!a && !c) return null;
    return (
      <div className="tt-lm-pair">
        {a ? (
          <div className="tt-lm-pair-cell">
            <Photo id={b.a} />
          </div>
        ) : null}
        {c ? (
          <div className="tt-lm-pair-cell">
            <Photo id={b.b} />
          </div>
        ) : null}
      </div>
    );
  }
  if (b.type === "figs") {
    return (
      <div className="tt-lm-figs">
        {b.list.map((f) => (
          <div key={f.l} className="tt-lm-fig">
            <div className="tt-lm-fig-v">{f.v}</div>
            <div className="tt-lm-fig-l">{f.l}</div>
          </div>
        ))}
      </div>
    );
  }
  if (b.type === "items") {
    return (
      <div className="tt-lm-items">
        {b.list.map((it) => (
          <div key={it.n + it.t} className="tt-lm-item">
            <div className="tt-lm-kicker">{it.n}</div>
            <div className="tt-lm-item-t">{it.t}</div>
            {(it.d || []).map((d) => (
              <div key={d} className="tt-lm-p" style={{ margin: 0, ...fade }}>
                {d}
              </div>
            ))}
            {(it.kv || []).map((r) => (
              <div key={r.k} className="tt-lm-kv">
                <div style={{ color: "var(--lm-faint)" }}>{r.k}</div>
                <div style={{ color: "var(--lm-muted)", ...fade }}>{r.v}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (b.type === "facts") {
    return (
      <div className="tt-lm-facts">
        {b.list.map((r) => (
          <div key={r.k} className="tt-lm-fact">
            <div className="tt-lm-kicker" style={{ color: "var(--lm-faint)" }}>
              {r.k}
            </div>
            <div>{r.v}</div>
          </div>
        ))}
      </div>
    );
  }
  if (b.type === "bullets") {
    return (
      <div className="tt-lm-bullets">
        {b.list.map((li) => (
          <div key={li} className="tt-lm-bullet">
            <div className="tt-lm-dot" />
            <div>{li}</div>
          </div>
        ))}
      </div>
    );
  }
  if (b.type === "note") {
    return (
      <div className="tt-lm-box" style={{ background: "var(--lm-note)" }}>
        <div className="tt-lm-kicker" style={{ color: "var(--lm-gold)" }}>
          {b.label}
        </div>
        {b.title ? <div className="tt-lm-box-t">{b.title}</div> : null}
        {b.t.map((p) => (
          <div key={p} className="tt-lm-p" style={{ margin: 0, ...fade }}>
            {p}
          </div>
        ))}
        {b.crit ? (
          <div className="tt-lm-crit">
            <span style={{ color: "var(--lm-gold)" }}>Критерий достижения:</span> {b.crit}
          </div>
        ) : null}
      </div>
    );
  }
  if (b.type === "quote") {
    return <div className="tt-lm-quote">{b.t}</div>;
  }
  if (b.type === "mantra") {
    return <div className="tt-lm-mantra">{b.t}</div>;
  }
  return null;
}

export function LifeMapArticle({ doc }: { doc: LifeMapDoc }) {
  const chapters = useMemo(() => lifeMapChapters(doc), [doc]);
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
    else window.scrollTo({ top: 0 });
  }, [doc.kind]);

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
    <div className={`tt-lm-page tt-lm ${unbounded.variable}`}>
      <div className="tt-lm-wrap">
        <Link href={appPath("/v2/personal/articles")} className="tt-lm-back">
          ← Все статьи
        </Link>
        <div className="tt-lm-banner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={appPath(doc.hero)} alt="" />
        </div>
        <article className="tt-lm-doc">
          <div className="tt-lm-intro">
            <div className="tt-lm-kicker">{doc.eyebrow}</div>
            <h1>{doc.title}</h1>
            <p>{doc.lead}</p>
            {doc.privateText ? (
              <div className="tt-lm-tools">
                <button type="button" className="tt-lm-chip" onClick={togglePriv}>
                  <span className="tt-lm-priv-dot" style={{ background: priv ? "#fb7185" : "var(--lm-accent)" }} />
                  {priv ? "Текст скрыт" : "Скрыть текст"}
                </button>
              </div>
            ) : null}
          </div>
          <div className="tt-lm-toc">
            <div className="tt-lm-kicker" style={{ color: "var(--lm-faint)", marginBottom: 8 }}>
              Содержание
            </div>
            <div className="tt-lm-toc-grid">
              {chapters.map((b, i) => (
                <button key={b.id} type="button" className="tt-lm-toc-row" onClick={() => scrollToId(b.id)}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <span>{b.toc || b.t}</span>
                  <span>↓</span>
                </button>
              ))}
            </div>
          </div>
          <div className="tt-lm-body">
            {doc.blocks.map((b, i) => (
              <BlockView key={i} b={b} blur={priv && !!doc.privateText} />
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
