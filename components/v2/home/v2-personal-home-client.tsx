"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type SVGProps } from "react";
import { appPath } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { V2Icons } from "@/components/v2/ui/icons";
import { FINANCE_MONTH_NAMES, formatRub } from "@/lib/v2/finance/meta";
import {
  HOME_BETS,
  HOME_CHECKS,
  HOME_LILA_BAN,
  HOME_LINKS,
  HOME_MONEY,
  HOME_MONTHS,
  HOME_NOT_NOW,
  HOME_RULES,
  HOME_RULE_CONTRAST,
  HOME_SEASON,
  HOME_SPRINT,
  HOME_SPRINT_GOALS,
  HOME_TRAININGS,
  HOME_VIDEO,
  HOME_VIDEO_ST,
  homeFmt,
  homeFmtK,
  type HomeVideoStatus,
} from "@/lib/v2/personal/seeds/home-seed";

const CALENDAR_HREF = "/v2/personal/calendar";

/* -------------------------------- ИКОНКИ --------------------------------- */
type IconProps = SVGProps<SVGSVGElement>;

const HI = {
  plus: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  bell: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  arrowR: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M9.5 6.5 15 12l-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  check: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="m6 12.5 4 4 8-9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  video: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="3.5" y="6.5" width="12" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m15.5 12 5-3v9l-5-3v-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  minus: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M6 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

/** Синий макета отличается от --v2-brand-600, поэтому задаётся явно. */
const HERO_BLUE = "#2d5eef";

function videoOpacity(status: HomeVideoStatus) {
  if (status === "опубликовано") return 1;
  if (status === "монтаж") return 0.7;
  return 0.28;
}

/* -------------------------------- ДАТЫ ----------------------------------- */
function toYmd(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function mondayOf(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function formatWeekLabel(monday: Date) {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const fmt = (d: Date) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(d);
  return `${fmt(monday)} — ${fmt(sunday)}`;
}

/* ------------------------------- TOPBAR ---------------------------------- */
function Topbar() {
  return (
    <div className="flex h-14 items-center gap-3 px-8">
      <div className="flex items-center gap-2 text-[13px] text-[var(--v2-ink-500)]">
        <span className="v2-tight font-medium text-[var(--v2-ink-900)]">Главная</span>
        <span className="text-[var(--v2-ink-300)]">/</span>
        <span className="v2-tight text-[var(--v2-ink-400)]">{HOME_SEASON.day}</span>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <Link
          href={appPath(HOME_LINKS.observations)}
          className="v2-tight inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[12.5px] font-medium text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
        >
          <HI.plus className="h-4 w-4 text-[var(--v2-ink-400)]" /> Запись в дневник
        </Link>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--v2-ink-500)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
        >
          <span className="relative">
            <HI.bell className="h-[18px] w-[18px]" />
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--v2-brand-500)] ring-2 ring-white" />
          </span>
        </button>
      </div>
    </div>
  );
}

/* -------------------------------- СЕЗОН ---------------------------------- */
function SeasonHero() {
  return (
    <section
      className="rounded-2xl px-8 py-8 text-white shadow-[var(--v2-shadow-soft)]"
      style={{ background: HERO_BLUE }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
          {HOME_SEASON.kicker}
        </span>
        <span className="h-1 w-1 rounded-full bg-white/25" />
        <span className="v2-tight text-[12px] text-white/55">{HOME_SEASON.dates}</span>
      </div>
      <p
        className="v2-tight mt-3.5 max-w-[52ch] text-[30px] font-medium leading-[1.28] text-white"
        style={{ textWrap: "pretty" }}
      >
        {HOME_SEASON.idea}
      </p>
      <div className="mt-7 flex items-center gap-4">
        <div className="h-1 max-w-[420px] flex-1 overflow-hidden rounded-full bg-white/15">
          <span
            className="block h-full rounded-full bg-white/80"
            style={{ width: `${HOME_SEASON.progress * 100}%` }}
          />
        </div>
        <span className="v2-tight shrink-0 text-[12px] text-white/45">Review · {HOME_SEASON.review}</span>
        <Link
          href={appPath(HOME_LINKS.strategy)}
          className="v2-tight ml-auto inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-white/85 transition hover:text-white"
        >
          Стратегия <HI.arrowR className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}

/* -------------------------------- ЛИЛА ----------------------------------- */
function LilaBanner() {
  return (
    <section
      className="flex items-start gap-7 rounded-2xl bg-white px-8 py-7"
      style={{
        boxShadow:
          "0 1px 2px rgba(16,24,40,0.03), 0 12px 36px -16px rgba(30,52,120,0.12), inset 3px 0 0 #DC2626",
      }}
    >
      <span
        className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[24px] text-white"
        style={{ background: "#DC2626" }}
      >
        {HOME_LILA_BAN.mark}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-400)]">
          {HOME_LILA_BAN.title}
        </div>
        <div
          className="v2-tight mt-1.5 max-w-[46ch] text-[24px] font-semibold leading-snug text-[var(--v2-ink-900)]"
          style={{ textWrap: "pretty" }}
        >
          {HOME_LILA_BAN.text}
        </div>
        <p
          className="v2-tight mt-2.5 max-w-[62ch] text-[15px] leading-relaxed text-[var(--v2-ink-500)]"
          style={{ textWrap: "pretty" }}
        >
          {HOME_LILA_BAN.note}
        </p>
      </div>
    </section>
  );
}

/* ---------------------------- ФОКУС НЕДЕЛИ -------------------------------- */
type WeekFocusPriority = "high" | "medium" | "low";

type WeekFocusGoal = {
  id: string;
  title: string;
  priority: WeekFocusPriority;
  completed_at: string | null;
};

type WeekFocusPayload = {
  week_start: string;
  week_end: string;
  label: string;
  result_title: string;
  goals: WeekFocusGoal[];
};

const FOCUS_PRIORITY: Record<WeekFocusPriority, { label: string; tint: string; bg: string }> = {
  high: { label: "обязательно", tint: "#B42318", bg: "#FEE4E2" },
  medium: { label: "желательно", tint: "#B54708", bg: "#FEF0C7" },
  low: { label: "можно не делать", tint: "#475467", bg: "#EAECF0" },
};

function WeekFocusBoard() {
  const [focus, setFocus] = useState<WeekFocusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<WeekFocusPriority>("medium");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchJson<{ weekFocus: WeekFocusPayload }>(
        `/api/v2/personal/calendar/week-focus?date=${toYmd(new Date())}`
      );
      setFocus(res.weekFocus);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить фокус недели");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addGoal = async () => {
    const text = title.trim();
    if (!text || !focus || busy) return;
    setBusy(true);
    try {
      await fetchJson("/api/v2/personal/calendar/week-focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_start: focus.week_start, title: text, priority }),
      });
      setTitle("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить фокус");
    } finally {
      setBusy(false);
    }
  };

  const toggleGoal = async (goal: WeekFocusGoal) => {
    const completed = !goal.completed_at;
    setFocus((prev) =>
      prev
        ? {
            ...prev,
            goals: prev.goals.map((g) =>
              g.id === goal.id ? { ...g, completed_at: completed ? new Date().toISOString() : null } : g
            ),
          }
        : prev
    );
    try {
      await fetchJson(`/api/v2/personal/calendar/week-focus/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
    } catch {
      await load();
    }
  };

  return (
    <section
      className="rounded-2xl px-7 py-6 text-white shadow-[var(--v2-shadow-soft)]"
      style={{ background: HERO_BLUE }}
    >
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="v2-tight text-[19px] font-semibold text-white">Фокус недели</h2>
        <span className="v2-tight text-[13px] text-white/55">{focus?.label ?? "…"}</span>
        <Link
          href={appPath(CALENDAR_HREF)}
          className="v2-tight ml-auto inline-flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-white/85 transition hover:text-white"
        >
          Календарь <HI.arrowR className="h-3 w-3" />
        </Link>
      </div>

      <p
        className="v2-tight mt-2 max-w-[56ch] text-[26px] font-semibold leading-[1.3] text-white"
        style={{ textWrap: "pretty" }}
      >
        {focus?.result_title ?? "Главный результат недели"}
      </p>

      {error ? <p className="v2-tight mt-3 text-[12.5px] text-white/70">{error}</p> : null}

      <div className="mt-5 grid grid-cols-4 gap-2.5">
        {(focus?.goals ?? []).map((g) => {
          const p = FOCUS_PRIORITY[g.priority];
          const done = Boolean(g.completed_at);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => void toggleGoal(g)}
              className={`rounded-xl bg-white px-3.5 py-3 text-left shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)] ${
                done ? "opacity-55" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-md transition ${
                    done ? "bg-emerald-500 text-white" : "bg-[var(--v2-ink-100)] text-transparent"
                  }`}
                >
                  <HI.check className="h-[11px] w-[11px]" />
                </span>
                <span
                  className="v2-tight rounded px-1.5 py-[2px] text-[10px] font-semibold uppercase tracking-[0.08em]"
                  style={{ background: p.bg, color: p.tint }}
                >
                  {p.label}
                </span>
              </div>
              <p
                className={`v2-tight mt-2 text-[13.5px] leading-snug text-[var(--v2-ink-800)] ${
                  done ? "line-through" : ""
                }`}
                style={{ textWrap: "pretty" }}
              >
                {g.title}
              </p>
            </button>
          );
        })}
        {focus && !focus.goals.length ? (
          <p className="v2-tight col-span-4 text-[13.5px] text-white/70">
            Фокусов на эту неделю пока нет — добавьте ниже.
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void addGoal();
            }
          }}
          placeholder="Добавить фокус недели…"
          className="v2-tight h-10 min-w-[260px] flex-1 rounded-xl bg-white/12 px-3.5 text-[13.5px] text-white outline-none transition placeholder:text-white/50 focus:bg-white/18"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as WeekFocusPriority)}
          className="v2-tight h-10 cursor-pointer appearance-none rounded-xl bg-white/12 px-3 text-[13px] text-white outline-none"
        >
          <option value="high" className="text-[var(--v2-ink-900)]">
            обязательно
          </option>
          <option value="medium" className="text-[var(--v2-ink-900)]">
            желательно
          </option>
          <option value="low" className="text-[var(--v2-ink-900)]">
            можно не делать
          </option>
        </select>
        <button
          type="button"
          disabled={!title.trim() || busy || !focus}
          onClick={() => void addGoal()}
          className="v2-tight inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-[13px] font-medium text-[var(--v2-ink-900)] transition hover:bg-white/90 disabled:opacity-45"
        >
          <HI.plus className="h-4 w-4" /> Добавить
        </button>
      </div>
    </section>
  );
}

/* ------------------------------- МЕСЯЦЫ ---------------------------------- */
function MonthBand({ month, setMonth }: { month: string; setMonth: (id: string) => void }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="v2-tight text-[19px] font-semibold text-[var(--v2-ink-900)]">Расписание сезона</h2>
        <span className="v2-tight text-[13px] text-[var(--v2-ink-500)]">
          Четыре периода до Review. Клик — выбрать текущий.
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {HOME_MONTHS.map((x) => {
          const active = x.id === month;
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => setMonth(x.id)}
              className={`flex flex-col rounded-2xl p-5 text-left transition ${
                active
                  ? "text-white shadow-[var(--v2-shadow-soft)]"
                  : "bg-white shadow-[var(--v2-shadow-card)] hover:shadow-[var(--v2-shadow-cardHv)]"
              }`}
              style={active ? { background: HERO_BLUE } : undefined}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
                    active ? "text-white/50" : "text-[var(--v2-ink-400)]"
                  }`}
                >
                  {x.tag}
                </span>
                {x.state === "сейчас" ? (
                  <span
                    className={`rounded px-1.5 py-[2px] text-[10px] font-semibold uppercase tracking-[0.1em] ${
                      active ? "bg-white/15 text-white/80" : "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]"
                    }`}
                  >
                    сейчас
                  </span>
                ) : null}
              </div>
              <div
                className={`v2-tighter mt-2 text-[22px] font-semibold ${
                  active ? "text-white" : "text-[var(--v2-ink-900)]"
                }`}
              >
                {x.label}
              </div>
              <div
                className={`v2-tight mt-2 text-[16px] font-medium leading-snug ${
                  active ? "text-white" : "text-[var(--v2-ink-900)]"
                }`}
                style={{ textWrap: "pretty" }}
              >
                {x.headline}
              </div>
              <p
                className={`v2-tight mt-2 text-[13px] leading-relaxed ${
                  active ? "text-white/60" : "text-[var(--v2-ink-500)]"
                }`}
                style={{ textWrap: "pretty" }}
              >
                {x.lead}
              </p>
              <div
                className={`mt-4 flex flex-col gap-1.5 border-t pt-3.5 ${
                  active ? "border-white/12" : "border-[var(--v2-ink-100)]"
                }`}
              >
                {x.focus.map((f, i) => (
                  <div key={f} className="flex gap-2.5">
                    <span
                      className={`v2-tnum mt-[3px] shrink-0 text-[10.5px] font-semibold ${
                        active ? "text-white/30" : "text-[var(--v2-ink-300)]"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`v2-tight text-[13px] leading-snug ${
                        active ? "text-white/85" : "text-[var(--v2-ink-700)]"
                      }`}
                      style={{ textWrap: "pretty" }}
                    >
                      {f}
                    </span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------------------- ЦЕЛИ СПРИНТА -------------------------------- */
function SprintGoals() {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="v2-tight text-[19px] font-semibold text-[var(--v2-ink-900)]">{HOME_SPRINT.label}</h2>
        <span className="v2-tight text-[13px] text-[var(--v2-ink-500)]">{HOME_SPRINT.dates}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {HOME_SPRINT_GOALS.map((g) => (
          <div
            key={g.id}
            className="flex flex-col rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: g.tint }} />
              <span className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">{g.name}</span>
            </div>
            <div className="mt-3 rounded-xl px-3 py-2.5" style={{ background: g.bg }}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: g.tint }}>
                Цель
              </div>
              <div className="v2-tight mt-0.5 text-[14px] font-medium leading-snug text-[var(--v2-ink-900)]">
                {g.goal}
              </div>
            </div>
            <div className="mt-3.5 flex flex-col gap-2">
              {g.items.map((it) => (
                <div key={it} className="v2-tight flex gap-2.5 text-[13px] leading-relaxed text-[var(--v2-ink-600)]">
                  <HI.minus className="mt-[4px] h-3.5 w-3.5 shrink-0 text-[var(--v2-ink-300)]" />
                  <span>{it}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------- СТАВКИ СЕЗОНА ------------------------------- */
function BetCards() {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="v2-tight text-[19px] font-semibold text-[var(--v2-ink-900)]">Ставки сезона</h2>
        <span className="v2-tight text-[13px] text-[var(--v2-ink-500)]">
          Главные гипотезы. Проверяются до 30 ноября.
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {HOME_BETS.map((b) => (
          <div
            key={b.id}
            className="flex flex-col rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
          >
            <div className="flex items-center gap-2.5">
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-[14px]"
                style={{ background: b.bg }}
              >
                {b.mark}
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: b.tint }}>
                  {b.kicker}
                </div>
                <div className="v2-tight truncate text-[15px] font-semibold text-[var(--v2-ink-900)]">{b.name}</div>
              </div>
            </div>
            <p className="v2-tight mt-3.5 text-[14px] leading-[1.55] text-[var(--v2-ink-800)]" style={{ textWrap: "pretty" }}>
              {b.hyp}
            </p>
            <div className="mt-auto flex items-center gap-3 pt-4">
              <span className="v2-tight text-[12px] text-[var(--v2-ink-500)]">{b.horizon}</span>
              <Link
                href={appPath(b.href)}
                className="v2-tight ml-auto inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-[var(--v2-brand-700)] transition hover:text-[var(--v2-brand-800)]"
              >
                Открыть <HI.arrowR className="h-3 w-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function NotNow() {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-card)]">
      <div className="flex items-baseline gap-3">
        <h3 className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">Не сейчас</h3>
        <span className="v2-tight text-[12.5px] text-[var(--v2-ink-500)]">
          Решения, которые сознательно отложены до Review.
        </span>
      </div>
      <div className="mt-3.5 grid grid-cols-3 gap-x-6 gap-y-2">
        {HOME_NOT_NOW.map((n) => (
          <div key={n} className="v2-tight flex items-center gap-2.5 text-[13.5px] text-[var(--v2-ink-600)]">
            <HI.minus className="h-3.5 w-3.5 shrink-0 text-[var(--v2-ink-300)]" />
            {n}
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------- ДЕНЬГИ: ИТОГИ ПО ВСЕМ ПРОЕКТАМ --------------------- */
type HomeFinanceSummary = {
  expectedRevenue: number;
  actualRevenue: number;
  projectExpenses: number;
  manualGeneralExpenses: number;
  taxAmount: number;
  totalExpenses: number;
  profit: number;
  margin: number;
  projectCount: number;
};

function ProjectsKpiCard({
  label,
  value,
  sub,
  accent,
  icon: Icon,
  tone = "ink",
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "ink" | "green" | "red";
}) {
  const toneClass =
    tone === "red" ? "text-red-500" : tone === "green" ? "text-emerald-600" : "text-[var(--v2-ink-900)]";
  return (
    <Link
      href={appPath("/v2/agency")}
      className="block rounded-2xl bg-white p-4 shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
    >
      <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-lg"
          style={{ background: `${accent}14`, color: accent }}
        >
          <Icon className="h-[15px] w-[15px]" />
        </span>
        {label}
      </div>
      <div className={`v2-tnum v2-tighter mt-1.5 text-[24px] font-semibold ${toneClass}`}>{value}</div>
      <div className="v2-tight mt-1 text-[11.5px] text-[var(--v2-ink-500)]">{sub}</div>
    </Link>
  );
}

function ProjectsMoneyStrip() {
  const [summary, setSummary] = useState<HomeFinanceSummary | null>(null);
  const [monthLabel, setMonthLabel] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchJson<{ year: number; month: number; summary: HomeFinanceSummary }>(
          "/api/v2/finance/dashboard"
        );
        setSummary(data.summary);
        setMonthLabel(`${FINANCE_MONTH_NAMES[data.month - 1]?.toLowerCase() ?? ""} ${data.year}`);
      } catch {
        setSummary(null);
      }
    })();
  }, []);

  if (!summary) return null;

  const paidShare = summary.expectedRevenue
    ? Math.round((summary.actualRevenue / summary.expectedRevenue) * 100)
    : 0;

  return (
    <section className="grid grid-cols-4 gap-3">
      <ProjectsKpiCard
        label="Предполагаемая выручка"
        value={formatRub(summary.expectedRevenue)}
        sub={`${summary.projectCount} проектов · ${monthLabel}`}
        accent="#3B6FF7"
        icon={V2Icons.projects}
      />
      <ProjectsKpiCard
        label="Фактическая выручка"
        value={formatRub(summary.actualRevenue)}
        sub={summary.expectedRevenue ? `${paidShare}% оплачено` : "нет проектов"}
        accent="#0EA5A4"
        icon={V2Icons.ruble}
      />
      <ProjectsKpiCard
        label="Расходы"
        value={formatRub(summary.totalExpenses)}
        sub={`${formatRub(summary.manualGeneralExpenses + summary.projectExpenses)} команда · ${formatRub(summary.taxAmount)} налог`}
        accent="#EF4444"
        icon={V2Icons.folder}
        tone="red"
      />
      <ProjectsKpiCard
        label="Прибыль"
        value={formatRub(summary.profit)}
        sub={`маржа ${Math.round(summary.margin)}% · все направления`}
        accent={summary.profit >= 0 ? "#10B981" : "#EF4444"}
        icon={V2Icons.reports}
        tone={summary.profit >= 0 ? "green" : "red"}
      />
    </section>
  );
}

/* -------------------------------- ДЕНЬГИ --------------------------------- */
function MoneyCard({
  label,
  value,
  note,
  href,
  good,
}: {
  label: string;
  value: string;
  note: string;
  href: string;
  good?: boolean;
}) {
  return (
    <Link
      href={appPath(href)}
      className="block rounded-2xl bg-white p-4 shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
    >
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">{label}</div>
      <div
        className={`v2-tnum v2-tighter mt-1.5 text-[24px] font-semibold ${
          good ? "text-emerald-600" : "text-[var(--v2-ink-900)]"
        }`}
      >
        {value}
      </div>
      <div className="v2-tight mt-1 text-[11.5px] text-[var(--v2-ink-500)]">{note}</div>
    </Link>
  );
}

function MoneyStrip() {
  return (
    <section className="grid grid-cols-4 gap-3">
      <MoneyCard
        label="Капитал всего"
        value={`${homeFmt(HOME_MONEY.capital)} ₽`}
        note="+86 тыс ₽ за 2026 год"
        href={HOME_LINKS.finance}
      />
      <MoneyCard
        label="В распоряжении"
        value={`${homeFmt(HOME_MONEY.available)} ₽`}
        note="карта, ИП и наличные"
        href={HOME_LINKS.finance}
      />
      <MoneyCard
        label={`Ожидается за ${HOME_MONEY.month}`}
        value={`${homeFmt(HOME_MONEY.expected)} ₽`}
        note={`оплачено ${homeFmt(HOME_MONEY.paid)} ₽ · 9 проектов`}
        href={HOME_LINKS.agencyFinance}
      />
      <MoneyCard
        label="Прогноз конца месяца"
        value={`+${homeFmt(HOME_MONEY.forecast)} ₽`}
        note={`расходы ${homeFmtK(HOME_MONEY.expenses)} ₽`}
        href={HOME_LINKS.finance}
        good
      />
    </section>
  );
}

/* ------------------------------- КАЛЕНДАРЬ -------------------------------- */
type CalendarItem = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  completed_at: string | null;
  category: string;
  color: string;
};

function CalendarWeek() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [days, setDays] = useState<{ ymd: string; label: string; n: string; today: boolean; past: boolean }[]>([]);
  const [weekLabel, setWeekLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const todayYmd = toYmd(now);
    const monday = mondayOf(now);
    const cells = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      const ymd = toYmd(d);
      return {
        ymd,
        label: WEEKDAYS_SHORT[i]!,
        n: String(d.getDate()),
        today: ymd === todayYmd,
        past: ymd < todayYmd,
      };
    });
    setDays(cells);
    setWeekLabel(formatWeekLabel(monday));

    (async () => {
      try {
        const res = await fetchJson<{ items: CalendarItem[] }>(
          `/api/v2/personal/calendar?from=${cells[0]!.ymd}&to=${cells[6]!.ymd}`
        );
        setItems(res.items ?? []);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось загрузить календарь");
      }
    })();
  }, []);

  return (
    <section className="rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-soft)]">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="v2-tight text-[19px] font-semibold text-[var(--v2-ink-900)]">Календарь недели</h2>
        <span className="v2-tight text-[13px] text-[var(--v2-ink-500)]">{weekLabel}</span>
        <Link
          href={appPath(CALENDAR_HREF)}
          className="v2-tight ml-auto shrink-0 text-[12.5px] font-medium text-[var(--v2-brand-700)] transition hover:text-[var(--v2-brand-800)]"
        >
          Открыть календарь →
        </Link>
      </div>

      {error ? <p className="v2-tight mt-3 text-[12.5px] text-[var(--v2-ink-500)]">{error}</p> : null}

      <div className="mt-4 grid grid-cols-7 gap-2">
        {days.map((d) => {
          const dayItems = items.filter((it) => it.date === d.ymd);
          return (
            <div
              key={d.ymd}
              className={`flex min-h-[136px] min-w-0 flex-col gap-1.5 rounded-xl p-2 ${
                d.today
                  ? "bg-[var(--v2-brand-50)] ring-1 ring-[var(--v2-brand-200)]"
                  : d.past
                    ? "bg-[var(--v2-ink-50)]/60"
                    : "bg-[var(--v2-ink-50)]"
              }`}
            >
              <div className="flex items-baseline gap-1.5 px-0.5">
                <span
                  className={`text-[10.5px] font-semibold uppercase tracking-[0.08em] ${
                    d.today ? "text-[var(--v2-brand-700)]" : "text-[var(--v2-ink-400)]"
                  }`}
                >
                  {d.label}
                </span>
                <span
                  className={`v2-tnum text-[13px] font-semibold ${
                    d.today ? "text-[var(--v2-brand-700)]" : "text-[var(--v2-ink-700)]"
                  }`}
                >
                  {d.n}
                </span>
              </div>
              {dayItems.map((it) => {
                const done = Boolean(it.completed_at);
                return (
                  <Link
                    key={it.id}
                    href={appPath(CALENDAR_HREF)}
                    title={`${it.category} — ${it.title}`}
                    className={`min-w-0 rounded-lg px-1.5 py-1.5 transition hover:brightness-95 ${done ? "opacity-45" : ""}`}
                    style={{ background: `${it.color}1A` }}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: it.color }} />
                      {it.time ? (
                        <span className="v2-tnum text-[10px] text-[var(--v2-ink-500)]">{it.time}</span>
                      ) : null}
                      {done ? <HI.check className="ml-auto h-3 w-3 shrink-0" style={{ color: it.color }} /> : null}
                    </span>
                    <span
                      className={`v2-tight mt-1 block text-[11.5px] leading-snug text-[var(--v2-ink-800)] ${
                        done ? "line-through" : ""
                      }`}
                      style={{ textWrap: "pretty", overflowWrap: "anywhere" }}
                    >
                      {it.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------- ПРАВИЛА И МИНИМУМ ------------------------------ */
function RulesBand() {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-soft)]">
      <div className="flex items-baseline gap-3">
        <h2 className="v2-tight text-[19px] font-semibold text-[var(--v2-ink-900)]">Правила недели</h2>
        <span className="v2-tight text-[13px] text-[var(--v2-ink-500)]">Рамки, а не производственный план.</span>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-3">
        {HOME_RULES.map((r, i) => (
          <div key={r} className="rounded-xl bg-[var(--v2-ink-50)] px-4 py-3.5">
            <div className="v2-tnum text-[10.5px] font-semibold text-[var(--v2-ink-300)]">
              {String(i + 1).padStart(2, "0")}
            </div>
            <p className="v2-tight mt-1 text-[14px] leading-snug text-[var(--v2-ink-800)]" style={{ textWrap: "pretty" }}>
              {r}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-[var(--v2-ink-100)] pt-5">
        <div className="flex items-baseline gap-3">
          <h3 className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">Минимум недели</h3>
          <span className="v2-tight text-[12.5px] text-[var(--v2-ink-500)]">
            Сделал — можно отдыхать. Просто помню, не отмечаю.
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-x-6 gap-y-2.5">
          {HOME_CHECKS.map((r) => (
            <div key={r.id} className="flex gap-2.5">
              <HI.minus className="mt-[5px] h-3.5 w-3.5 shrink-0 text-[var(--v2-ink-300)]" />
              <span className="min-w-0">
                <span className="v2-tight block text-[13.5px] font-medium text-[var(--v2-ink-900)]">{r.label}</span>
                <span className="v2-tight block text-[11.5px] text-[var(--v2-ink-500)]">{r.note}</span>
              </span>
            </div>
          ))}
          <div className="flex gap-2.5">
            <HI.minus className="mt-[5px] h-3.5 w-3.5 shrink-0 text-[var(--v2-ink-300)]" />
            <span className="min-w-0">
              <span className="v2-tight block text-[13.5px] font-medium text-[var(--v2-ink-900)]">
                {HOME_TRAININGS.label}
              </span>
              <span className="v2-tight block text-[11.5px] text-[var(--v2-ink-500)]">
                {HOME_TRAININGS.total} раза в неделю
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div
          className="v2-tight rounded-xl bg-emerald-50 px-4 py-3.5 text-[14px] leading-relaxed text-emerald-900"
          style={{ textWrap: "pretty" }}
        >
          {HOME_RULE_CONTRAST.ok}
        </div>
        <div
          className="v2-tight rounded-xl bg-[var(--v2-ink-100)] px-4 py-3.5 text-[14px] leading-relaxed text-[var(--v2-ink-600)]"
          style={{ textWrap: "pretty" }}
        >
          {HOME_RULE_CONTRAST.no}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- РОЛИКИ --------------------------------- */
function VideoCard() {
  const pub = HOME_VIDEO.yt.filter((v) => v.st === "опубликовано").length;
  return (
    <section className="rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-card)]">
      <div className="flex items-center gap-2">
        <HI.video className="h-[16px] w-[16px] text-[var(--v2-ink-400)]" />
        <h3 className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">Ролики</h3>
        <span className="v2-tnum v2-tight ml-auto text-[12px] text-[var(--v2-ink-500)]">
          {pub} из {HOME_VIDEO.goal} на YouTube
        </span>
      </div>
      <div className="mt-2.5 flex gap-1">
        {HOME_VIDEO.yt.map((v) => (
          <span
            key={`bar-${v.n}`}
            className="h-1.5 flex-1 rounded-full"
            style={{ background: HOME_VIDEO_ST[v.st].tint, opacity: videoOpacity(v.st) }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-col divide-y divide-[var(--v2-ink-100)]">
        {HOME_VIDEO.yt.map((v) => {
          const s = HOME_VIDEO_ST[v.st];
          return (
            <div key={v.n} className="py-2.5">
              <div className="flex items-start gap-2">
                <span className="v2-tnum mt-[3px] shrink-0 text-[10.5px] font-semibold text-[var(--v2-ink-300)]">
                  {v.n}
                </span>
                <span
                  className="v2-tight flex-1 text-[13px] font-medium leading-snug text-[var(--v2-ink-900)]"
                  style={{ textWrap: "pretty" }}
                >
                  {v.t}
                </span>
                <span
                  className="v2-tight shrink-0 rounded px-1.5 py-[2px] text-[10.5px] font-semibold"
                  style={{ background: s.bg, color: s.tint }}
                >
                  {v.st}
                </span>
              </div>
              <div className="v2-tight mt-1 flex items-center gap-2 pl-[22px] text-[11.5px] text-[var(--v2-ink-500)]">
                <span className="v2-tnum">{v.date}</span>
                {v.views !== "—" ? (
                  <>
                    <span className="text-[var(--v2-ink-300)]">·</span>
                    <span className="v2-tnum font-medium text-[var(--v2-ink-700)]">{v.views} просмотров</span>
                  </>
                ) : null}
              </div>
              <div className="v2-tight mt-0.5 pl-[22px] text-[11.5px] text-[var(--v2-ink-500)]">{v.react}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 border-t border-[var(--v2-ink-100)] pt-3">
        <p className="v2-tight text-[12px] leading-relaxed text-[var(--v2-ink-500)]">{HOME_VIDEO.question}</p>
        <Link
          href={appPath(HOME_LINKS.brand)}
          className="v2-tight mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--v2-brand-700)] transition hover:text-[var(--v2-brand-800)]"
        >
          Личный бренд <HI.arrowR className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}

/* --------------------------------- HOME ---------------------------------- */
export function V2PersonalHomeClient() {
  const [month, setMonth] = useState("aug");

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <Topbar />
      <div className="flex flex-col gap-6 px-8 pb-20 pt-3">
        <ProjectsMoneyStrip />
        <MoneyStrip />
        <SeasonHero />
        <LilaBanner />
        <WeekFocusBoard />
        <MonthBand month={month} setMonth={setMonth} />
        <SprintGoals />
        <BetCards />
        <NotNow />
        <div className="grid grid-cols-[minmax(0,1fr)_336px] items-start gap-6">
          <CalendarWeek />
          <VideoCard />
        </div>
        <RulesBand />
      </div>
    </div>
  );
}
