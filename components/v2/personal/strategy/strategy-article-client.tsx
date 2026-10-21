"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  STRATEGY_TAG_META,
  type StrategyArticle,
} from "@/lib/v2/strategy/types";
import { V2Icons } from "@/components/v2/ui/icons";
import { appPath } from "@/lib/api-url";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Сохраняем переносы исходника (особенно textutil из .docx), не схлопывая строки в абзац. */
function preserveSourceLineBreaks(md: string) {
  return md.replace(/([^\n])\n(?!\n)/g, "$1  \n");
}

export function StrategyArticleClient({ slug }: { slug: string }) {
  const [article, setArticle] = useState<StrategyArticle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchJson<{ article: StrategyArticle }>(`/api/v2/personal/strategy/articles/${slug}`)
      .then((data) => {
        if (!cancelled) setArticle(data.article);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не найдено");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[13px] text-[var(--v2-ink-400)]">
        Загрузка…
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-[14px] text-red-600">{error ?? "Статья не найдена"}</p>
        <Link
          href={appPath("/v2/personal/strategy")}
          className="mt-4 inline-flex text-[13px] font-semibold text-[var(--v2-brand-600)]"
        >
          ← К стратегии
        </Link>
      </div>
    );
  }

  const tag = STRATEGY_TAG_META[article.tag];

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-[linear-gradient(180deg,#F7F8FC_0%,#FFFFFF_28%)]">
      <div className="mx-auto max-w-[760px] px-3 pb-12 pt-3 sm:px-8 sm:pb-24 sm:pt-6">
        <Link
          href={appPath("/v2/personal/strategy")}
          className="inline-flex min-h-10 items-center gap-1.5 text-[13px] sm:min-h-0 font-medium text-[var(--v2-ink-500)] transition hover:text-[var(--v2-ink-800)]"
        >
          <V2Icons.chevL className="h-3.5 w-3.5" />
          База данных
        </Link>

        <article className="mt-2 overflow-hidden rounded-[22px] sm:mt-6 sm:rounded-[28px] bg-white shadow-[var(--v2-shadow-soft)]">
          <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[16/9]">
            <Image
              src={article.cover}
              alt=""
              fill
              priority
              className="object-cover"
              sizes="(max-width:768px) 100vw, 760px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
              <span
                className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]"
                style={{ background: tag.soft, color: tag.tint }}
              >
                {tag.label}
              </span>
              <h1 className="v2-tighter mt-3 text-[24px] font-bold leading-[1.15] text-white sm:text-[34px]">
                {article.title}
              </h1>
            </div>
          </div>

          <div className="strategy-prose break-words px-5 py-7 sm:px-10 sm:py-10">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => {
                  const text = String(children);
                  if (text.trim() === article.title.trim()) return null;
                  return (
                    <h1 className="v2-tight mb-4 mt-8 text-[24px] font-bold text-[var(--v2-ink-900)] first:mt-0">
                      {children}
                    </h1>
                  );
                },
                h2: ({ children }) => (
                  <h2 className="v2-tight mb-3 mt-10 border-b border-[var(--v2-ink-100)] pb-2 text-[20px] font-bold text-[var(--v2-ink-900)] first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="v2-tight mb-2 mt-7 text-[17px] font-bold text-[var(--v2-ink-800)] sm:text-[16px]">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="v2-tight mb-4 whitespace-pre-wrap text-[17px] leading-[1.7] sm:text-[15.5px] sm:leading-[1.75] text-[var(--v2-ink-700)]">
                    {children}
                  </p>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-6 border-l-[3px] border-[var(--v2-brand-500)] bg-[var(--v2-brand-50)]/60 px-4 py-3 text-[16px] italic sm:text-[15px] leading-relaxed text-[var(--v2-ink-800)]">
                    {children}
                  </blockquote>
                ),
                ul: ({ children }) => (
                  <ul className="mb-4 list-disc space-y-1.5 pl-5 text-[17px] leading-relaxed sm:text-[15px] text-[var(--v2-ink-700)]">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-[17px] leading-relaxed sm:text-[15px] text-[var(--v2-ink-700)]">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="pl-0.5">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-[var(--v2-ink-900)]">{children}</strong>
                ),
                hr: () => <hr className="my-8 border-[var(--v2-ink-100)]" />,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="font-medium text-[var(--v2-brand-600)] underline decoration-[var(--v2-brand-200)] underline-offset-2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="my-5 max-w-full overflow-x-auto">
                    <table className="w-full min-w-[480px] border-collapse text-[14px] [&_td]:border-b [&_td]:border-[var(--v2-ink-100)] [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:border-b [&_th]:border-[var(--v2-ink-200)] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left">
                      {children}
                    </table>
                  </div>
                ),
                pre: ({ children }) => (
                  <pre className="mb-4 max-w-full overflow-x-auto rounded-xl bg-[var(--v2-ink-50)] p-3 text-[13px]">{children}</pre>
                ),
                img: ({ src, alt }) =>
                  // eslint-disable-next-line @next/next/no-img-element
                  typeof src === "string" ? <img src={src} alt={alt ?? ""} className="my-5 h-auto max-w-full rounded-xl" /> : null,
                code: ({ children }) => (
                  <code className="rounded-md bg-[var(--v2-ink-100)] px-1.5 py-0.5 text-[13px] text-[var(--v2-ink-800)]">
                    {children}
                  </code>
                ),
              }}
            >
              {preserveSourceLineBreaks(article.body)}
            </ReactMarkdown>
          </div>
        </article>
      </div>
    </div>
  );
}
