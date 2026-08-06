"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  STRATEGY_MONTH_FOCI,
  STRATEGY_NEAR_PROJECTS,
  STRATEGY_PRINCIPLES,
} from "@/lib/v2/strategy/board-content";
import {
  STRATEGY_TAG_META,
  type StrategyArticleMeta,
  type StrategyArticleTag,
} from "@/lib/v2/strategy/types";
import { appPath } from "@/lib/api-url";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const TAGS: { key: StrategyArticleTag | "all"; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "work", label: "Работа" },
  { key: "personal", label: "Личная жизнь" },
  { key: "sport", label: "Спорт" },
];

function splitParagraphs(text: string) {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function StrategyClient() {
  const [articles, setArticles] = useState<StrategyArticleMeta[]>([]);
  const [tag, setTag] = useState<StrategyArticleTag | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextTag: StrategyArticleTag | "all" = tag) => {
    setLoading(true);
    setError(null);
    try {
      const q = nextTag === "all" ? "" : `?tag=${nextTag}`;
      const data = await fetchJson<{ articles: StrategyArticleMeta[] }>(
        `/api/v2/personal/strategy${q}`
      );
      setArticles(data.articles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить");
    } finally {
      setLoading(false);
    }
  }, [tag]);

  useEffect(() => {
    void load(tag);
  }, [load, tag]);

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="relative overflow-hidden border-b border-[var(--v2-ink-100)] bg-gradient-to-br from-[var(--v2-brand-600)] via-[var(--v2-brand-500)] to-[#1F3AAF]">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,.35),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,.2),transparent_40%)]" />
        <div className="relative mx-auto max-w-[1180px] px-6 py-10 lg:px-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
            Личный план
          </p>
          <h1 className="v2-tighter mt-2 text-[40px] font-bold leading-none text-white sm:text-[48px]">
            Стратегия
          </h1>
          <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-white/80">
            Фокусы месяцев, проекты и принципы рядом. Ниже — журнал из Лилы.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1180px] px-6 py-8 lg:px-10">
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        ) : null}

        <section className="mb-12">
          <div className="mb-4">
            <h2 className="v2-tight text-[20px] font-bold text-[var(--v2-ink-900)]">
              Закреплённые фокусы
            </h2>
            <p className="mt-1 text-[13px] text-[var(--v2-ink-500)]">
              Три месяца — одна линия: закрыть главу → найти опору → усилить ответ
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {STRATEGY_MONTH_FOCI.map((focus) => (
              <article
                key={focus.month}
                className="flex flex-col overflow-hidden rounded-3xl border border-[var(--v2-ink-100)] bg-white shadow-[var(--v2-shadow-card)]"
              >
                <div className="border-b border-[var(--v2-ink-100)] bg-[var(--v2-ink-50)]/80 px-4 py-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--v2-ink-400)]">
                    {focus.month}
                  </p>
                  <h3 className="v2-tight mt-1 text-[18px] font-bold leading-snug text-[var(--v2-ink-900)]">
                    {focus.headline}
                  </h3>
                </div>
                <ul className="space-y-2.5 p-4">
                  {focus.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--v2-brand-500)]" />
                      <p className="v2-tight text-[13.5px] leading-snug text-[var(--v2-ink-800)]">
                        {item}
                      </p>
                    </li>
                  ))}
                </ul>
                {focus.dont?.length ? (
                  <div className="mt-auto border-t border-red-100 bg-red-50/70 px-4 py-3.5">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-red-600">
                      Не делать
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {focus.dont.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                          <p className="v2-tight text-[13px] leading-snug text-red-800/90">
                            {item}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <div className="mb-4">
            <h2 className="v2-tight text-[20px] font-bold text-[var(--v2-ink-900)]">
              Проекты на ближайшие 3 месяца
            </h2>
            <p className="mt-1 text-[13px] text-[var(--v2-ink-500)]">
              Роли проектов — без требования строить империю
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {STRATEGY_NEAR_PROJECTS.map((card) => (
              <article
                key={card.title}
                className="rounded-3xl border border-[var(--v2-ink-100)] bg-white p-5 shadow-[var(--v2-shadow-card)]"
              >
                <h3 className="v2-tight text-[16px] font-bold text-[var(--v2-ink-900)]">
                  {card.title}
                </h3>
                <div className="mt-3 space-y-3">
                  {splitParagraphs(card.body).map((p) => (
                    <p
                      key={p}
                      className="v2-tight text-[13.5px] leading-relaxed text-[var(--v2-ink-700)]"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <div className="mb-4">
            <h2 className="v2-tight text-[20px] font-bold text-[var(--v2-ink-900)]">
              Принципы и запреты
            </h2>
            <p className="mt-1 text-[13px] text-[var(--v2-ink-500)]">
              Как двигаться ближайшие месяцы — и чего не делать
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {STRATEGY_PRINCIPLES.map((card) => {
              const ban = card.emphasis === "ban";
              return (
                <article
                  key={card.title}
                  className={`rounded-3xl border p-5 shadow-[var(--v2-shadow-card)] ${
                    ban
                      ? "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/80"
                      : "border-[var(--v2-ink-100)] bg-white"
                  }`}
                >
                  <h3
                    className={`v2-tight text-[16px] font-bold ${
                      ban ? "text-amber-950" : "text-[var(--v2-ink-900)]"
                    }`}
                  >
                    {card.title}
                  </h3>
                  {card.body ? (
                    <div className="mt-3 space-y-3">
                      {splitParagraphs(card.body).map((p) => (
                        <p
                          key={p}
                          className={`v2-tight text-[13.5px] leading-relaxed ${
                            ban ? "text-amber-950/85" : "text-[var(--v2-ink-700)]"
                          }`}
                        >
                          {p}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  {card.items?.length ? (
                    <ul className="mt-3 space-y-2">
                      {card.items.map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--v2-brand-500)]" />
                          <p className="v2-tight text-[13.5px] leading-snug text-[var(--v2-ink-800)]">
                            {item}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="v2-tight text-[20px] font-bold text-[var(--v2-ink-900)]">Журнал</h2>
              <p className="mt-1 text-[13px] text-[var(--v2-ink-500)]">
                Статьи из Лилы — читай как телетайп с разметкой
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map((t) => {
                const active = tag === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTag(t.key)}
                    className={`h-8 rounded-full px-3 text-[12.5px] font-semibold transition ${
                      active
                        ? "bg-[var(--v2-brand-600)] text-white shadow-[var(--v2-shadow-glow)]"
                        : "bg-white text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-card)] hover:text-[var(--v2-ink-900)]"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article, index) => {
              const meta = STRATEGY_TAG_META[article.tag];
              return (
                <Link
                  key={article.slug}
                  href={appPath(`/v2/personal/strategy/${article.slug}`)}
                  className="group overflow-hidden rounded-3xl bg-white shadow-[var(--v2-shadow-card)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--v2-shadow-cardHv)]"
                  style={{
                    animation: `v2-idea-card-in .45s cubic-bezier(.2,.7,.2,1) both`,
                    animationDelay: `${index * 40}ms`,
                  }}
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-[var(--v2-ink-100)]">
                    <Image
                      src={article.cover}
                      alt=""
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width:768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                    <span
                      className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]"
                      style={{ background: meta.soft, color: meta.tint }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="v2-tight text-[16px] font-bold leading-snug text-[var(--v2-ink-900)] group-hover:text-[var(--v2-brand-700)]">
                      {article.title}
                    </h3>
                    <p className="v2-tight mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-[var(--v2-ink-500)]">
                      {article.excerpt}
                    </p>
                    <p className="mt-3 text-[12px] font-semibold text-[var(--v2-brand-600)]">
                      Читать →
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {!loading && !articles.length ? (
            <div className="rounded-3xl border border-dashed border-[var(--v2-ink-200)] bg-white px-6 py-14 text-center text-[13px] text-[var(--v2-ink-500)]">
              В этом теге пока нет статей
            </div>
          ) : null}
        </section>
      </div>

      <style>{`
        @keyframes v2-idea-card-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}
