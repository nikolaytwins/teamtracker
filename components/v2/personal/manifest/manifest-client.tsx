"use client";

import "./manifest-design.css";
import {
  slugifyManifestHeading,
  type ManifestTocItem,
} from "@/lib/v2/personal/manifest";
import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function preserveSourceLineBreaks(md: string) {
  return md.replace(/([^\n])\n(?!\n)/g, "$1  \n");
}

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "object" && "props" in node) {
    const props = node.props as { children?: ReactNode };
    return textOf(props.children);
  }
  return "";
}

function splitHeading(raw: string): { num: string | null; title: string } {
  const m = /^([IVXLC]+)\.\s*(.+)$/i.exec(raw.trim());
  if (!m) return { num: null, title: raw.trim() };
  return { num: m[1]!.toUpperCase(), title: m[2]!.trim() };
}

function ManifestMarkdown({ source, oath }: { source: string; oath?: boolean }) {
  return (
    <div className={oath ? "manifest-prose manifest-oath" : "manifest-prose"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => {
            const raw = textOf(children);
            const { num, title } = splitHeading(raw);
            const id = slugifyManifestHeading(raw);
            return (
              <h1 id={id}>
                {num ? <span className="mf-num">Глава {num}</span> : null}
                {title}
              </h1>
            );
          },
          h2: ({ children }) => <h2>{children}</h2>,
          h3: ({ children }) => <h3>{children}</h3>,
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children, className }) => (
            <ul className={className}>{children}</ul>
          ),
          ol: ({ children }) => <ol>{children}</ol>,
          li: ({ children, className }) => (
            <li className={className}>{children}</li>
          ),
          strong: ({ children }) => <strong>{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          hr: () => <hr />,
          code: ({ children }) => <code>{children}</code>,
          blockquote: ({ children }) => <blockquote>{children}</blockquote>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table>{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead>{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => <th>{children}</th>,
          td: ({ children }) => <td>{children}</td>,
          img: () => null,
        }}
      >
        {preserveSourceLineBreaks(source)}
      </ReactMarkdown>
    </div>
  );
}

export function ManifestClient({
  title,
  body,
  toc,
}: {
  title: string;
  body: string;
  toc: ManifestTocItem[];
}) {
  const { main, oath } = useMemo(() => {
    const re = /^#\s+XIII\./im;
    const m = re.exec(body);
    if (!m || m.index == null) return { main: body, oath: null as string | null };
    return {
      main: body.slice(0, m.index).trimEnd(),
      oath: body.slice(m.index).trim(),
    };
  }, [body]);

  const [active, setActive] = useState(toc[0]?.id ?? "");

  useEffect(() => {
    const nodes = toc
      .map((t) => document.getElementById(t.id))
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
      { rootMargin: "-18% 0px -62% 0px", threshold: [0.1, 0.4, 0.7] }
    );
    nodes.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, [toc]);

  return (
    <div className="manifest-page min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#F5F7FB_0%,#FFFFFF_32%)]">
      <div className="mx-auto max-w-[1240px] px-5 pb-28 pt-6 sm:px-8">
        <div className="manifest-hero mb-10">
          <Image
            src="/wishes/ai-industry-hero.png"
            alt=""
            fill
            priority
            className="manifest-hero-img"
            sizes="(max-width: 1240px) 100vw, 1240px"
          />
          <div className="manifest-hero-scrim" />
          <div className="manifest-hero-copy">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              Еженедельный код · личный план
            </p>
            <h1 className="v2-tighter mt-3 text-[clamp(34px,5vw,56px)] font-light leading-[1.02] text-white">
              {title}
            </h1>
            <p
              className="v2-tight mt-5 max-w-[46ch] text-[17px] font-light leading-[1.45] text-white/88"
              style={{ textWrap: "pretty" }}
            >
              Я больше не жду, когда новая жизнь выберет меня. Я становлюсь человеком,
              способным её построить, выдержать и не разрушить собственными старыми привычками.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <span className="inline-flex rounded-full bg-white/12 px-3 py-1.5 text-[12px] font-medium text-white/90 ring-1 ring-white/15 backdrop-blur-sm">
                Читать раз в неделю
              </span>
              <span className="inline-flex rounded-full bg-white/12 px-3 py-1.5 text-[12px] font-medium text-white/90 ring-1 ring-white/15 backdrop-blur-sm">
                Заканчивается действием
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="manifest-toc-col">
            <nav className="manifest-toc rounded-[20px] bg-white/80 p-4 shadow-[var(--v2-shadow-card)] backdrop-blur">
              <p className="mb-3 px-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--v2-ink-400)]">
                Содержание
              </p>
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={active === item.id ? "is-active" : undefined}
                  onClick={() => setActive(item.id)}
                  title={item.label}
                >
                  {item.short}
                </a>
              ))}
            </nav>
          </aside>

          <div className="min-w-0">
            <section className="mb-10 overflow-hidden rounded-[24px] bg-white px-7 py-8 shadow-[var(--v2-shadow-soft)] sm:px-10 sm:py-10">
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--v2-brand-600)]">
                Главный принцип
              </p>
              <p
                className="v2-tighter mt-4 max-w-[34ch] text-[28px] font-light leading-[1.25] text-[var(--v2-ink-900)] sm:text-[32px]"
                style={{ textWrap: "pretty" }}
              >
                Манифест заканчивается действием. Иначе он не работает.
              </p>
              <p
                className="v2-tight mt-5 max-w-[58ch] text-[15.5px] leading-relaxed text-[var(--v2-ink-500)]"
                style={{ textWrap: "pretty" }}
              >
                Этот образ — не обязательное будущее и не доказательство ценности. Это направление:
                свобода, масштаб, любовь, тело, красота и форма. Читать один раз в неделю — и
                сразу переносить правду в календарь, деньги и поступки.
              </p>
            </section>

            <ManifestMarkdown source={main} />
            {oath ? <ManifestMarkdown source={oath} oath /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
