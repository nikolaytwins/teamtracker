"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  STRATEGY_TAG_META,
  type StrategyArticleMeta,
  type StrategyArticleTag,
  type StrategyPinRow,
} from "@/lib/v2/strategy/types";
import { V2Icons } from "@/components/v2/ui/icons";
import { appPath } from "@/lib/api-url";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const TAGS: { key: StrategyArticleTag | "all"; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "work", label: "Работа" },
  { key: "personal", label: "Личная жизнь" },
  { key: "sport", label: "Спорт" },
];

const MONTH_PRESETS = ["Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь", "Январь"];

function groupPins(pins: StrategyPinRow[]) {
  const order: string[] = [];
  const map = new Map<string, StrategyPinRow[]>();
  for (const pin of pins) {
    if (!map.has(pin.month_label)) {
      map.set(pin.month_label, []);
      order.push(pin.month_label);
    }
    map.get(pin.month_label)!.push(pin);
  }
  return order.map((month) => ({ month, items: map.get(month)! }));
}

export function StrategyClient() {
  const [pins, setPins] = useState<StrategyPinRow[]>([]);
  const [articles, setArticles] = useState<StrategyArticleMeta[]>([]);
  const [tag, setTag] = useState<StrategyArticleTag | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [monthLabel, setMonthLabel] = useState("Август");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (nextTag: StrategyArticleTag | "all" = tag) => {
    setLoading(true);
    setError(null);
    try {
      const q = nextTag === "all" ? "" : `?tag=${nextTag}`;
      const data = await fetchJson<{ pins: StrategyPinRow[]; articles: StrategyArticleMeta[] }>(
        `/api/v2/personal/strategy${q}`
      );
      setPins(data.pins);
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

  const grouped = useMemo(() => groupPins(pins), [pins]);

  async function addPin() {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { pin } = await fetchJson<{ pin: StrategyPinRow }>("/api/v2/personal/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthLabel, title: title.trim() }),
      });
      setPins((prev) => [...prev, pin]);
      setTitle("");
      setAddOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить");
    } finally {
      setSaving(false);
    }
  }

  async function removePin(id: string) {
    if (!confirm("Убрать карточку с доски?")) return;
    try {
      await fetchJson(`/api/v2/personal/strategy/pins/${id}`, { method: "DELETE" });
      setPins((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить");
    }
  }

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
            Фокусы месяцев сверху — живая доска обязательств. Ниже — журнал из Лилы: работа, личная жизнь
            и спорт.
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
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="v2-tight text-[20px] font-bold text-[var(--v2-ink-900)]">
                Закреплённые фокусы
              </h2>
              <p className="mt-1 text-[13px] text-[var(--v2-ink-500)]">
                Добавляй и снимай карточки — это то, что держишь на виду
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-3.5 text-[13px] font-semibold text-white transition hover:bg-[var(--v2-ink-800)]"
            >
              <V2Icons.plus className="h-4 w-4" />
              Карточка
            </button>
          </div>

          {loading && !pins.length ? (
            <p className="text-[13px] text-[var(--v2-ink-400)]">Загрузка…</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {grouped.map((group) => (
                <div
                  key={group.month}
                  className="overflow-hidden rounded-3xl border border-[var(--v2-ink-100)] bg-white shadow-[var(--v2-shadow-card)]"
                >
                  <div className="border-b border-[var(--v2-ink-100)] bg-[var(--v2-ink-50)]/80 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--v2-ink-400)]">
                      Месяц
                    </p>
                    <h3 className="v2-tight mt-0.5 text-[22px] font-bold text-[var(--v2-ink-900)]">
                      {group.month}
                    </h3>
                  </div>
                  <ul className="space-y-2 p-3">
                    {group.items.map((pin) => (
                      <li
                        key={pin.id}
                        className="group flex items-start gap-2 rounded-2xl bg-[var(--v2-ink-50)]/70 px-3 py-3"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--v2-brand-500)]" />
                        <p className="v2-tight min-w-0 flex-1 text-[13.5px] font-medium leading-snug text-[var(--v2-ink-800)]">
                          {pin.title}
                        </p>
                        <button
                          type="button"
                          title="Удалить"
                          onClick={() => void removePin(pin.id)}
                          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--v2-ink-300)] opacity-70 transition hover:bg-red-50 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <V2Icons.trash className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
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
                  style={{ animation: `v2-idea-card-in .45s cubic-bezier(.2,.7,.2,1) both`, animationDelay: `${index * 40}ms` }}
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

      {addOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setAddOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="v2-tight text-[17px] font-bold text-[var(--v2-ink-900)]">
              Новая закреплённая карточка
            </h3>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void addPin();
              }}
            >
              <label className="block text-[12px] font-medium text-[var(--v2-ink-600)]">
                Месяц
                <select
                  className="v2-input mt-1 h-10 w-full text-[14px]"
                  value={monthLabel}
                  onChange={(e) => setMonthLabel(e.target.value)}
                >
                  {MONTH_PRESETS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[12px] font-medium text-[var(--v2-ink-600)]">
                Формулировка
                <input
                  autoFocus
                  className="v2-input mt-1 h-10 w-full text-[14px]"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Что держим в фокусе…"
                />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="h-10 rounded-xl border border-[var(--v2-ink-200)] px-4 text-[13px] font-semibold text-[var(--v2-ink-600)]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="h-10 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-semibold text-white disabled:opacity-40"
                >
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <style>{`
        @keyframes v2-idea-card-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}
