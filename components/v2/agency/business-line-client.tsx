"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  adjacentFinanceMonth,
  FINANCE_BUSINESS_LINE_META,
  FINANCE_CLIENT_TYPE_OPTIONS,
  FINANCE_EMPLOYEE_ROLES,
  FINANCE_MONTH_NAMES,
  FINANCE_PAYMENT_METHOD_OPTIONS,
  FINANCE_SERVICE_META,
  FINANCE_STATUS_META,
  financeAvatarTint,
  formatRub,
} from "@/lib/v2/finance/meta";
import type {
  V2FinanceBusinessLine,
  V2FinanceGeneralExpenseRow,
  V2FinanceMonthSummary,
  V2FinancePaymentStatus,
  V2FinanceProjectView,
  V2FinanceServiceStat,
  V2FinanceServiceType,
} from "@/lib/v2/finance/types";
import { V2Icons } from "@/components/v2/ui/icons";
import { appPath } from "@/lib/api-url";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type DashboardPayload = {
  year: number;
  month: number;
  projects: V2FinanceProjectView[];
  generalExpenses: V2FinanceGeneralExpenseRow[];
  summary: V2FinanceMonthSummary;
  summaryByLine: Record<V2FinanceBusinessLine, V2FinanceMonthSummary>;
  byService: V2FinanceServiceStat[];
};

type AnalyticsMonthPoint = {
  key: string;
  year: number;
  month: number;
  label: string;
  expectedRevenue: number;
  actualRevenue: number;
  totalExpenses: number;
  profit: number;
  projectCount: number;
};

type AnalyticsPayload = {
  businessLine: V2FinanceBusinessLine;
  months: AnalyticsMonthPoint[];
  byService: V2FinanceServiceStat[];
  totals: {
    expectedRevenue: number;
    actualRevenue: number;
    totalExpenses: number;
    profit: number;
    projectCount: number;
  };
};

const PROJECT_COLS =
  "lg:grid-cols-[minmax(0,1.7fr)_minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,0.8fr)_minmax(0,0.95fr)_2.75rem_minmax(0,0.95fr)_minmax(0,0.95fr)]";
const EXPENSE_COLS = "lg:grid-cols-[1.3fr_2fr_1fr_1.7fr_0.9fr]";
const MOBILE_SELECT = "max-lg:h-10 max-lg:w-full max-lg:rounded-lg max-lg:bg-white/70 max-lg:px-2";

function ProjectCell({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 lg:h-8 lg:flex-row lg:items-center lg:gap-0 ${className}`}>
      <span className="v2-tight text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--v2-ink-400)] lg:hidden">
        {label}
      </span>
      {children}
    </div>
  );
}

function MonthCertainCheckbox({
  checked,
  disabled,
  title,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  title?: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      title={title}
      onClick={() => {
        if (disabled) return;
        onChange(!checked);
      }}
      className={`inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition max-lg:my-2 max-lg:h-6 max-lg:w-6 max-lg:rounded-md ${
        checked
          ? "border-[var(--v2-brand-600)] bg-[var(--v2-brand-600)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
          : "border-[var(--v2-ink-300)] bg-white hover:border-[var(--v2-brand-400)]"
      } ${disabled ? "cursor-default opacity-100" : "cursor-pointer"}`}
    >
      {checked ? (
        <svg viewBox="0 0 12 10" className="h-2.5 w-2.5" fill="none" aria-hidden>
          <path
            d="M1 5.2 4.2 8.4 11 1.6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  );
}

function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl bg-white shadow-[var(--v2-shadow-soft)] ${className}`}>{children}</div>
  );
}

function Dash() {
  return <span className="select-none text-[var(--v2-ink-300)]">—</span>;
}

function FinanceSelect({
  value,
  options,
  onChange,
}: {
  value: string | number;
  options: { value: string | number; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="v2-tight h-10 cursor-pointer appearance-none rounded-xl bg-white pl-3.5 pr-9 text-[13.5px] font-medium text-[var(--v2-ink-800)] shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)] focus:outline-none focus:ring-2 focus:ring-[var(--v2-brand-500)]/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <V2Icons.chev className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--v2-ink-400)]" />
    </div>
  );
}

function ProjectNameLink({ value, href }: { value: string; href: string }) {
  return (
    <Link
      href={href}
      title="Открыть проект"
      className="v2-tight block min-w-0 truncate rounded px-1 py-0.5 text-[14px] font-medium text-[var(--v2-ink-900)] transition hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-brand-700)] max-lg:min-h-10 max-lg:py-1.5 max-lg:text-[15.5px] max-lg:font-semibold"
    >
      {value}
    </Link>
  );
}

function InlineMoney({
  value,
  onChange,
  tone = "ink",
}: {
  value: number;
  onChange: (n: number) => void;
  tone?: "ink" | "green" | "amber";
}) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(String(value));

  useEffect(() => setTemp(String(value)), [value]);

  const commit = () => {
    onChange(parseFloat(temp) || 0);
    setEditing(false);
  };

  const toneClass =
    tone === "green"
      ? "text-emerald-600"
      : tone === "amber"
        ? "text-amber-600"
        : "text-[var(--v2-ink-900)]";

  if (editing) {
    return (
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        value={temp}
        autoFocus
        onBlur={commit}
        onChange={(e) => setTemp(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setTemp(String(value));
            setEditing(false);
          }
        }}
        className="v2-tnum w-28 max-w-full rounded border border-[var(--v2-brand-500)] bg-white px-2 py-1 text-right text-sm max-lg:h-10 max-lg:w-full max-lg:rounded-lg max-lg:text-left"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`v2-tnum v2-tight whitespace-nowrap rounded px-2 py-1 text-right text-[14px] font-semibold hover:bg-[var(--v2-ink-50)] max-lg:-ml-2 max-lg:min-h-10 max-lg:text-left max-lg:text-[17px] ${toneClass}`}
    >
      {formatRub(value)}
    </button>
  );
}

function FinanceStatusSelect({
  value,
  onChange,
}: {
  value: V2FinancePaymentStatus;
  onChange: (status: V2FinancePaymentStatus) => void;
}) {
  const meta = FINANCE_STATUS_META[value];
  return (
    <div className="relative inline-flex">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as V2FinancePaymentStatus)}
        className="v2-tight h-8 cursor-pointer appearance-none rounded-full py-0 pl-3 pr-8 text-[12px] font-semibold max-lg:h-10 focus:outline-none focus:ring-2 focus:ring-[var(--v2-brand-500)]/30"
        style={{ background: meta.bg, color: meta.tint }}
      >
        {(Object.keys(FINANCE_STATUS_META) as V2FinancePaymentStatus[]).map((k) => (
          <option key={k} value={k}>
            {FINANCE_STATUS_META[k].label}
          </option>
        ))}
      </select>
      <V2Icons.chev
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-60"
        style={{ color: meta.tint }}
      />
    </div>
  );
}

function StatusChip({ count, status }: { count: number; status: V2FinancePaymentStatus }) {
  if (count <= 0) return null;
  const meta = FINANCE_STATUS_META[status];
  return (
    <span
      className="v2-tight inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold"
      style={{ background: meta.bg, color: meta.tint }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: meta.dot }} />
      {count} {meta.label.toLowerCase()}
    </span>
  );
}

function KpiCard({
  label,
  value,
  tone = "ink",
  accent,
  icon: Icon,
  sub,
  note,
}: {
  label: string;
  value: string;
  tone?: "ink" | "green" | "red";
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
  sub?: string;
  note?: React.ReactNode;
}) {
  const toneClass =
    tone === "red" ? "text-red-500" : tone === "green" ? "text-emerald-600" : "text-[var(--v2-ink-900)]";
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)] max-sm:text-[10px] max-sm:tracking-[0.06em]">
        <span
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${accent}14`, color: accent }}
        >
          <Icon className="h-[15px] w-[15px]" />
        </span>
        {label}
      </div>
      <div
        className={`v2-tnum v2-tighter mt-3 break-words text-[28px] font-semibold leading-none max-sm:text-[20px] ${toneClass}`}
      >
        {value}
      </div>
      {sub ? <div className="v2-tight mt-2 text-[12px] text-[var(--v2-ink-500)]">{sub}</div> : null}
      {note ? <div className="mt-2">{note}</div> : null}
    </Card>
  );
}

function StatBar({ label, value, max, tint }: { label: string; value: number; max: number; tint: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="v2-tight inline-flex items-center gap-2 text-[var(--v2-ink-700)]">
          <span className="h-2 w-2 rounded-sm" style={{ background: tint }} />
          {label}
        </span>
        <span className="v2-tnum font-medium text-[var(--v2-ink-900)]">{formatRub(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
        <div className="h-full rounded-full" style={{ width: `${max ? (value / max) * 100 : 0}%`, background: tint }} />
      </div>
    </div>
  );
}

export function BusinessLineClient({ line }: { line: V2FinanceBusinessLine }) {
  const lineMeta = FINANCE_BUSINESS_LINE_META[line];
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [tab, setTab] = useState<"projects" | "analytics">("projects");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectAmount, setNewProjectAmount] = useState("");
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [expenseWho, setExpenseWho] = useState("");
  const [expenseRole, setExpenseRole] = useState<string>(FINANCE_EMPLOYEE_ROLES[0]!.label);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [moveProjectId, setMoveProjectId] = useState<string | null>(null);
  const [monthReady, setMonthReady] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const skipMonthReload = useRef(true);

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchJson<DashboardPayload>(`/api/v2/finance/dashboard?year=${y}&month=${m}`);
      setData(payload);
      setYear(payload.year);
      setMonth(payload.month);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const now = new Date();
      await load(now.getFullYear(), now.getMonth() + 1);
      setMonthReady(true);
    })();
  }, [load]);

  useEffect(() => {
    if (!monthReady) return;
    if (skipMonthReload.current) {
      skipMonthReload.current = false;
      return;
    }
    void load(year, month);
  }, [year, month, monthReady, load]);

  useEffect(() => {
    if (tab !== "analytics" || analytics || analyticsLoading) return;
    void (async () => {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      try {
        setAnalytics(await fetchJson<AnalyticsPayload>(`/api/v2/agency/analytics?line=${line}`));
      } catch (e) {
        setAnalyticsError(e instanceof Error ? e.message : "Ошибка загрузки аналитики");
      } finally {
        setAnalyticsLoading(false);
      }
    })();
  }, [tab, analytics, analyticsLoading, line]);

  const yearOptions = useMemo(() => {
    const ys = new Set<number>([year, today.getFullYear(), today.getFullYear() - 1]);
    if (data?.projects.length) {
      for (const p of data.projects) ys.add(new Date(p.created_at).getFullYear());
    }
    return [...ys].sort((a, b) => b - a);
  }, [year, today, data?.projects]);

  const patchProject = async (id: string, patch: Record<string, unknown>) => {
    try {
      setActionError(null);
      await fetchJson(`/api/v2/finance/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      await load(year, month);
      setAnalytics(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Не удалось сохранить");
    }
  };

  const handleCreateProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    const parsed = newProjectAmount.trim() ? Number(newProjectAmount.replace(/\s/g, "").replace(",", ".")) : 0;
    const totalAmount = Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
    try {
      setActionError(null);
      await fetchJson("/api/v2/finance/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, totalAmount, businessLine: line, year, month }),
      });
      setNewProjectName("");
      setNewProjectAmount("");
      setNewProjectOpen(false);
      await load(year, month);
      setAnalytics(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Не удалось создать проект");
    }
  };

  const handleSaveExpense = async () => {
    const amount = parseFloat(expenseAmount);
    if (!expenseWho.trim() || !Number.isFinite(amount)) return;
    try {
      setActionError(null);
      await fetchJson("/api/v2/finance/general-expenses", {
        method: editingExpenseId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingExpenseId,
          employeeName: expenseWho.trim(),
          employeeRole: expenseRole,
          amount,
          notes: expenseNotes.trim() || null,
          businessLine: line,
          year,
          month,
        }),
      });
      setExpenseWho("");
      setExpenseAmount("");
      setExpenseNotes("");
      setEditingExpenseId(null);
      setExpenseFormOpen(false);
      await load(year, month);
      setAnalytics(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Не удалось добавить расход");
    }
  };

  const startEditingExpense = (expense: V2FinanceGeneralExpenseRow) => {
    setEditingExpenseId(expense.id);
    setExpenseWho(expense.employee_name);
    setExpenseRole(expense.employee_role);
    setExpenseAmount(String(expense.amount));
    setExpenseNotes(expense.notes ?? "");
    setExpenseFormOpen(true);
  };

  const closeExpenseForm = () => {
    setExpenseFormOpen(false);
    setEditingExpenseId(null);
    setExpenseWho("");
    setExpenseAmount("");
    setExpenseNotes("");
  };

  const reload = useCallback(async () => {
    await load(year, month);
    setAnalytics(null);
  }, [load, year, month]);

  const totalSummary = data?.summary;
  const summary = data?.summaryByLine?.[line];
  const projects = useMemo(
    () => (data?.projects ?? []).filter((p) => p.business_line === line),
    [data?.projects, line]
  );
  const lineTotals = useMemo(() => {
    const expected = projects.reduce((s, p) => s + p.effective_total_amount, 0);
    const actual = projects.reduce((s, p) => s + p.paid_amount, 0);
    return { expected, actual };
  }, [projects]);
  const generalExpenses = useMemo(
    () => (data?.generalExpenses ?? []).filter((e) => e.business_line === line),
    [data?.generalExpenses, line]
  );

  if (loading && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="text-[var(--v2-ink-700)]">{error}</p>
        <p className="mt-2 text-sm text-[var(--v2-ink-500)]">
          Проверьте Supabase: ключи в env и импорт agency (`npm run import-agency-to-supabase`)
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full min-w-0 flex-col max-lg:[&_input]:text-base max-lg:[&_select]:text-base">
      <header className="flex h-14 items-center gap-3 border-b border-[var(--v2-ink-100)]/70 px-4 lg:px-7">
        <div className="v2-tight flex items-center gap-2 text-[13px] text-[var(--v2-ink-500)]">
          <span className="text-[var(--v2-ink-400)]">Студия</span>
          <span className="text-[var(--v2-ink-300)]">/</span>
          <span className="font-medium text-[var(--v2-ink-900)]">{lineMeta.label}</span>
        </div>
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => setNewProjectOpen(true)}
            className="v2-tight inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[var(--v2-ink-900)] px-3.5 text-[12.5px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)] max-lg:h-10 max-lg:text-[14px]"
          >
            <V2Icons.plus className="h-4 w-4 shrink-0" />
            Новый проект
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1280px] px-4 pb-24 pt-5 sm:px-6 lg:px-10 lg:pt-7">
          <div className="mb-5 flex items-center gap-6 border-b border-[var(--v2-ink-200)]/70 lg:mb-6">
            {(
              [
                ["projects", "Проекты"],
                ["analytics", "Аналитика"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`v2-tight relative pb-3 text-[14px] font-medium transition max-lg:pt-2 max-lg:text-[15px] ${
                  tab === k ? "text-[var(--v2-ink-900)]" : "text-[var(--v2-ink-500)] hover:text-[var(--v2-ink-800)]"
                }`}
              >
                {label}
                {tab === k ? (
                  <span className="absolute -bottom-px left-0 h-0.5 w-full rounded-full bg-[var(--v2-brand-600)]" />
                ) : null}
              </button>
            ))}
          </div>

          {tab === "projects" ? (
            <>
              <div className="mb-5 flex flex-wrap items-center gap-3 lg:mb-6 lg:gap-4">
                <h1 className="v2-tighter text-[26px] font-semibold leading-none text-[var(--v2-ink-900)] lg:text-[34px]">
                  {lineMeta.label}
                </h1>
                <div className="flex flex-wrap items-center gap-2 lg:pl-2">
                  <FinanceSelect
                    value={year}
                    options={yearOptions.map((y) => ({ value: y, label: String(y) }))}
                    onChange={(v) => setYear(Number(v))}
                  />
                  <FinanceSelect
                    value={month}
                    options={FINANCE_MONTH_NAMES.map((name, i) => ({ value: i + 1, label: name }))}
                    onChange={(v) => setMonth(Number(v))}
                  />
                  <span className="v2-tight max-w-[150px] text-[12px] leading-tight text-[var(--v2-ink-500)]">
                    Фильтр по месяцу создания проекта
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setYear(today.getFullYear());
                      setMonth(today.getMonth() + 1);
                    }}
                    className="v2-tight text-[13px] font-medium text-[var(--v2-brand-600)] transition hover:text-[var(--v2-brand-700)] max-lg:h-10 max-lg:px-2 max-lg:text-[14px]"
                  >
                    Сегодня
                  </button>
                </div>
              </div>

              {actionError ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {actionError}
                </div>
              ) : null}

              {summary ? (
                <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  <KpiCard
                    label="Предполагаемая выручка"
                    value={formatRub(summary.expectedRevenue)}
                    accent="#3B6FF7"
                    icon={V2Icons.projects}
                    sub={`${summary.projectCount} проектов в ${FINANCE_MONTH_NAMES[month - 1]?.toLowerCase()}`}
                    note={
                      totalSummary ? (
                        <TotalNote label="общая" value={formatRub(totalSummary.expectedRevenue)} />
                      ) : null
                    }
                  />
                  <KpiCard
                    label="Фактическая выручка"
                    value={formatRub(summary.actualRevenue)}
                    accent="#0EA5A4"
                    icon={V2Icons.ruble}
                    sub={
                      summary.expectedRevenue
                        ? `${Math.round((summary.actualRevenue / summary.expectedRevenue) * 100)}% оплачено`
                        : "—"
                    }
                    note={
                      totalSummary ? (
                        <TotalNote label="общая" value={formatRub(totalSummary.actualRevenue)} />
                      ) : null
                    }
                  />
                  <KpiCard
                    label="Расходы"
                    value={formatRub(summary.totalExpenses)}
                    tone="red"
                    accent="#EF4444"
                    icon={V2Icons.folder}
                    sub={`${formatRub(summary.manualGeneralExpenses + summary.projectExpenses)} команда · ${formatRub(summary.taxAmount)} налог`}
                    note={
                      totalSummary ? (
                        <TotalNote label="общие" value={formatRub(totalSummary.totalExpenses)} />
                      ) : null
                    }
                  />
                  <KpiCard
                    label="Прибыль"
                    value={formatRub(summary.profit)}
                    tone={summary.profit >= 0 ? "green" : "red"}
                    accent={summary.profit >= 0 ? "#10B981" : "#EF4444"}
                    icon={V2Icons.reports}
                    sub={`маржа ${Math.round(summary.margin)}% · выручка ${lineMeta.label.toLowerCase()} − расходы`}
                    note={
                      totalSummary ? (
                        <TotalNote
                          label="общая"
                          value={formatRub(totalSummary.profit)}
                          hint="все направления"
                        />
                      ) : null
                    }
                  />
                </div>
              ) : null}

              <div className="mb-4">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <h2 className="v2-tighter text-[22px] font-semibold leading-none text-[var(--v2-ink-900)]">
                    Проекты · {lineMeta.label}
                  </h2>
                  <Link
                    href={appPath("/v2/agency")}
                    className="v2-tight text-[12.5px] font-medium text-[var(--v2-ink-500)] transition hover:text-[var(--v2-ink-900)]"
                  >
                    Все направления →
                  </Link>
                </div>
                {projects.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip count={projects.filter((p) => p.status === "paid").length} status="paid" />
                    <StatusChip count={projects.filter((p) => p.status === "prepaid").length} status="prepaid" />
                    <StatusChip count={projects.filter((p) => p.status === "not_paid").length} status="not_paid" />
                  </div>
                ) : null}
              </div>

              <Card className="mb-7 overflow-hidden">
                <div
                  className={`hidden lg:grid ${PROJECT_COLS} border-b border-[var(--v2-ink-100)]/70 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--v2-ink-400)]`}
                >
                  <div>Проект</div>
                  <div>Услуга</div>
                  <div>Тип клиента</div>
                  <div>Статус</div>
                  <div>Контакт</div>
                  <div>Способ оплаты</div>
                  <div className="text-center">Точно в месяце</div>
                  <div className="text-right">Сумма</div>
                  <div className="text-right">Оплачено</div>
                </div>
                <div className="divide-y divide-[var(--v2-ink-100)]/70">
                  {projects.length === 0 ? (
                    <div className="px-5 py-10 text-center text-sm text-[var(--v2-ink-500)]">
                      Нет проектов «{lineMeta.label}» за выбранный месяц
                    </div>
                  ) : (
                    projects.map((p, i) => {
                      const tint = financeAvatarTint(p.name, i);
                      const statusMeta = FINANCE_STATUS_META[p.status];
                      const paidTone =
                        p.paid_amount >= p.effective_total_amount
                          ? "green"
                          : p.paid_amount > 0
                            ? "amber"
                            : "ink";
                      return (
                        <div
                          key={p.id}
                          className={`group grid grid-cols-2 items-start gap-x-3 gap-y-2.5 border-l-[3px] px-4 py-3.5 transition hover:brightness-[0.99] lg:items-center lg:gap-0 lg:px-5 ${PROJECT_COLS}`}
                          style={{ borderLeftColor: statusMeta.dot, backgroundColor: statusMeta.bg }}
                        >
                          <div className="col-span-2 flex min-w-0 items-center gap-2.5 pr-2 lg:col-span-1">
                            <span
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold"
                              style={{ background: `${tint}1A`, color: tint }}
                            >
                              {p.name[0]}
                            </span>
                            <div className="min-w-0 flex-1">
                              <ProjectNameLink
                                value={p.name}
                                href={appPath(`/v2/agency/projects/${p.id}`)}
                              />
                              <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                <select
                                  value={p.business_line}
                                  onChange={(e) =>
                                    void patchProject(p.id, {
                                      businessLine: e.target.value as V2FinanceBusinessLine,
                                    })
                                  }
                                  className="v2-tight max-w-full rounded border-0 bg-transparent py-0 pl-0 text-[11px] font-medium text-[var(--v2-ink-500)] focus:ring-2 focus:ring-[var(--v2-brand-500)]/30"
                                  title="Направление"
                                >
                                  {(Object.keys(FINANCE_BUSINESS_LINE_META) as V2FinanceBusinessLine[]).map((k) => (
                                    <option key={k} value={k}>
                                      {FINANCE_BUSINESS_LINE_META[k].label}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-checked={p.is_recurring}
                                  title={
                                    p.is_recurring
                                      ? "Постоянный: копируется в следующий месяц. Клиент видит все месяцы по одной ссылке."
                                      : "Сделать постоянным: будет копироваться в следующий месяц автоматически"
                                  }
                                  onClick={() => void patchProject(p.id, { isRecurring: !p.is_recurring })}
                                  className={`v2-tight inline-flex h-6 items-center rounded-md px-1.5 text-[10.5px] font-semibold transition max-lg:h-8 max-lg:px-2.5 max-lg:text-[12px] ${
                                    p.is_recurring
                                      ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)] ring-1 ring-[var(--v2-brand-200)]"
                                      : "text-[var(--v2-ink-400)] hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-700)]"
                                  }`}
                                >
                                  {p.is_recurring ? "Постоянный" : "Разовый"}
                                </button>
                              </div>
                            </div>
                            <span className="ml-0.5 flex shrink-0 items-center gap-0.5 pointer-fine:hidden pointer-fine:group-hover:flex">
                              <Link
                                href={appPath(`/v2/agency/projects/${p.id}`)}
                                title="Детализация"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md lg:h-6 lg:w-6 text-[var(--v2-ink-400)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-800)]"
                              >
                                <V2Icons.list className="h-4 w-4 lg:h-3.5 lg:w-3.5" />
                              </Link>
                              <button
                                type="button"
                                title="Дублировать в след. месяц"
                                onClick={() =>
                                  void fetchJson(`/api/v2/finance/projects/${p.id}/copy`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ currentYear: year, currentMonth: month }),
                                  }).then(reload)
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md lg:h-6 lg:w-6 text-[var(--v2-ink-400)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-800)]"
                              >
                                <V2Icons.link className="h-4 w-4 lg:h-3.5 lg:w-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Перенести"
                                onClick={() => setMoveProjectId(moveProjectId === p.id ? null : p.id)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md lg:h-6 lg:w-6 text-[var(--v2-ink-400)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-800)]"
                              >
                                <V2Icons.cal className="h-4 w-4 lg:h-3.5 lg:w-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Удалить"
                                onClick={() => {
                                  if (!confirm(`Удалить «${p.name}»?`)) return;
                                  void fetchJson(`/api/v2/finance/projects/${p.id}`, { method: "DELETE" }).then(
                                    reload
                                  );
                                }}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md lg:h-6 lg:w-6 text-[var(--v2-ink-400)] transition hover:bg-red-50 hover:text-red-500"
                              >
                                <V2Icons.trash className="h-4 w-4 lg:h-3.5 lg:w-3.5" />
                              </button>
                            </span>
                          </div>
                          <ProjectCell label="Услуга" className="order-5 lg:order-none">
                            <select
                              value={p.service_type}
                              onChange={(e) => void patchProject(p.id, { serviceType: e.target.value })}
                              className={`v2-tight h-8 rounded-lg border-0 bg-transparent text-[12.5px] font-medium text-[var(--v2-ink-700)] focus:ring-2 focus:ring-[var(--v2-brand-500)]/30 ${MOBILE_SELECT}`}
                            >
                              {(Object.keys(FINANCE_SERVICE_META) as V2FinanceServiceType[]).map((k) => (
                                <option key={k} value={k}>
                                  {FINANCE_SERVICE_META[k].label}
                                </option>
                              ))}
                            </select>
                          </ProjectCell>
                          <ProjectCell label="Тип клиента" className="order-6 lg:order-none">
                            <select
                              value={p.client_type ?? ""}
                              onChange={(e) => void patchProject(p.id, { clientType: e.target.value || null })}
                              className={`v2-tight h-8 max-w-full rounded-lg border-0 bg-transparent text-[12.5px] text-[var(--v2-ink-700)] focus:ring-2 focus:ring-[var(--v2-brand-500)]/30 ${MOBILE_SELECT}`}
                            >
                              <option value="">—</option>
                              {FINANCE_CLIENT_TYPE_OPTIONS.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          </ProjectCell>
                          <ProjectCell label="Статус" className="order-3 lg:order-none">
                            <FinanceStatusSelect
                              value={p.status}
                              onChange={(status) => {
                                const patch: Record<string, unknown> = { status };
                                if (status === "paid") {
                                  patch.paidAmount = p.effective_total_amount;
                                  patch.paymentCertainThisMonth = true;
                                }
                                if (status === "not_paid") patch.paidAmount = 0;
                                void patchProject(p.id, patch);
                              }}
                            />
                          </ProjectCell>
                          <ProjectCell label="Контакт" className="order-8 lg:order-none">
                            <span className="v2-tight truncate text-[13px] text-[var(--v2-ink-600)] max-lg:flex max-lg:min-h-10 max-lg:items-center max-lg:text-[14px]">
                              {p.client_contact || <Dash />}
                            </span>
                          </ProjectCell>
                          <ProjectCell label="Способ оплаты" className="order-7 lg:order-none">
                            <select
                              value={p.payment_method ?? ""}
                              onChange={(e) => void patchProject(p.id, { paymentMethod: e.target.value || null })}
                              className={`v2-tight h-8 rounded-lg border-0 bg-transparent text-[12.5px] focus:ring-2 focus:ring-[var(--v2-brand-500)]/30 ${MOBILE_SELECT}`}
                            >
                              <option value="">—</option>
                              {FINANCE_PAYMENT_METHOD_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </ProjectCell>
                          <ProjectCell label="Точно в месяце" className="order-4 lg:order-none lg:justify-center">
                            <MonthCertainCheckbox
                              checked={p.status === "paid" || p.payment_certain_this_month}
                              disabled={p.status === "paid"}
                              title={
                                p.status === "paid"
                                  ? "Уже оплачен — учтён в фактической выручке"
                                  : "Точно получу в этом месяце (для надёжной прибыли в Плане)"
                              }
                              onChange={(next) =>
                                void patchProject(p.id, { paymentCertainThisMonth: next })
                              }
                            />
                          </ProjectCell>
                          <ProjectCell label="Сумма" className="order-1 lg:order-none lg:justify-end">
                            <InlineMoney
                              value={p.effective_total_amount}
                              onChange={(n) => void patchProject(p.id, { totalAmount: n })}
                            />
                          </ProjectCell>
                          <ProjectCell label="Оплачено" className="order-2 lg:order-none lg:justify-end">
                            <InlineMoney
                              value={p.paid_amount}
                              tone={paidTone}
                              onChange={(n) => void patchProject(p.id, { paidAmount: n })}
                            />
                          </ProjectCell>
                          {moveProjectId === p.id ? (
                            <div className="order-last col-span-full mt-1 rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] p-3 lg:order-none">
                              <p className="v2-tight mb-2 text-xs font-medium text-[var(--v2-ink-700)]">
                                Перенести в месяц
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {([-1, 1] as const).map((delta) => {
                                  const t = adjacentFinanceMonth(year, month, delta);
                                  return (
                                    <button
                                      key={delta}
                                      type="button"
                                      onClick={() =>
                                        void fetchJson(`/api/v2/finance/projects/${p.id}/move`, {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ year: t.year, month: t.month }),
                                        }).then(() => {
                                          setMoveProjectId(null);
                                          void reload();
                                        })
                                      }
                                      className="rounded-lg border border-[var(--v2-ink-200)] bg-white px-3 py-1.5 text-xs hover:bg-[var(--v2-ink-100)] max-lg:h-10 max-lg:flex-1 max-lg:text-[14px]"
                                    >
                                      {FINANCE_MONTH_NAMES[t.month - 1]} {t.year}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
                {summary ? (
                  <div
                    className={`grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[var(--v2-ink-200)]/60 bg-[var(--v2-ink-50)]/50 px-4 py-3.5 text-[13px] lg:gap-0 lg:px-5 ${PROJECT_COLS}`}
                  >
                    <div className="v2-tight col-span-2 flex items-center gap-2 font-semibold text-[var(--v2-ink-900)] lg:col-span-7">
                      Итого по проектам
                      <span className="text-[12px] font-normal text-[var(--v2-ink-500)]">
                        · {projects.length} шт.
                      </span>
                    </div>
                    <div className="v2-tnum v2-tight font-semibold text-[var(--v2-ink-900)] max-lg:text-[16px] lg:text-right">
                      <span className="block text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--v2-ink-400)] lg:hidden">
                        Сумма
                      </span>
                      {formatRub(lineTotals.expected)}
                    </div>
                    <div className="v2-tnum v2-tight font-semibold text-emerald-600 max-lg:text-[16px] lg:text-right">
                      <span className="block text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--v2-ink-400)] lg:hidden">
                        Оплачено
                      </span>
                      {formatRub(lineTotals.actual)}
                    </div>
                  </div>
                ) : null}
              </Card>

              <Card className="overflow-hidden">
                <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 lg:px-5">
                  <div>
                    <h3 className="v2-tighter text-[16px] font-semibold text-[var(--v2-ink-900)]">
                      Расходы · {lineMeta.label}
                    </h3>
                    <p className="v2-tight mt-0.5 text-[12.5px] text-[var(--v2-ink-500)]">
                      Команда и налоги за {FINANCE_MONTH_NAMES[month - 1]?.toLowerCase()} · всего{" "}
                      <span className="font-medium text-red-500">
                        {summary ? formatRub(summary.totalExpenses) : "—"}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const prev = adjacentFinanceMonth(year, month, -1);
                        void fetchJson("/api/v2/finance/general-expenses", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            fromYear: prev.year,
                            fromMonth: prev.month,
                            toYear: year,
                            toMonth: month,
                            businessLine: line,
                          }),
                        }).then(reload);
                      }}
                      className="v2-tight inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[12.5px] font-medium text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)] max-lg:h-10 max-lg:text-[13.5px]"
                    >
                      <V2Icons.link className="h-4 w-4 text-[var(--v2-ink-500)]" />
                      Скопировать с прошлого месяца
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (expenseFormOpen) closeExpenseForm();
                        else setExpenseFormOpen(true);
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-3.5 text-[12.5px] font-medium text-white transition hover:bg-[var(--v2-ink-700)] max-lg:h-10 max-lg:text-[13.5px]"
                    >
                      <V2Icons.plus className="h-4 w-4" />
                      Добавить расход
                    </button>
                  </div>
                </div>

                {expenseFormOpen ? (
                  <div className="mx-4 mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)]/60 p-4 lg:mx-5">
                    {editingExpenseId ? (
                      <div className="v2-tight w-full text-[13px] font-semibold text-[var(--v2-ink-800)]">
                        Редактирование расхода
                      </div>
                    ) : null}
                    <label className="flex flex-col gap-1 text-xs text-[var(--v2-ink-500)] max-sm:w-full">
                      Сотрудник
                      <input
                        value={expenseWho}
                        onChange={(e) => setExpenseWho(e.target.value)}
                        className="h-9 rounded-lg border border-[var(--v2-ink-200)] bg-white px-3 text-sm max-lg:h-11"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--v2-ink-500)] max-sm:w-full">
                      Роль
                      <select
                        value={expenseRole}
                        onChange={(e) => setExpenseRole(e.target.value)}
                        className="h-9 rounded-lg border border-[var(--v2-ink-200)] bg-white px-3 text-sm max-lg:h-11"
                      >
                        {FINANCE_EMPLOYEE_ROLES.map((r) => (
                          <option key={r.value} value={r.label}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--v2-ink-500)] max-sm:w-full">
                      Сумма
                      <input
                        type="number"
                        inputMode="decimal"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        className="v2-tnum h-9 w-32 rounded-lg border border-[var(--v2-ink-200)] bg-white px-3 text-sm max-lg:h-11 max-sm:w-full"
                      />
                    </label>
                    <label className="flex flex-1 flex-col gap-1 text-xs text-[var(--v2-ink-500)] max-sm:w-full max-sm:flex-none sm:min-w-[220px]">
                      Примечание
                      <input
                        value={expenseNotes}
                        onChange={(e) => setExpenseNotes(e.target.value)}
                        className="h-9 rounded-lg border border-[var(--v2-ink-200)] bg-white px-3 text-sm max-lg:h-11"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleSaveExpense()}
                      className="h-9 rounded-xl bg-[var(--v2-brand-600)] px-4 text-sm font-medium text-white max-lg:h-11 max-sm:flex-1"
                    >
                      {editingExpenseId ? "Сохранить изменения" : "Сохранить"}
                    </button>
                    {editingExpenseId ? (
                      <button
                        type="button"
                        onClick={closeExpenseForm}
                        className="h-9 rounded-xl px-3 text-sm text-[var(--v2-ink-600)] hover:bg-white max-lg:h-11"
                      >
                        Отмена
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <div
                  className={`hidden lg:grid ${EXPENSE_COLS} border-y border-[var(--v2-ink-100)]/70 bg-[var(--v2-ink-50)]/40 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--v2-ink-400)]`}
                >
                  <div>Сотрудник</div>
                  <div>Роль</div>
                  <div className="text-right">Сумма</div>
                  <div className="pl-3">Примечания</div>
                  <div className="text-right">Действия</div>
                </div>

                {summary ? (
                  <div
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 bg-amber-50/60 px-4 py-3.5 lg:gap-0 lg:px-5 ${EXPENSE_COLS}`}
                  >
                    <div className="order-1 flex items-center gap-2.5 lg:order-none">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                        <V2Icons.spark className="h-4 w-4" />
                      </span>
                      <span className="v2-tight text-[14px] font-semibold text-[var(--v2-ink-900)]">Налоги</span>
                    </div>
                    <div className="v2-tight order-3 pr-3 text-[12.5px] text-[var(--v2-ink-500)] lg:order-none">
                      {line === "agency" ? "6 916 ₽/мес + 1% от расчётного счёта" : "1% от расчётного счёта"}
                    </div>
                    <div className="v2-tnum v2-tight order-2 text-right text-[14px] font-semibold text-red-500 max-lg:text-[16px] lg:order-none">
                      {formatRub(summary.taxAmount)}
                    </div>
                    <div className="v2-tight order-5 col-span-2 text-[12.5px] italic text-[var(--v2-ink-500)] lg:order-none lg:col-span-1 lg:pl-3">
                      {line === "agency"
                        ? "6916 ₽ + 1% с оплат на р/с"
                        : "1% с оплат на р/с · взносы ИП учтены в агентстве"}
                    </div>
                    <div className="order-4 text-right lg:order-none">
                      <span className="v2-tight inline-flex items-center gap-1 text-[12px] font-medium text-[var(--v2-ink-400)]">
                        <V2Icons.spark className="h-3.5 w-3.5" />
                        Авто
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className="divide-y divide-[var(--v2-ink-100)]/70">
                  {generalExpenses.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-[var(--v2-ink-500)] lg:px-5">
                      Нет расходов «{lineMeta.label}» за {FINANCE_MONTH_NAMES[month - 1]?.toLowerCase()}
                    </div>
                  ) : null}
                  {generalExpenses.map((e, i) => {
                    const tint = financeAvatarTint(e.employee_name, i + 2);
                    return (
                      <div
                        key={e.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => startEditingExpense(e)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            startEditingExpense(e);
                          }
                        }}
                        className={`group grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3.5 transition hover:bg-[var(--v2-ink-50)]/60 lg:gap-0 lg:px-5 ${EXPENSE_COLS}`}
                      >
                        <div className="order-1 flex min-w-0 items-center gap-2.5 lg:order-none">
                          <span
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold"
                            style={{ background: `${tint}1A`, color: tint }}
                          >
                            {e.employee_name[0]}
                          </span>
                          <span className="v2-tight text-[14px] font-medium text-[var(--v2-ink-900)] max-lg:truncate max-lg:text-[15px]">
                            {e.employee_name}
                          </span>
                        </div>
                        <div className="v2-tight order-3 text-[13px] text-[var(--v2-ink-600)] max-lg:pl-[38px] lg:order-none">
                          {e.employee_role}
                        </div>
                        <div className="v2-tnum v2-tight order-2 text-right text-[14px] font-semibold text-red-500 max-lg:text-[16px] lg:order-none">
                          {formatRub(e.amount)}
                        </div>
                        <div
                          className={`v2-tight order-5 col-span-2 text-[13px] text-[var(--v2-ink-400)] max-lg:pl-[38px] lg:order-none lg:col-span-1 lg:pl-3 ${
                            e.notes ? "" : "max-lg:hidden"
                          }`}
                        >
                          {e.notes || <Dash />}
                        </div>
                        <div className="order-4 text-right lg:order-none">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void fetchJson(`/api/v2/finance/general-expenses?id=${e.id}`, {
                                method: "DELETE",
                              }).then(reload);
                            }}
                            className="v2-tight text-[12.5px] font-medium text-[var(--v2-ink-400)] transition hover:text-red-500 max-lg:-mr-2 max-lg:h-9 max-lg:px-2 max-lg:text-[13.5px] pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {summary ? (
                  <div
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-t border-[var(--v2-ink-200)]/60 bg-[var(--v2-ink-50)]/50 px-4 py-3.5 lg:gap-0 lg:px-5 ${EXPENSE_COLS}`}
                  >
                    <div className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)] lg:col-span-2">
                      Итого расходов · {lineMeta.label}
                    </div>
                    <div className="v2-tnum text-right text-[15px] font-semibold text-red-500 max-lg:text-[16px]">
                      {formatRub(summary.manualGeneralExpenses)}
                    </div>
                    <div className="v2-tight col-span-2 text-[12px] text-[var(--v2-ink-400)] lg:text-right">
                      без учёта налога
                    </div>
                  </div>
                ) : null}
              </Card>
            </>
          ) : (
            <AnalyticsTab
              data={analytics}
              loading={analyticsLoading}
              error={analyticsError}
              lineLabel={lineMeta.label}
            />
          )}
        </div>
      </div>

      {newProjectOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/30 sm:items-center sm:p-4">
          <div className="max-h-[100dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[var(--v2-shadow-pop)] sm:rounded-2xl sm:p-6">
            <h2 className="v2-tight text-lg font-semibold text-[var(--v2-ink-900)]">
              Новый проект · {lineMeta.label}
            </h2>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
                Название
              </span>
              <input
                autoFocus
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleCreateProject()}
                placeholder="Название проекта"
                className="h-10 w-full rounded-xl border border-[var(--v2-ink-200)] px-3 text-sm max-lg:h-11"
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
                Сумма, ₽
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={newProjectAmount}
                onChange={(e) => setNewProjectAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleCreateProject()}
                placeholder="0"
                className="v2-tnum h-10 w-full rounded-xl border border-[var(--v2-ink-200)] px-3 text-sm max-lg:h-11"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2 max-sm:mt-5">
              <button
                type="button"
                onClick={() => {
                  setNewProjectOpen(false);
                  setNewProjectName("");
                  setNewProjectAmount("");
                }}
                className="h-9 rounded-xl px-4 text-sm text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-100)] max-sm:h-11 max-sm:flex-1 max-sm:bg-[var(--v2-ink-100)]"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => void handleCreateProject()}
                className="h-9 rounded-xl bg-[var(--v2-ink-900)] px-4 text-sm font-medium text-white max-sm:h-11 max-sm:flex-1"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TotalNote({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="v2-tight flex flex-wrap items-baseline gap-x-1.5 border-t border-[var(--v2-ink-100)] pt-2 text-[12px] text-[var(--v2-ink-500)]">
      <span>{label}:</span>
      <span className="v2-tnum font-semibold text-[var(--v2-ink-700)]">{value}</span>
      {hint ? <span className="text-[11px] text-[var(--v2-ink-400)]">· {hint}</span> : null}
    </div>
  );
}

function AnalyticsTab({
  data,
  loading,
  error,
  lineLabel,
}: {
  data: AnalyticsPayload | null;
  loading: boolean;
  error: string | null;
  lineLabel: string;
}) {
  if (loading && !data) {
    return <div className="py-16 text-center text-[var(--v2-ink-500)]">Загрузка аналитики…</div>;
  }
  if (error && !data) {
    return <div className="py-16 text-center text-[var(--v2-ink-700)]">{error}</div>;
  }
  if (!data) return null;

  const { months, byService, totals } = data;
  const maxSvc = Math.max(...byService.map((s) => s.total), 1);
  const serviceTotal = byService.reduce((s, x) => s + x.total, 0);
  const best = byService[0];
  const monthsWithData = months.filter((m) => m.projectCount > 0);
  const avgProfit = monthsWithData.length
    ? Math.round(monthsWithData.reduce((s, m) => s + m.profit, 0) / monthsWithData.length)
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 lg:gap-4">
        <h1 className="v2-tighter text-[26px] font-semibold leading-none text-[var(--v2-ink-900)] lg:text-[34px]">
          Аналитика
        </h1>
        <span className="v2-tight text-[13px] text-[var(--v2-ink-500)]">
          {lineLabel} · вся история{months.length ? ` · ${months.length} мес.` : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          label="Выручка за всё время"
          value={formatRub(totals.actualRevenue)}
          accent="#0EA5A4"
          icon={V2Icons.ruble}
          sub={`ожидалось ${formatRub(totals.expectedRevenue)}`}
        />
        <KpiCard
          label="Прибыль за всё время"
          value={formatRub(totals.profit)}
          tone={totals.profit >= 0 ? "green" : "red"}
          accent={totals.profit >= 0 ? "#10B981" : "#EF4444"}
          icon={V2Icons.reports}
          sub={`в среднем ${formatRub(avgProfit)} в месяц`}
        />
        <KpiCard
          label="Проектов"
          value={String(totals.projectCount)}
          accent="#3B6FF7"
          icon={V2Icons.projects}
          sub={
            totals.projectCount
              ? `средний чек ${formatRub(Math.round(totals.actualRevenue / totals.projectCount))}`
              : "—"
          }
        />
        <KpiCard
          label="Топ-услуга"
          value={best ? best.label : "—"}
          accent={best?.tint ?? "#7C5CFF"}
          icon={V2Icons.spark}
          sub={
            best && serviceTotal
              ? `${formatRub(best.total)} · ${Math.round((best.total / serviceTotal) * 100)}% выручки`
              : "Нет данных"
          }
        />
      </div>

      <Card className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h3 className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">Выручка по услугам</h3>
          <span className="v2-tight text-[12px] text-[var(--v2-ink-500)]">
            фактические оплаты за всю историю · {formatRub(serviceTotal)}
          </span>
        </div>
        <div className="space-y-4">
          {byService.map((s) => (
            <StatBar
              key={s.serviceType}
              label={`${s.label} · ${s.count} проектов · ${
                serviceTotal ? Math.round((s.total / serviceTotal) * 100) : 0
              }%`}
              value={s.total}
              max={maxSvc}
              tint={s.tint}
            />
          ))}
          {byService.length === 0 ? <p className="text-sm text-[var(--v2-ink-500)]">Нет данных</p> : null}
        </div>
      </Card>

      <Card className="p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <h3 className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">
            Выручка и прибыль по месяцам
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[var(--v2-ink-500)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#3B6FF7]" />
              Выручка
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#10B981]" />
              Прибыль
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#EF4444]" />
              Убыток
            </span>
          </div>
        </div>
        <MonthlyChart months={months} />
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto overscroll-x-contain">
          <div className="max-lg:min-w-[560px]">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_0.7fr] border-b border-[var(--v2-ink-100)]/70 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--v2-ink-400)] max-lg:pl-0">
              <div className="max-lg:sticky max-lg:left-0 max-lg:z-[1] max-lg:bg-white max-lg:pl-4">Месяц</div>
              <div className="text-right">Выручка</div>
              <div className="text-right">Расходы</div>
              <div className="text-right">Прибыль</div>
              <div className="text-right">Проектов</div>
            </div>
            <div className="divide-y divide-[var(--v2-ink-100)]/70">
              {[...months].reverse().map((m) => (
                <div
                  key={m.key}
                  className="grid grid-cols-[1fr_1fr_1fr_1fr_0.7fr] items-center px-5 py-3 text-[13px] max-lg:pl-0"
                >
                  <div className="v2-tight font-medium text-[var(--v2-ink-900)] max-lg:sticky max-lg:left-0 max-lg:z-[1] max-lg:bg-white max-lg:py-1 max-lg:pl-4">
                    {FINANCE_MONTH_NAMES[m.month - 1]} {m.year}
                  </div>
                  <div className="v2-tnum text-right text-[var(--v2-ink-800)]">{formatRub(m.actualRevenue)}</div>
                  <div className="v2-tnum text-right text-red-500">{formatRub(m.totalExpenses)}</div>
                  <div
                    className={`v2-tnum text-right font-semibold ${
                      m.profit >= 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {formatRub(m.profit)}
                  </div>
                  <div className="v2-tnum text-right text-[var(--v2-ink-500)]">{m.projectCount}</div>
                </div>
              ))}
              {months.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-[var(--v2-ink-500)]">Пока нет истории</div>
              ) : null}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

const CHART_HEIGHT = 200;

function MonthlyChart({ months }: { months: AnalyticsMonthPoint[] }) {
  if (months.length === 0) {
    return <p className="py-10 text-center text-sm text-[var(--v2-ink-500)]">Пока нет истории</p>;
  }

  const maxPositive = Math.max(...months.map((m) => Math.max(m.actualRevenue, m.profit, 0)), 1);
  const maxNegative = Math.max(...months.map((m) => Math.max(-m.profit, 0)), 0);
  const scale = maxPositive + maxNegative;
  const positiveHeight = (CHART_HEIGHT * maxPositive) / scale;
  const negativeHeight = CHART_HEIGHT - positiveHeight;

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-full items-end gap-2" style={{ minWidth: months.length * 46 }}>
        {months.map((m) => {
          const revenueH = (m.actualRevenue / scale) * CHART_HEIGHT;
          const profitH = (Math.abs(m.profit) / scale) * CHART_HEIGHT;
          return (
            <div key={m.key} className="flex min-w-[38px] flex-1 flex-col items-center gap-1.5">
              <div className="relative w-full" style={{ height: CHART_HEIGHT }}>
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-[var(--v2-ink-200)]"
                  style={{ top: positiveHeight }}
                />
                <div
                  className="absolute inset-x-0 flex items-end justify-center gap-1"
                  style={{ height: positiveHeight, top: 0 }}
                >
                  <div
                    className="w-[42%] rounded-t-[3px] bg-[#3B6FF7]/85 transition hover:bg-[#3B6FF7]"
                    style={{ height: Math.max(m.actualRevenue > 0 ? 2 : 0, revenueH) }}
                    title={`${FINANCE_MONTH_NAMES[m.month - 1]} ${m.year} · выручка ${formatRub(m.actualRevenue)}`}
                  />
                  {m.profit >= 0 ? (
                    <div
                      className="w-[42%] rounded-t-[3px] bg-[#10B981]/85 transition hover:bg-[#10B981]"
                      style={{ height: Math.max(m.profit > 0 ? 2 : 0, profitH) }}
                      title={`${FINANCE_MONTH_NAMES[m.month - 1]} ${m.year} · прибыль ${formatRub(m.profit)}`}
                    />
                  ) : (
                    <div className="w-[42%]" />
                  )}
                </div>
                {m.profit < 0 && negativeHeight > 0 ? (
                  <div
                    className="absolute inset-x-0 flex items-start justify-center gap-1"
                    style={{ top: positiveHeight, height: negativeHeight }}
                  >
                    <div className="w-[42%]" />
                    <div
                      className="w-[42%] rounded-b-[3px] bg-[#EF4444]/85 transition hover:bg-[#EF4444]"
                      style={{ height: Math.max(2, profitH) }}
                      title={`${FINANCE_MONTH_NAMES[m.month - 1]} ${m.year} · убыток ${formatRub(m.profit)}`}
                    />
                  </div>
                ) : null}
              </div>
              <span className="v2-tight whitespace-nowrap text-[10.5px] text-[var(--v2-ink-500)]">{m.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
