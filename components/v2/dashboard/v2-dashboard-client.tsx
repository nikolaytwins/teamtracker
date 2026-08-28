"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { V2DashboardPayload } from "@/lib/v2/dashboard/load-dashboard";
import { formatPersonalRub } from "@/lib/v2/personal/formatters";
import { appPath } from "@/lib/api-url";
import { V2Icons } from "@/components/v2/ui/icons";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function splitParagraphs(text: string) {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
        {label}
      </p>
      <p className="v2-tnum v2-tight mt-1.5 text-[22px] font-bold text-[var(--v2-ink-900)]">
        {value}
      </p>
      {hint ? <p className="mt-1 text-[12px] text-[var(--v2-ink-500)]">{hint}</p> : null}
    </>
  );
  const cls =
    "rounded-2xl border border-[var(--v2-ink-100)] bg-white p-4 shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]";
  if (href) {
    return (
      <Link href={appPath(href)} className={`block ${cls}`}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}

export function V2DashboardClient() {
  const [data, setData] = useState<V2DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchJson<V2DashboardPayload>("/api/v2/dashboard");
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const finance = data?.personal.finance;
  const focus = data?.strategy.currentFocus;
  const week = data?.personal.weekFocus;
  const openGoals = week?.goals.filter((g) => !g.completed_at) ?? [];
  const doneGoals = week?.goals.filter((g) => g.completed_at) ?? [];

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="relative overflow-hidden border-b border-[var(--v2-ink-100)] bg-gradient-to-br from-[var(--v2-brand-600)] via-[var(--v2-brand-500)] to-[#1F3AAF]">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,.35),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,.2),transparent_40%)]" />
        <div className="relative mx-auto flex max-w-[1180px] flex-wrap items-end justify-between gap-4 px-6 py-10 lg:px-10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              {data?.now.monthLabel ?? "…"} · сегодня
            </p>
            <h1 className="v2-tighter mt-2 text-[40px] font-bold leading-none text-white sm:text-[48px]">
              Дашборд
            </h1>
            <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-white/80">
              Фокус месяца, запреты, деньги и ближайшие действия — в одном месте.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={appPath("/v2/personal/strategy")}
              className="inline-flex h-9 items-center rounded-xl bg-white/15 px-3.5 text-[13px] font-semibold text-white backdrop-blur transition hover:bg-white/25"
            >
              Стратегия
            </Link>
            <Link
              href={appPath("/v2/board")}
              className="inline-flex h-9 items-center rounded-xl bg-white px-3.5 text-[13px] font-semibold text-[var(--v2-brand-700)] transition hover:bg-white/90"
            >
              Доска задач
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1180px] space-y-8 px-6 py-8 lg:px-10">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        ) : null}

        {loading && !data ? (
          <p className="text-[13px] text-[var(--v2-ink-400)]">Загрузка…</p>
        ) : null}

        {data?.strategy.bans.map((ban) => (
          <section
            key={ban.title}
            className="overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-white shadow-[var(--v2-shadow-card)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-200/80 px-5 py-4">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                  Запрет до 1 ноября
                </p>
                <h2 className="v2-tight mt-1 text-[20px] font-bold text-amber-950">{ban.title}</h2>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-900">
                Активно сейчас
              </span>
            </div>
            <div className="space-y-3 px-5 py-4">
              {ban.body
                ? splitParagraphs(ban.body).map((p) => (
                    <p
                      key={p}
                      className="v2-tight text-[14px] leading-relaxed text-amber-950/85"
                    >
                      {p}
                    </p>
                  ))
                : null}
            </div>
          </section>
        ))}

        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <article className="rounded-3xl border border-[var(--v2-ink-100)] bg-white shadow-[var(--v2-shadow-card)]">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--v2-ink-100)] px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-400)]">
                  Фокус · {data?.now.monthLabel}
                </p>
                <h2 className="v2-tight mt-1 text-[22px] font-bold text-[var(--v2-ink-900)]">
                  {focus?.headline ?? "Нет карточки на этот месяц"}
                </h2>
              </div>
              <Link
                href={appPath("/v2/personal/strategy")}
                className="text-[12px] font-semibold text-[var(--v2-brand-600)]"
              >
                Все месяцы →
              </Link>
            </div>
            {focus ? (
              <>
                <ul className="space-y-2.5 p-5">
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
                  <div className="border-t border-red-100 bg-red-50/70 px-5 py-4">
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
              </>
            ) : (
              <p className="p-5 text-[13px] text-[var(--v2-ink-500)]">
                Открой Стратегию — там фокусы Август–Октябрь.
              </p>
            )}
          </article>

          <article className="rounded-3xl border border-[var(--v2-ink-100)] bg-white p-5 shadow-[var(--v2-shadow-card)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="v2-tight text-[16px] font-bold text-[var(--v2-ink-900)]">
                Фокус недели
              </h2>
              <Link
                href={appPath("/v2/personal/calendar")}
                className="text-[12px] font-semibold text-[var(--v2-brand-600)]"
              >
                Календарь →
              </Link>
            </div>
            {week ? (
              <>
                <p className="mt-1 text-[12px] text-[var(--v2-ink-400)]">{week.label}</p>
                <p className="v2-tight mt-3 text-[15px] font-semibold leading-snug text-[var(--v2-ink-900)]">
                  {week.result_title || "Результат недели не задан"}
                </p>
                <ul className="mt-4 space-y-2">
                  {openGoals.slice(0, 5).map((g) => (
                    <li key={g.id} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--v2-brand-500)]" />
                      <p className="v2-tight text-[13px] leading-snug text-[var(--v2-ink-800)]">
                        {g.title}
                      </p>
                    </li>
                  ))}
                  {!openGoals.length ? (
                    <p className="text-[13px] text-[var(--v2-ink-500)]">
                      Открытых целей нет{doneGoals.length ? ` · сделано ${doneGoals.length}` : ""}
                    </p>
                  ) : null}
                </ul>
              </>
            ) : (
              <p className="mt-3 text-[13px] text-[var(--v2-ink-500)]">Нет данных за неделю</p>
            )}
          </article>
        </section>

        {finance ? (
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="v2-tight text-[18px] font-bold text-[var(--v2-ink-900)]">Деньги</h2>
              <Link
                href={appPath("/v2/personal/finance")}
                className="text-[12px] font-semibold text-[var(--v2-brand-600)]"
              >
                Финансы →
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Свободные"
                value={formatPersonalRub(finance.disposable)}
                href="/v2/personal/finance/accounts"
              />
              <Stat
                label="Капитал"
                value={formatPersonalRub(finance.netWorth)}
                href="/v2/personal/finance"
              />
              <Stat
                label="Бюджет месяца"
                value={formatPersonalRub(finance.budgetLeft)}
                hint={`осталось из ${formatPersonalRub(finance.budgetLimit)}`}
                href="/v2/personal/finance"
              />
              <Stat
                label="Прибыль месяца"
                value={formatPersonalRub(finance.monthProfit)}
                hint={`доход ${formatPersonalRub(finance.incomeReceived)} / ожид. ${formatPersonalRub(finance.incomeExpected)}`}
                href="/v2/agency"
              />
            </div>
          </section>
        ) : null}

        {data?.agency ? (
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="v2-tight text-[18px] font-bold text-[var(--v2-ink-900)]">
                Агентство · {data.now.monthLabel}
              </h2>
              <Link
                href={appPath("/v2/agency")}
                className="text-[12px] font-semibold text-[var(--v2-brand-600)]"
              >
                Проекты и финансы →
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Ожид. выручка"
                value={formatPersonalRub(data.agency.summary.expectedRevenue)}
              />
              <Stat
                label="Факт выручка"
                value={formatPersonalRub(data.agency.summary.actualRevenue)}
              />
              <Stat label="Прибыль" value={formatPersonalRub(data.agency.summary.profit)} />
              <Stat
                label="Проекты"
                value={String(data.agency.summary.projectCount)}
                hint={`маржа ${Math.round(data.agency.summary.margin)}%`}
              />
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-3xl border border-[var(--v2-ink-100)] bg-white p-5 shadow-[var(--v2-shadow-card)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="v2-tight text-[16px] font-bold text-[var(--v2-ink-900)]">
                Личные задачи
              </h2>
              <Link
                href={appPath("/v2/personal/ideas-tasks")}
                className="text-[12px] font-semibold text-[var(--v2-brand-600)]"
              >
                Сегодня →
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-[var(--v2-ink-50)] px-2.5 py-1 text-[12px] font-semibold text-[var(--v2-ink-700)]">
                Сегодня {data?.personal.todos.today ?? 0}
              </span>
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-[12px] font-semibold text-red-700">
                Просрочено {data?.personal.todos.overdue ?? 0}
              </span>
              <span className="rounded-full bg-[var(--v2-brand-50)] px-2.5 py-1 text-[12px] font-semibold text-[var(--v2-brand-700)]">
                Inbox {data?.personal.todos.inbox ?? 0}
              </span>
            </div>
            <ul className="mt-4 space-y-2">
              {(data?.personal.todayTodos ?? []).map((t) => (
                <li
                  key={t.id}
                  className="rounded-xl bg-[var(--v2-ink-50)]/80 px-3 py-2.5 text-[13.5px] font-medium text-[var(--v2-ink-800)]"
                >
                  {t.title}
                </li>
              ))}
              {!data?.personal.todayTodos.length ? (
                <p className="text-[13px] text-[var(--v2-ink-500)]">На сегодня пусто</p>
              ) : null}
            </ul>
          </article>

          <article className="rounded-3xl border border-[var(--v2-ink-100)] bg-white p-5 shadow-[var(--v2-shadow-card)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="v2-tight text-[16px] font-bold text-[var(--v2-ink-900)]">
                Проекты на 3 месяца
              </h2>
              <Link
                href={appPath("/v2/personal/strategy")}
                className="text-[12px] font-semibold text-[var(--v2-brand-600)]"
              >
                Стратегия →
              </Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {data?.strategy.nearProjects.map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl bg-[var(--v2-ink-50)]/80 px-3.5 py-3"
                >
                  <p className="text-[13px] font-bold text-[var(--v2-ink-900)]">{p.title}</p>
                  <p className="v2-tight mt-1.5 line-clamp-3 text-[12.5px] leading-relaxed text-[var(--v2-ink-600)]">
                    {splitParagraphs(p.body)[0]}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="v2-tight text-[18px] font-bold text-[var(--v2-ink-900)]">
              Принципы
            </h2>
            <Link
              href={appPath("/v2/personal/strategy")}
              className="text-[12px] font-semibold text-[var(--v2-brand-600)]"
            >
              Полный текст →
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {data?.strategy.principles.map((card) => (
              <article
                key={card.title}
                className="rounded-3xl border border-[var(--v2-ink-100)] bg-white p-4 shadow-[var(--v2-shadow-card)]"
              >
                <h3 className="v2-tight text-[14px] font-bold text-[var(--v2-ink-900)]">
                  {card.title}
                </h3>
                {card.body ? (
                  <p className="v2-tight mt-2 line-clamp-5 text-[12.5px] leading-relaxed text-[var(--v2-ink-600)]">
                    {splitParagraphs(card.body).join(" ")}
                  </p>
                ) : null}
                {card.items?.length ? (
                  <ul className="mt-2 space-y-1.5">
                    {card.items.slice(0, 4).map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--v2-brand-500)]" />
                        <p className="v2-tight text-[12.5px] leading-snug text-[var(--v2-ink-700)]">
                          {item}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        {(data?.team || data?.strategy.nextFocus) && (
          <section className="grid gap-4 lg:grid-cols-2">
            {data.team ? (
              <article className="rounded-3xl border border-[var(--v2-ink-100)] bg-white p-5 shadow-[var(--v2-shadow-card)]">
                <div className="flex items-center justify-between">
                  <h2 className="v2-tight text-[16px] font-bold text-[var(--v2-ink-900)]">
                    Командная работа
                  </h2>
                  <Link
                    href={appPath("/v2/board")}
                    className="text-[12px] font-semibold text-[var(--v2-brand-600)]"
                  >
                    Доска →
                  </Link>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[11px] text-[var(--v2-ink-400)]">Проекты</p>
                    <p className="v2-tnum mt-1 text-[22px] font-bold">{data.team.activeProjects}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--v2-ink-400)]">Открыто</p>
                    <p className="v2-tnum mt-1 text-[22px] font-bold">{data.team.openTasks}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--v2-ink-400)]">Просрочено</p>
                    <p className="v2-tnum mt-1 text-[22px] font-bold text-red-600">
                      {data.team.overdueTasks}
                    </p>
                  </div>
                </div>
              </article>
            ) : null}

            {data.strategy.nextFocus ? (
              <article className="rounded-3xl border border-dashed border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)]/50 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-400)]">
                  Дальше · {data.strategy.nextFocus.month}
                </p>
                <h2 className="v2-tight mt-1 text-[18px] font-bold text-[var(--v2-ink-900)]">
                  {data.strategy.nextFocus.headline}
                </h2>
                <ul className="mt-3 space-y-1.5">
                  {data.strategy.nextFocus.items.slice(0, 3).map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--v2-ink-300)]" />
                      <p className="v2-tight text-[12.5px] leading-snug text-[var(--v2-ink-600)]">
                        {item}
                      </p>
                    </li>
                  ))}
                </ul>
              </article>
            ) : null}
          </section>
        )}

        <section className="flex flex-wrap gap-2 pb-6">
          {[
            { href: "/v2/personal/ideas-tasks", label: "Задачи", icon: "tasks" as const },
            { href: "/v2/personal/calendar", label: "Календарь", icon: "cal" as const },
            { href: "/v2/personal/ideas", label: "Идеи", icon: "spark" as const },
            { href: "/v2/personal/strategy", label: "Стратегия", icon: "flag" as const },
            { href: "/v2/personal/finance", label: "Финансы", icon: "ruble" as const },
            { href: "/v2/board", label: "Доска", icon: "kanban" as const },
          ].map((item) => {
            const Icon = V2Icons[item.icon];
            return (
              <Link
                key={item.href}
                href={appPath(item.href)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] transition hover:text-[var(--v2-ink-900)]"
              >
                <Icon className="h-4 w-4 text-[var(--v2-brand-600)]" />
                {item.label}
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}
