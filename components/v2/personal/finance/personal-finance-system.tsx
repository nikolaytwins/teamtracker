"use client";

import { PersonalAmt } from "./personal-finance-mask";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { sortFinanceCards } from "@/lib/v2/personal/finance-card-order";
import { formatPersonalRubShort } from "@/lib/v2/personal/formatters";
import type {
  PersonalAccountRow,
  PersonalCapitalRow,
  PersonalFinanceFundRow,
  PersonalFinanceGoalRow,
  PersonalFinanceSystemRow,
} from "@/lib/v2/personal/types";
import { V2Icons } from "@/components/v2/ui/icons";
import { appPath } from "@/lib/api-url";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type AllocatedGoal = PersonalFinanceGoalRow & {
  filled: number;
  left: number;
  pct: number;
  complete: boolean;
  active: boolean;
};

export function cushionPool(
  fundsOrAccounts: PersonalFinanceFundRow[] | PersonalAccountRow[]
): number {
  if (!fundsOrAccounts.length) return 0;
  const first = fundsOrAccounts[0]!;
  if ("amount_rub" in first && "fund_key" in first) {
    const funds = fundsOrAccounts as PersonalFinanceFundRow[];
    const cushion = funds.find((f) => f.fund_key === "cushion");
    return cushion?.amount_rub ?? funds.reduce((s, f) => s + f.amount_rub, 0);
  }
  return (fundsOrAccounts as PersonalAccountRow[])
    .filter((a) => a.in_cushion)
    .reduce((s, a) => s + a.balance_rub, 0);
}

export function fundsTotal(funds: PersonalFinanceFundRow[]): number {
  return funds.reduce((s, f) => s + f.amount_rub, 0);
}

export function allocateGoals(goals: PersonalFinanceGoalRow[], pool: number): AllocatedGoal[] {
  let remaining = Math.max(pool, 0);
  const rows: AllocatedGoal[] = goals.map((g) => {
    const filled = Math.min(remaining, Math.max(g.target_rub, 0));
    remaining -= filled;
    const complete = g.target_rub > 0 && filled >= g.target_rub;
    return {
      ...g,
      filled,
      left: Math.max(g.target_rub - filled, 0),
      pct: g.target_rub > 0 ? filled / g.target_rub : 0,
      complete,
      active: false,
    };
  });
  const firstOpen = rows.find((g) => !g.complete) ?? rows[rows.length - 1];
  return rows.map((g) => ({ ...g, active: firstOpen ? g.id === firstOpen.id : false }));
}

function PfBar({
  pct,
  color = "#3B6FF7",
  track = "#F4F4F5",
  h = 6,
}: {
  pct: number;
  color?: string;
  track?: string;
  h?: number;
}) {
  return (
    <div className="w-full overflow-hidden rounded-full" style={{ height: h, background: track }}>
      <span
        className="block h-full rounded-full transition-all duration-300"
        style={{ width: `${Math.max(0, Math.min(pct, 1)) * 100}%`, background: color }}
      />
    </div>
  );
}

function Kick({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`text-[10.5px] font-semibold uppercase tracking-[0.13em] ${className || "text-[var(--v2-ink-400)]"}`}>
      {children}
    </div>
  );
}

function Sect({
  accent = "#0A0A0B",
  title,
  hint,
  right,
  children,
}: {
  accent?: string;
  title: string;
  hint?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2.5 px-0.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
        <h2 className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">{title}</h2>
        {hint ? <span className="v2-tight text-[12.5px] text-[var(--v2-ink-500)]">{hint}</span> : null}
        {right ? <div className="ml-auto">{right}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl bg-white shadow-[var(--v2-shadow-soft)] ${className}`}>{children}</div>
  );
}

function parseMoney(raw: string): number | null {
  const n = Number(raw.trim().replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function InlineEditMoney({
  value,
  onSave,
}: {
  value: number;
  onSave: (n: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [busy, setBusy] = useState(false);

  const commit = async () => {
    const n = parseMoney(draft);
    if (n == null) {
      setDraft(String(value));
      setEditing(false);
      return;
    }
    if (n === value) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await onSave(n);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <input
        autoFocus
        disabled={busy}
        value={draft}
        inputMode="decimal"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commit();
          }
          if (e.key === "Escape") {
            setDraft(String(value));
            setEditing(false);
          }
        }}
        className="v2-tnum w-36 rounded-lg border border-[var(--v2-brand-400)] bg-white px-2 py-1 text-[22px] font-semibold outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      className="v2-tnum rounded-lg text-left text-[22px] font-semibold text-[var(--v2-ink-900)] transition hover:bg-[var(--v2-ink-50)]"
      title="Изменить"
    >
      <PersonalAmt v={value} />
    </button>
  );
}

export function PfNearestGoal({
  nearest,
  cushionTotal,
}: {
  nearest: AllocatedGoal | undefined;
  cushionTotal: number;
}) {
  if (!nearest) return null;
  const left = nearest.left;
  return (
    <section className="rounded-2xl px-8 py-7 text-white shadow-[var(--v2-shadow-soft)]" style={{ background: "#2d5eef" }}>
      <div className="flex flex-col items-start gap-10 lg:flex-row">
        <div className="min-w-0 flex-1">
          <Kick className="text-white/45">Следующий свободный рубль идёт в</Kick>
          <div className="mt-2 flex flex-wrap items-baseline gap-3.5">
            <span className="v2-tighter text-[38px] font-semibold leading-none">{nearest.title}</span>
            <span className="v2-tight v2-tnum text-[14px] text-white/55">
              <PersonalAmt v={nearest.filled} /> из <PersonalAmt v={nearest.target_rub} />
            </span>
          </div>
          <div className="mt-5 max-w-[520px]">
            <PfBar pct={nearest.pct} color="rgba(255,255,255,.9)" track="rgba(255,255,255,.15)" h={8} />
            <div className="v2-tight v2-tnum mt-2.5 flex items-center justify-between text-[12.5px] text-white/55">
              <span>{Math.round(nearest.pct * 100)}% цели</span>
              <span>
                осталось <PersonalAmt v={left} />
              </span>
            </div>
          </div>
        </div>
        <div className="w-full shrink-0 rounded-xl bg-white/10 px-5 py-4 lg:w-[300px]">
          <Kick className="text-white/45">В подушке сейчас</Kick>
          <div className="mt-2 grid gap-1.5 text-[13px]">
            <div className="flex justify-between text-white/70">
              <span>Счета с галочкой</span>
              <span className="v2-tnum">
                <PersonalAmt v={cushionTotal} />
              </span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>На эту цель</span>
              <span className="v2-tnum">
                <PersonalAmt v={nearest.filled} />
              </span>
            </div>
            <div className="mt-1 flex justify-between border-t border-white/15 pt-2 text-[15px] font-medium text-white">
              <span>Осталось</span>
              <span className="v2-tnum">
                <PersonalAmt v={left} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PfMonthSplit({
  income,
  system,
  nearestTitle,
  onPatch,
}: {
  income: number;
  system: PersonalFinanceSystemRow;
  nearestTitle: string;
  onPatch: (patch: Partial<PersonalFinanceSystemRow>) => Promise<void>;
}) {
  const life = system.life_expenses_rub;
  const funds = system.funds_rub;
  const toGoal = income - life - funds;
  const split = [
    { n: "Жизнь", v: life, c: "#3B6FF7", note: "стабильные расходы", edit: "life" as const },
    { n: "Фонды", v: funds, c: "#F59E0B", note: "стабильно в месяц", edit: "funds" as const },
    {
      n: "На цель",
      v: Math.max(toGoal, 0),
      c: "#10B981",
      note: nearestTitle,
      edit: null,
    },
    {
      n: "Из резерва",
      v: Math.min(toGoal, 0),
      c: "#F43F5E",
      note: toGoal < 0 ? "проедаем цель" : "не нужен",
      edit: null,
    },
  ];
  const barTotal = Math.max(income, 1);

  return (
    <Sect accent="#3B6FF7" title="Распределение месяца" hint="прибыль минус жизнь и фонды">
      <Card className="p-6">
        <div className="flex flex-col items-end gap-8 lg:flex-row">
          <div className="w-full shrink-0 lg:w-[300px]">
            <Kick>Прогнозируемая прибыль месяца</Kick>
            <div className="v2-tighter v2-tnum mt-1.5 text-[36px] font-semibold text-[var(--v2-ink-900)]">
              <PersonalAmt v={income} />
            </div>
            <p className="v2-tight mt-2 text-[12.5px] text-[var(--v2-ink-500)]">
              Прибыль проектов за этот месяц. Жизнь и фонды можно поправить нажатием.
            </p>
          </div>
          <div className="grid w-full flex-1 grid-cols-2 gap-3 lg:grid-cols-4">
            {split.map((s) => (
              <div key={s.n} className="rounded-xl border border-[var(--v2-ink-100)] px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.c }} />
                  <span className="v2-tight text-[12.5px] text-[var(--v2-ink-500)]">{s.n}</span>
                </div>
                <div className="mt-1.5" style={{ color: s.v < 0 ? "#F43F5E" : "#0A0A0B" }}>
                  {s.edit === "life" ? (
                    <InlineEditMoney value={life} onSave={(n) => onPatch({ life_expenses_rub: n })} />
                  ) : s.edit === "funds" ? (
                    <InlineEditMoney value={funds} onSave={(n) => onPatch({ funds_rub: n })} />
                  ) : (
                    <div
                      className="v2-tnum text-[22px] font-semibold"
                      style={{ color: s.v < 0 ? "#F43F5E" : undefined }}
                    >
                      <PersonalAmt v={s.v} />
                    </div>
                  )}
                </div>
                <div className="v2-tight text-[11.5px] text-[var(--v2-ink-400)]">{s.note}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex flex-col items-center gap-6 border-t border-[var(--v2-ink-100)] pt-5 sm:flex-row">
          <div className="min-w-0 flex-1">
            <div className="flex h-3 overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
              {split
                .filter((s) => s.v > 0)
                .map((s) => (
                  <span key={s.n} style={{ width: `${(s.v / barTotal) * 100}%`, background: s.c }} />
                ))}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <Kick>{toGoal >= 0 ? "Отложить на цель" : "Не хватает до жизни"}</Kick>
            <div
              className={`v2-tighter v2-tnum text-[24px] font-semibold ${
                toGoal > 0 ? "text-emerald-600" : toGoal < 0 ? "text-rose-500" : "text-[var(--v2-ink-500)]"
              }`}
            >
              <PersonalAmt v={toGoal} signed />
            </div>
          </div>
        </div>
      </Card>
    </Sect>
  );
}

export function PfGoalQueue({
  allocated,
  monthly,
  onReload,
}: {
  allocated: AllocatedGoal[];
  monthly: number;
  onReload: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [hint, setHint] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const n = parseMoney(target);
    if (!title.trim() || n == null) {
      setError("Название и сумма обязательны");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await fetchJson("/api/v2/personal/finance/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), hint: hint.trim(), target_rub: n }),
      });
      setTitle("");
      setHint("");
      setTarget("");
      setAdding(false);
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, name: string) => {
    if (deletingId) return;
    if (!confirm(`Удалить цель «${name}»?`)) return;
    setDeletingId(id);
    setError(null);
    try {
      await fetchJson(`/api/v2/personal/finance/goals/${id}`, { method: "DELETE" });
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Sect
      accent="#18181B"
      title="Очередь целей"
      hint="заполняется счетами с галочкой «В подушку» — деньги идут в одну цель, остальные ждут"
      right={
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="v2-tight text-[12.5px] font-medium text-[var(--v2-brand-600)] hover:text-[var(--v2-brand-700)]"
        >
          {adding ? "Отмена" : "Добавить цель"}
        </button>
      }
    >
      {adding ? (
        <Card className="mb-3 flex flex-wrap items-end gap-3 p-4">
          <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[11px] text-[var(--v2-ink-500)]">
            Название
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 rounded-lg border border-[var(--v2-ink-200)] px-3 text-[13px] text-[var(--v2-ink-900)]"
              placeholder="Новая цель"
            />
          </label>
          <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[11px] text-[var(--v2-ink-500)]">
            Подсказка
            <input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              className="h-9 rounded-lg border border-[var(--v2-ink-200)] px-3 text-[13px] text-[var(--v2-ink-900)]"
            />
          </label>
          <label className="flex w-36 flex-col gap-1 text-[11px] text-[var(--v2-ink-500)]">
            Сумма, ₽
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              inputMode="decimal"
              className="v2-tnum h-9 rounded-lg border border-[var(--v2-ink-200)] px-3 text-[13px]"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="h-9 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-medium text-white disabled:opacity-50"
          >
            Сохранить
          </button>
          {error ? <p className="w-full text-[12px] text-red-600">{error}</p> : null}
        </Card>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {allocated.map((g) => {
          const eta = g.active && monthly > 0 ? Math.ceil(g.left / monthly) : null;
          return (
            <div
              key={g.id}
              className={`relative overflow-hidden rounded-2xl px-6 pb-5 pt-6 ${
                g.active ? "text-white shadow-[var(--v2-shadow-soft)]" : "bg-white shadow-[var(--v2-shadow-soft)]"
              }`}
              style={g.active ? { background: "#2d5eef" } : undefined}
            >
              <span
                className={`pointer-events-none absolute right-4 top-2 v2-tighter v2-tnum text-[64px] font-semibold leading-none ${
                  g.active ? "text-white/15" : "text-[var(--v2-ink-100)]"
                }`}
              >
                {g.sort_order + 1}
              </span>
              <button
                type="button"
                title="Удалить цель"
                disabled={deletingId === g.id}
                onClick={() => void remove(g.id, g.title)}
                className={`absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
                  g.active
                    ? "bg-white/15 text-white/80 hover:bg-white hover:text-[var(--v2-ink-900)]"
                    : "bg-[var(--v2-ink-50)] text-[var(--v2-ink-400)] hover:bg-red-50 hover:text-red-600"
                } disabled:opacity-40`}
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                  <path d="m6.5 6.5 11 11m0-11-11 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
              <div className="relative">
                <div className={`v2-tight pr-8 text-[19px] font-semibold ${g.active ? "text-white" : "text-[var(--v2-ink-900)]"}`}>
                  {g.title}
                </div>
                {g.hint ? (
                  <div
                    className={`v2-tight mt-1 text-[12.5px] ${g.active ? "text-white/55" : "text-[var(--v2-ink-400)]"}`}
                  >
                    {g.hint}
                  </div>
                ) : null}
                <div className="mt-6 flex items-baseline gap-1.5">
                  <span
                    className={`v2-tighter v2-tnum text-[30px] font-semibold ${
                      g.active ? "text-white" : "text-[var(--v2-ink-900)]"
                    }`}
                  >
                    {formatPersonalRubShort(g.filled).replace(/\u202F₽$/, "")}
                  </span>
                  <span className={`v2-tight v2-tnum text-[14px] ${g.active ? "text-white/50" : "text-[var(--v2-ink-400)]"}`}>
                    / {formatPersonalRubShort(g.target_rub)}
                  </span>
                </div>
                <div className="mt-3.5">
                  <PfBar
                    pct={g.pct}
                    h={7}
                    color={g.active ? "rgba(255,255,255,.9)" : "#D4D4D8"}
                    track={g.active ? "rgba(255,255,255,.16)" : "#F4F4F5"}
                  />
                </div>
                <div className="mt-3.5 flex items-center justify-between">
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${
                      g.active ? "text-white" : "text-[var(--v2-ink-400)]"
                    }`}
                  >
                    {g.active ? "активная цель" : g.complete ? "закрыта" : "ждёт очереди"}
                  </span>
                  <span className={`v2-tight v2-tnum text-[12px] ${g.active ? "text-white/70" : "text-[var(--v2-ink-400)]"}`}>
                    {g.active ? (eta ? `≈ ${eta} мес` : "нет профицита") : `${Math.round(g.pct * 100)}%`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {error && !adding ? <p className="mt-3 text-[12px] text-red-600">{error}</p> : null}
    </Sect>
  );
}

export function PfMoscowReady({
  allocated,
  monthly,
  liquidity,
  jobStable,
  onJobChange,
}: {
  allocated: AllocatedGoal[];
  monthly: number;
  liquidity: number;
  jobStable: boolean;
  onJobChange: (v: boolean) => Promise<void>;
}) {
  const [stable, setStable] = useState(jobStable);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setStable(jobStable);
  }, [jobStable]);

  const cushion = allocated.find((g) => g.goal_key === "cushion_min") ?? allocated[0];
  const moscow = allocated.find((g) => g.goal_key === "moscow");
  const moveFund = moscow?.filled ?? 0;
  const need = stable ? 800_000 : 1_400_000;
  const checks = [
    {
      n: "Подушка закрыта",
      now: cushion?.filled ?? 0,
      need: cushion?.target_rub ?? 510_000,
      d: `${formatPersonalRubShort(cushion?.target_rub ?? 510_000)} сверх денег месяца`,
    },
    {
      n: "Фонд переезда",
      now: moveFund,
      need: moscow?.target_rub ?? 250_000,
      d: moscow?.hint || "первый, последний, комиссия, логистика",
    },
    {
      n: "Общая ликвидность",
      now: liquidity,
      need,
      d: stable
        ? "при стабильной работе достаточно 800к капитала"
        : "без стабильной работы нужно 1,4 млн капитала",
    },
    {
      n: "Стабильный доход 200—240к+",
      now: stable ? 1 : 0,
      need: 1,
      d: "найм или длинный контракт — инфраструктура переезда",
      bool: true,
    },
  ];
  const gap = Math.max(need - liquidity, 0);
  const eta = monthly > 0 ? Math.ceil(gap / monthly) : null;
  const doneCount = checks.filter((c) => c.now >= c.need).length;

  const toggleJob = (v: boolean) => {
    if (v === stable || busy) return;
    setStable(v);
    setBusy(true);
    void onJobChange(v)
      .catch(() => setStable(jobStable))
      .finally(() => setBusy(false));
  };

  return (
    <Sect
      accent="#0EA5A4"
      title="Готовность к Москве"
      hint={`выполнено ${doneCount} из 4 условий`}
      right={
        <div className="flex gap-1 rounded-xl bg-white p-1 shadow-[var(--v2-shadow-card)]">
          {(
            [
              [true, "Есть стабильная работа"],
              [false, "Нет стабильной"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={String(v)}
              type="button"
              disabled={busy}
              onClick={() => toggleJob(v)}
              className={`v2-tight h-7 rounded-lg px-3 text-[12px] font-medium transition disabled:opacity-60 ${
                stable === v
                  ? "bg-[var(--v2-ink-900)] text-white"
                  : "text-[var(--v2-ink-500)] hover:text-[var(--v2-ink-900)]"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
        <Card className="divide-y divide-[var(--v2-ink-100)]">
          {checks.map((c) => {
            const ok = c.now >= c.need;
            return (
              <div key={c.n} className="flex items-center gap-4 px-6 py-4">
                <span
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    ok ? "bg-emerald-500 text-white" : "border border-[var(--v2-ink-200)] text-[var(--v2-ink-300)]"
                  }`}
                >
                  {ok ? <V2Icons.check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-[var(--v2-ink-300)]" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="v2-tight text-[14.5px] font-medium text-[var(--v2-ink-900)]">{c.n}</div>
                  <div className="v2-tight text-[12px] text-[var(--v2-ink-400)]">{c.d}</div>
                </div>
                {!c.bool ? (
                  <div className="hidden w-[150px] shrink-0 sm:block">
                    <PfBar pct={c.need ? c.now / c.need : 0} color={ok ? "#10B981" : "#3B6FF7"} />
                  </div>
                ) : null}
                <div className="v2-tight v2-tnum w-[190px] shrink-0 text-right text-[13.5px]">
                  {c.bool ? (
                    <span className={ok ? "font-medium text-emerald-600" : "text-[var(--v2-ink-400)]"}>
                      {ok ? "есть" : "нет"}
                    </span>
                  ) : (
                    <>
                      <span className="font-medium text-[var(--v2-ink-900)]">{formatPersonalRubShort(c.now)}</span>
                      <span className="text-[var(--v2-ink-400)]"> / {formatPersonalRubShort(c.need)}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
        <Card className="flex flex-col px-6 py-6">
          <Kick>До порога переезда</Kick>
          <div className="v2-tighter v2-tnum mt-2 text-[32px] font-semibold text-[var(--v2-ink-900)]">
            <PersonalAmt v={gap} />
          </div>
          <div className="v2-tight v2-tnum text-[12.5px] text-[var(--v2-ink-500)]">
            порог {formatPersonalRubShort(need)} · сейчас {formatPersonalRubShort(liquidity)}
          </div>
          <div className="v2-tight mt-5 grid gap-2.5 border-t border-[var(--v2-ink-100)] pt-5 text-[13px]">
            <div className="flex justify-between">
              <span className="text-[var(--v2-ink-500)]">При текущем профиците</span>
              <span className="v2-tnum font-medium">
                {monthly > 0 ? (
                  <>
                    <PersonalAmt v={monthly} short />
                    /мес
                  </>
                ) : (
                  "0"
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--v2-ink-500)]">Готовность</span>
              <span className="v2-tnum font-medium">{eta ? `≈ ${eta} мес` : "не движется"}</span>
            </div>
          </div>
          <p className="v2-tight mt-auto pt-5 text-[12.5px] leading-[1.5] text-[var(--v2-ink-500)]">
            Порядок такой: сначала минимальная подушка, потом фонд переезда. Перед реальным переездом пересчитываем по
            фактической стоимости жизни.
          </p>
        </Card>
      </div>
    </Sect>
  );
}

const ACCOUNT_ICON: Record<string, keyof typeof V2Icons> = {
  wallet: "ruble",
  bank: "clients",
  cash: "ruble",
  shield: "star",
  target: "flag",
  coin: "ruble",
  tv: "folder",
  key: "link",
  card: "ruble",
  other: "folder",
};

function AccIcon({ iconKey, className }: { iconKey: string; className?: string }) {
  const Icon = V2Icons[ACCOUNT_ICON[iconKey] ?? "folder"];
  return <Icon className={className} />;
}

async function patchFundSource(fundId: string, source_account_id: string | null) {
  await fetchJson(`/api/v2/personal/finance/funds/${fundId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_account_id: source_account_id || null }),
  });
}

export function PfAccountsAsFunds({
  accounts,
  funds,
  capital,
  accountsTotal,
  fundsTotalRub,
  capitalSum,
  onSaved,
  onError,
  AccountBalance,
  FundAmount,
  CapitalAmount,
}: {
  accounts: PersonalAccountRow[];
  funds: PersonalFinanceFundRow[];
  capital: PersonalCapitalRow[];
  accountsTotal: number;
  fundsTotalRub: number;
  capitalSum: number;
  onSaved: () => void;
  onError: (msg: string) => void;
  AccountBalance: React.ComponentType<{
    accountId: string;
    value: number;
    currencyCode: PersonalAccountRow["currency_code"];
    rubValue?: number;
    onSaved: () => void;
    onError: (msg: string) => void;
    className?: string;
  }>;
  FundAmount: React.ComponentType<{
    fundId: string;
    value: number;
    onSaved: () => void;
    onError: (msg: string) => void;
    className?: string;
  }>;
  CapitalAmount: React.ComponentType<{
    capitalId: string;
    value: number;
    onSaved: () => void;
    onError: (msg: string) => void;
    className?: string;
  }>;
}) {
  const manageLink = appPath("/v2/personal/finance/accounts");
  const sortedAccounts = useMemo(() => sortFinanceCards(accounts), [accounts]);
  const sortedFunds = useMemo(() => sortFinanceCards(funds), [funds]);
  const sortedCapital = useMemo(() => sortFinanceCards(capital), [capital]);
  const sourceOptions = useMemo(
    () => sortedAccounts.filter((a) => a.currency_code === "RUB"),
    [sortedAccounts]
  );

  return (
    <div className="space-y-7">
      <Sect
        accent="#3B6FF7"
        title="Счета"
        hint="отдельная карточка на каждый"
        right={
          <div className="flex items-center gap-3">
            <span className="v2-tight text-[12.5px] text-[var(--v2-ink-500)]">
              Всего{" "}
              <span className="font-semibold text-[var(--v2-ink-800)]">
                <PersonalAmt v={accountsTotal} short />
              </span>
            </span>
            <Link
              href={manageLink}
              className="text-[12.5px] font-medium text-[var(--v2-brand-600)] hover:text-[var(--v2-brand-700)]"
            >
              Управление
            </Link>
          </div>
        }
      >
        {sortedAccounts.length === 0 ? (
          <Card className="p-8 text-center text-sm text-[var(--v2-ink-500)]">Счетов пока нет</Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sortedAccounts.map((a) => (
                <Card key={a.id} className="px-6 py-6">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white"
                      style={{ background: a.accent || "#52525B" }}
                    >
                      <AccIcon iconKey={a.icon_key} className="h-4 w-4" />
                    </span>
                    <span className="v2-tight min-w-0 truncate text-[16px] font-semibold text-[var(--v2-ink-900)]">
                      {a.name}
                    </span>
                  </div>
                  <div className="v2-tighter mt-5 text-[32px] font-semibold leading-none">
                    <AccountBalance
                      accountId={a.id}
                      value={a.currency_code !== "RUB" ? a.balance_native : a.balance_rub}
                      currencyCode={a.currency_code}
                      rubValue={a.currency_code !== "RUB" ? a.balance_rub : undefined}
                      onSaved={onSaved}
                      onError={onError}
                      className="text-[32px] leading-none text-left"
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-3 border-t border-[var(--v2-ink-100)] pt-4">
                    {a.note || a.currency_code !== "RUB" || !a.disposable ? (
                      <span className="v2-tight truncate text-[13px] text-[var(--v2-ink-400)]">
                        {a.note || (a.disposable ? a.currency_code : "резерв")}
                      </span>
                    ) : null}
                  </div>
                </Card>
              ))}
          </div>
        )}
      </Sect>

      <Sect
        accent="#F59E0B"
        title="Фонды"
        hint="не входят в сумму капитала · деньги лежат на счетах"
        right={
          <span className="v2-tight text-[12.5px] text-[var(--v2-ink-500)]">
            В фондах{" "}
            <span className="font-semibold text-[var(--v2-ink-800)]">
              <PersonalAmt v={fundsTotalRub} short />
            </span>
          </span>
        }
      >
        {sortedFunds.length === 0 ? (
          <Card className="p-8 text-center text-sm text-[var(--v2-ink-500)]">Фонды не настроены</Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sortedFunds.map((f) => (
              <Card key={f.id} className="px-6 py-6">
                <div className="flex items-center gap-2.5">
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{ background: f.accent || "#F59E0B" }}
                  >
                    <AccIcon iconKey={f.icon_key} className="h-4 w-4" />
                  </span>
                  <span className="v2-tight min-w-0 truncate text-[16px] font-semibold text-[var(--v2-ink-900)]">
                    {f.name}
                  </span>
                </div>
                {f.monthly_hint ? (
                  <p className="v2-tight mt-2 text-[12.5px] leading-snug text-[var(--v2-ink-500)]">{f.monthly_hint}</p>
                ) : null}
                <div className="v2-tighter mt-4 text-[32px] font-semibold leading-none">
                  <FundAmount
                    fundId={f.id}
                    value={f.amount_rub}
                    onSaved={onSaved}
                    onError={onError}
                    className="text-[32px] leading-none text-left"
                  />
                </div>
                <div className="mt-4 border-t border-[var(--v2-ink-100)] pt-4">
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--v2-ink-400)]">
                    Источник
                  </label>
                  <select
                    value={f.source_account_id ?? ""}
                    onChange={(e) => {
                      void patchFundSource(f.id, e.target.value || null)
                        .then(onSaved)
                        .catch((err) =>
                          onError(err instanceof Error ? err.message : "Не удалось обновить источник")
                        );
                    }}
                    className="h-10 w-full rounded-xl border border-[var(--v2-ink-200)] bg-white px-3 text-[13.5px] text-[var(--v2-ink-800)]"
                  >
                    <option value="">не указан</option>
                    {sourceOptions.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Sect>

      <Sect
        accent="#10B981"
        title="Капитал"
        right={
          <div className="flex items-center gap-3">
            <span className="v2-tight text-[12.5px] text-[var(--v2-ink-500)]">
              Активы{" "}
              <span className="font-semibold text-[var(--v2-ink-800)]">
                <PersonalAmt v={capitalSum} short />
              </span>
            </span>
            <Link
              href={manageLink}
              className="text-[12.5px] font-medium text-[var(--v2-brand-600)] hover:text-[var(--v2-brand-700)]"
            >
              Управление
            </Link>
          </div>
        }
      >
        {sortedCapital.length === 0 ? (
          <Card className="p-8 text-center text-sm text-[var(--v2-ink-500)]">Капитал не добавлен</Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sortedCapital.map((c) => (
              <Card key={c.id} className="px-6 py-6">
                <div className="flex items-center gap-2.5">
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{ background: c.tint || "#52525B" }}
                  >
                    <AccIcon iconKey={c.icon_key} className="h-4 w-4" />
                  </span>
                  <span className="v2-tight min-w-0 truncate text-[16px] font-semibold text-[var(--v2-ink-900)]">
                    {c.name}
                  </span>
                </div>
                <div className="v2-tighter mt-5 text-[32px] font-semibold leading-none">
                  <CapitalAmount
                    capitalId={c.id}
                    value={c.amount_rub}
                    onSaved={onSaved}
                    onError={onError}
                    className="text-[32px] leading-none"
                  />
                </div>
                {c.meta ? (
                  <div className="v2-tight mt-4 border-t border-[var(--v2-ink-100)] pt-4 text-[13px] text-[var(--v2-ink-500)]">
                    {c.meta}
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </Sect>
    </div>
  );
}

export function useFinanceSystemActions(onReload: () => void, onError: (msg: string) => void) {
  return useMemo(
    () => ({
      patchSystem: async (patch: Partial<PersonalFinanceSystemRow>) => {
        try {
          await fetchJson("/api/v2/personal/finance/system", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          onReload();
        } catch (e) {
          onError(e instanceof Error ? e.message : "Не удалось сохранить");
          throw e;
        }
      },
    }),
    [onReload, onError]
  );
}
