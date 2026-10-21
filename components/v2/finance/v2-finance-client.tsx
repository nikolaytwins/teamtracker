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
  byService: V2FinanceServiceStat[];
};

const PROJECT_COLS =
  "grid grid-cols-[1.7fr_0.95fr_0.95fr_0.95fr_0.8fr_0.95fr_0.95fr_0.95fr]";
const EXPENSE_COLS = "grid grid-cols-[1.3fr_2fr_1fr_1.7fr_0.9fr]";

function FinanceCard({ className = "", children }: { className?: string; children: React.ReactNode }) {
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
        className="v2-tight h-10 cursor-pointer appearance-none rounded-xl bg-white pl-3.5 pr-9 text-[13.5px] font-medium max-sm:h-11 max-sm:text-[16px] text-[var(--v2-ink-800)] shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)] focus:outline-none focus:ring-2 focus:ring-[var(--v2-brand-500)]/40"
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
    onChange(parseFloat(temp.replace(/\s/g, "").replace(",", ".")) || 0);
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
        type="text"
        inputMode="decimal"
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
        className="v2-tnum w-28 max-w-full rounded border border-[var(--v2-brand-500)] bg-white px-2 py-1 text-right text-sm max-sm:py-2 max-sm:text-[16px]"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`v2-tnum v2-tight whitespace-nowrap rounded px-2 py-1 text-right text-[14px] font-semibold hover:bg-[var(--v2-ink-50)] max-sm:py-2.5 ${toneClass}`}
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
        className="v2-tight h-8 cursor-pointer appearance-none rounded-full py-0 pl-3 pr-8 text-[12px] font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--v2-brand-500)]/30"
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

function FinanceStatusChip({
  count,
  status,
}: {
  count: number;
  status: V2FinancePaymentStatus;
}) {
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
}: {
  label: string;
  value: string;
  tone?: "ink" | "green" | "red";
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
  sub?: string;
}) {
  const toneClass =
    tone === "red" ? "text-red-500" : tone === "green" ? "text-emerald-600" : "text-[var(--v2-ink-900)]";
  return (
    <FinanceCard className="min-w-0 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-lg"
          style={{ background: `${accent}14`, color: accent }}
        >
          <Icon className="h-[15px] w-[15px]" />
        </span>
        {label}
      </div>
      <div className={`v2-tnum v2-tighter mt-3 text-[21px] font-semibold leading-none sm:text-[28px] ${toneClass}`}>{value}</div>
      {sub ? <div className="v2-tight mt-2 text-[12px] text-[var(--v2-ink-500)]">{sub}</div> : null}
    </FinanceCard>
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

export function V2FinanceClient() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [tab, setTab] = useState<"projects" | "stats">("projects");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectAmount, setNewProjectAmount] = useState("");
  const [newProjectLine, setNewProjectLine] = useState<V2FinanceBusinessLine>("agency");
  const [lineTab, setLineTab] = useState<V2FinanceBusinessLine>("agency");
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

  const load = useCallback(
    async (y: number, m: number) => {
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchJson<DashboardPayload>(
          `/api/v2/finance/dashboard?year=${y}&month=${m}`
        );
        setData(payload);
        setYear(payload.year);
        setMonth(payload.month);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void (async () => {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchJson<DashboardPayload>(`/api/v2/finance/dashboard?year=${y}&month=${m}`);
        setData(payload);
        setYear(payload.year);
        setMonth(payload.month);
        setMonthReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!monthReady) return;
    if (skipMonthReload.current) {
      skipMonthReload.current = false;
      return;
    }
    void load(year, month);
  }, [year, month, monthReady, load]);

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
        body: JSON.stringify({ name, totalAmount, businessLine: newProjectLine, year, month }),
      });
      setNewProjectName("");
      setNewProjectAmount("");
      setNewProjectLine(lineTab);
      setNewProjectOpen(false);
      await load(year, month);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Не удалось создать проект");
    }
  };

  const handleSaveExpense = async () => {
    const amount = parseFloat(expenseAmount.replace(/\s/g, "").replace(",", "."));
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

  const reload = useCallback(() => load(year, month), [load, year, month]);
  const summary = data?.summary;
  const allProjects = data?.projects ?? [];
  const projects = useMemo(
    () => allProjects.filter((p) => p.business_line === lineTab),
    [allProjects, lineTab]
  );
  const lineTotals = useMemo(() => {
    const expected = projects.reduce((s, p) => s + p.effective_total_amount, 0);
    const actual = projects.reduce((s, p) => s + p.paid_amount, 0);
    return { expected, actual };
  }, [projects]);
  const generalExpenses = data?.generalExpenses ?? [];

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
    <div className="flex min-h-full flex-col">
      <header className="flex h-14 items-center gap-3 border-b border-[var(--v2-ink-100)]/70 px-4 sm:px-7">
        <div className="v2-tight flex min-w-0 items-center gap-2 text-[13px] text-[var(--v2-ink-500)]">
          <span className="text-[var(--v2-ink-400)] max-sm:hidden">Студия</span>
          <span className="text-[var(--v2-ink-300)] max-sm:hidden">/</span>
          <span className="truncate font-medium text-[var(--v2-ink-900)]">Проекты и финансы</span>
        </div>
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => {
              setNewProjectLine(lineTab);
              setNewProjectOpen(true);
            }}
            className="v2-tight inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[var(--v2-ink-900)] px-3.5 text-[12.5px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)] max-sm:h-10 max-sm:text-[13.5px]"
          >
            <V2Icons.plus className="h-4 w-4 shrink-0" />
            Новый проект
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1280px] px-3 pb-24 pt-4 sm:px-6 sm:pt-7 lg:px-10">
          <div className="mb-5 flex items-center gap-6 border-b border-[var(--v2-ink-200)]/70 sm:mb-6">
            {(
              [
                ["projects", "Проекты"],
                ["stats", "Статистика"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`v2-tight relative pb-3 text-[14px] font-medium transition max-sm:pt-2 max-sm:text-[15px] ${
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

          <div className="mb-5 flex flex-wrap items-center gap-3 sm:mb-6 sm:gap-4">
            <h1 className="v2-tighter text-[28px] font-semibold leading-none text-[var(--v2-ink-900)] sm:text-[34px]">Проекты</h1>
            <div className="flex flex-wrap items-center gap-2 max-sm:w-full sm:pl-2">
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
              <span className="v2-tight max-w-[150px] text-[12px] leading-tight text-[var(--v2-ink-500)] max-sm:hidden">
                Фильтр по месяцу создания проекта
              </span>
              <button
                type="button"
                onClick={() => {
                  setYear(today.getFullYear());
                  setMonth(today.getMonth() + 1);
                }}
                className="v2-tight text-[13px] font-medium text-[var(--v2-brand-600)] transition hover:text-[var(--v2-brand-700)] max-sm:h-11 max-sm:px-2 max-sm:text-[14px]"
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
              />
              <KpiCard
                label="Расходы"
                value={formatRub(summary.totalExpenses)}
                tone="red"
                accent="#EF4444"
                icon={V2Icons.folder}
                sub={`${formatRub(summary.manualGeneralExpenses + summary.projectExpenses)} команда · ${formatRub(summary.taxAmount)} налог`}
              />
              <KpiCard
                label="Прибыль"
                value={formatRub(summary.profit)}
                tone={summary.profit >= 0 ? "green" : "red"}
                accent={summary.profit >= 0 ? "#10B981" : "#EF4444"}
                icon={V2Icons.reports}
                sub={`маржа ${Math.round(summary.margin)}% · предполагаемая выручка − расходы`}
              />
            </div>
          ) : null}

          {tab === "projects" ? (
            <>
              <div className="mb-4">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <h2 className="v2-tighter text-[22px] font-semibold leading-none text-[var(--v2-ink-900)]">
                    {FINANCE_BUSINESS_LINE_META[lineTab].label}
                  </h2>
                  <div className="inline-flex max-w-full items-center overflow-x-auto rounded-full bg-white p-1 shadow-[var(--v2-shadow-card)]">
                    {(Object.keys(FINANCE_BUSINESS_LINE_META) as V2FinanceBusinessLine[]).map((k) => {
                      const active = lineTab === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setLineTab(k)}
                          className={`v2-tight h-8 shrink-0 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-medium transition max-sm:h-10 max-sm:text-[13.5px] ${
                            active
                              ? "bg-[var(--v2-ink-900)] text-white"
                              : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
                          }`}
                        >
                          {FINANCE_BUSINESS_LINE_META[k].label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {projects.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <FinanceStatusChip count={projects.filter((p) => p.status === "paid").length} status="paid" />
                    <FinanceStatusChip count={projects.filter((p) => p.status === "prepaid").length} status="prepaid" />
                    <FinanceStatusChip count={projects.filter((p) => p.status === "not_paid").length} status="not_paid" />
                  </div>
                ) : null}
              </div>
              <FinanceCard className="mb-7 overflow-hidden">
                <div className="overflow-x-auto overscroll-x-contain">
                  <div className="min-w-[980px] lg:min-w-0">
                    <div
                      className={`${PROJECT_COLS} border-b border-[var(--v2-ink-100)]/70 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--v2-ink-400)]`}
                    >
                      <div>Проект</div>
                      <div>Услуга</div>
                      <div>Тип клиента</div>
                      <div>Статус</div>
                      <div>Контакт</div>
                      <div>Способ оплаты</div>
                      <div className="text-right">Сумма</div>
                      <div className="text-right">Оплачено</div>
                    </div>
                    <div className="divide-y divide-[var(--v2-ink-100)]/70">
                      {projects.length === 0 ? (
                        <div className="px-5 py-10 text-center text-sm text-[var(--v2-ink-500)]">
                          Нет проектов «{FINANCE_BUSINESS_LINE_META[lineTab].label}» за выбранный месяц
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
                              className={`group ${PROJECT_COLS} items-center border-l-[3px] px-5 py-3.5 transition hover:brightness-[0.99]`}
                              style={{
                                borderLeftColor: statusMeta.dot,
                                backgroundColor: statusMeta.bg,
                              }}
                            >
                              <div className="flex min-w-0 items-center gap-2.5 pr-2">
                                <span
                                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold"
                                  style={{ background: `${tint}1A`, color: tint }}
                                >
                                  {p.name[0]}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <Link
                                    href={appPath(`/v2/agency/projects/${p.id}`)}
                                    className="v2-tight block truncate text-[14px] font-medium text-[var(--v2-ink-900)] transition hover:text-[var(--v2-brand-700)] hover:underline"
                                    title="Открыть проект и детализацию"
                                  >
                                    {p.name}
                                  </Link>
                                  <select
                                    value={p.business_line}
                                    onChange={(e) =>
                                      void patchProject(p.id, {
                                        businessLine: e.target.value as V2FinanceBusinessLine,
                                      })
                                    }
                                    className="v2-tight mt-0.5 max-w-full rounded border-0 bg-transparent py-0 pl-0 text-[11px] font-medium text-[var(--v2-ink-500)] focus:ring-2 focus:ring-[var(--v2-brand-500)]/30"
                                    title="Направление"
                                  >
                                    {(Object.keys(FINANCE_BUSINESS_LINE_META) as V2FinanceBusinessLine[]).map(
                                      (k) => (
                                        <option key={k} value={k}>
                                          {FINANCE_BUSINESS_LINE_META[k].label}
                                        </option>
                                      )
                                    )}
                                  </select>
                                </div>
                                <span className="ml-0.5 hidden items-center gap-0.5 group-hover:flex [@media(hover:none)]:flex">
                                  <Link
                                    href={appPath(`/v2/agency/projects/${p.id}`)}
                                    title="Детализация"
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--v2-ink-400)] transition [@media(hover:none)]:h-9 [@media(hover:none)]:w-9 hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-800)]"
                                  >
                                    <V2Icons.list className="h-3.5 w-3.5" />
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
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--v2-ink-400)] transition [@media(hover:none)]:h-9 [@media(hover:none)]:w-9 hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-800)]"
                                  >
                                    <V2Icons.link className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Перенести"
                                    onClick={() => setMoveProjectId(moveProjectId === p.id ? null : p.id)}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--v2-ink-400)] transition [@media(hover:none)]:h-9 [@media(hover:none)]:w-9 hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-800)]"
                                  >
                                    <V2Icons.cal className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Удалить"
                                    onClick={() => {
                                      if (!confirm(`Удалить «${p.name}»?`)) return;
                                      void fetchJson(`/api/v2/finance/projects/${p.id}`, { method: "DELETE" }).then(reload);
                                    }}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--v2-ink-400)] transition [@media(hover:none)]:h-9 [@media(hover:none)]:w-9 hover:bg-red-50 hover:text-red-500"
                                  >
                                    <V2Icons.trash className="h-3.5 w-3.5" />
                                  </button>
                                </span>
                              </div>
                              <div>
                                <select
                                  value={p.service_type}
                                  onChange={(e) =>
                                    void patchProject(p.id, { serviceType: e.target.value })
                                  }
                                  className="v2-tight rounded-lg border-0 bg-transparent text-[12.5px] font-medium text-[var(--v2-ink-700)] focus:ring-2 focus:ring-[var(--v2-brand-500)]/30"
                                >
                                  {(Object.keys(FINANCE_SERVICE_META) as V2FinanceServiceType[]).map((k) => (
                                    <option key={k} value={k}>
                                      {FINANCE_SERVICE_META[k].label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <select
                                  value={p.client_type ?? ""}
                                  onChange={(e) =>
                                    void patchProject(p.id, {
                                      clientType: e.target.value || null,
                                    })
                                  }
                                  className="v2-tight max-w-full rounded-lg border-0 bg-transparent text-[12.5px] text-[var(--v2-ink-700)] focus:ring-2 focus:ring-[var(--v2-brand-500)]/30"
                                >
                                  <option value="">—</option>
                                  {FINANCE_CLIENT_TYPE_OPTIONS.map((o) => (
                                    <option key={o} value={o}>
                                      {o}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <FinanceStatusSelect
                                  value={p.status}
                                  onChange={(status) => {
                                    const patch: Record<string, unknown> = { status };
                                    if (status === "paid") patch.paidAmount = p.effective_total_amount;
                                    if (status === "not_paid") patch.paidAmount = 0;
                                    void patchProject(p.id, patch);
                                  }}
                                />
                              </div>
                              <div className="v2-tight truncate text-[13px] text-[var(--v2-ink-600)]">
                                {p.client_contact || <Dash />}
                              </div>
                              <div>
                                <select
                                  value={p.payment_method ?? ""}
                                  onChange={(e) =>
                                    void patchProject(p.id, {
                                      paymentMethod: e.target.value || null,
                                    })
                                  }
                                  className="v2-tight rounded-lg border-0 bg-transparent text-[12.5px] focus:ring-2 focus:ring-[var(--v2-brand-500)]/30"
                                >
                                  <option value="">—</option>
                                  {FINANCE_PAYMENT_METHOD_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="text-right">
                                <InlineMoney
                                  value={p.effective_total_amount}
                                  onChange={(n) => void patchProject(p.id, { totalAmount: n })}
                                />
                              </div>
                              <div className="text-right">
                                <InlineMoney
                                  value={p.paid_amount}
                                  tone={paidTone}
                                  onChange={(n) => void patchProject(p.id, { paidAmount: n })}
                                />
                              </div>
                              {moveProjectId === p.id ? (
                                <div className="col-span-full mt-1 rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] p-3">
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
                                          className="rounded-lg border border-[var(--v2-ink-200)] bg-white px-3 py-1.5 text-xs hover:bg-[var(--v2-ink-100)]"
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
                        className={`${PROJECT_COLS} border-t border-[var(--v2-ink-200)]/60 bg-[var(--v2-ink-50)]/50 px-5 py-3.5 text-[13px]`}
                      >
                        <div className="v2-tight col-span-6 flex items-center gap-2 font-semibold text-[var(--v2-ink-900)]">
                          Итого по проектам
                          <span className="text-[12px] font-normal text-[var(--v2-ink-500)]">
                            · {projects.length} шт.
                          </span>
                        </div>
                        <div className="v2-tnum v2-tight text-right font-semibold text-[var(--v2-ink-900)]">
                          {formatRub(lineTotals.expected)}
                        </div>
                        <div className="v2-tnum v2-tight text-right font-semibold text-emerald-600">
                          {formatRub(lineTotals.actual)}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </FinanceCard>

              <FinanceCard className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:flex-nowrap sm:gap-4 sm:px-5">
                  <div>
                    <h3 className="v2-tighter text-[16px] font-semibold text-[var(--v2-ink-900)]">
                      Общие расходы
                    </h3>
                    <p className="v2-tight mt-0.5 text-[12.5px] text-[var(--v2-ink-500)]">
                      Команда и налоги за {FINANCE_MONTH_NAMES[month - 1]?.toLowerCase()} · всего{" "}
                      <span className="font-medium text-red-500">
                        {summary ? formatRub(summary.totalExpenses) : "—"}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 max-sm:w-full">
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
                          }),
                        }).then(reload);
                      }}
                      className="v2-tight inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[12.5px] font-medium text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)] max-sm:h-11 max-sm:flex-1 max-sm:justify-center max-sm:px-2"
                    >
                      <V2Icons.link className="h-4 w-4 shrink-0 text-[var(--v2-ink-500)]" />
                      <span className="sm:hidden">С прошлого месяца</span>
                      <span className="max-sm:hidden">Скопировать с прошлого месяца</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (expenseFormOpen) closeExpenseForm();
                        else setExpenseFormOpen(true);
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-3.5 text-[12.5px] font-medium text-white transition hover:bg-[var(--v2-ink-700)] max-sm:h-11 max-sm:flex-1 max-sm:justify-center max-sm:px-2"
                    >
                      <V2Icons.plus className="h-4 w-4 shrink-0" />
                      Добавить расход
                    </button>
                  </div>
                </div>

                {expenseFormOpen ? (
                  <div className="mx-3 mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)]/60 p-3 sm:mx-5 sm:p-4">
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
                        className="h-9 rounded-lg border border-[var(--v2-ink-200)] bg-white px-3 text-sm max-sm:h-11 max-sm:text-[16px]"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--v2-ink-500)] max-sm:min-w-0 max-sm:flex-1">
                      Роль
                      <select
                        value={expenseRole}
                        onChange={(e) => setExpenseRole(e.target.value)}
                        className="h-9 rounded-lg border border-[var(--v2-ink-200)] bg-white px-3 text-sm max-sm:h-11 max-sm:text-[16px]"
                      >
                        {FINANCE_EMPLOYEE_ROLES.map((r) => (
                          <option key={r.value} value={r.label}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--v2-ink-500)] max-sm:min-w-0 max-sm:flex-1">
                      Сумма
                      <input
                        type="text"
                        inputMode="decimal"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        className="v2-tnum h-9 w-32 rounded-lg border border-[var(--v2-ink-200)] bg-white px-3 text-sm max-sm:h-11 max-sm:w-full max-sm:text-[16px]"
                      />
                    </label>
                    <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs text-[var(--v2-ink-500)] max-sm:w-full max-sm:min-w-0 max-sm:flex-none">
                      Примечание
                      <input
                        value={expenseNotes}
                        onChange={(e) => setExpenseNotes(e.target.value)}
                        className="h-9 rounded-lg border border-[var(--v2-ink-200)] bg-white px-3 text-sm max-sm:h-11 max-sm:text-[16px]"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleSaveExpense()}
                      className="h-9 rounded-xl bg-[var(--v2-brand-600)] px-4 text-sm font-medium text-white max-sm:h-11 max-sm:flex-1"
                    >
                      {editingExpenseId ? "Сохранить изменения" : "Сохранить"}
                    </button>
                    {editingExpenseId ? (
                      <button
                        type="button"
                        onClick={closeExpenseForm}
                        className="h-9 rounded-xl px-3 text-sm text-[var(--v2-ink-600)] hover:bg-white max-sm:h-11"
                      >
                        Отмена
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <div className="overflow-x-auto overscroll-x-contain">
                  <div className="min-w-[720px] md:min-w-0">
                    <div
                      className={`${EXPENSE_COLS} border-y border-[var(--v2-ink-100)]/70 bg-[var(--v2-ink-50)]/40 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--v2-ink-400)]`}
                    >
                      <div>Сотрудник</div>
                      <div>Роль</div>
                      <div className="text-right">Сумма</div>
                      <div className="pl-3">Примечания</div>
                      <div className="text-right">Действия</div>
                    </div>

                    {summary ? (
                      <div className={`${EXPENSE_COLS} items-center bg-amber-50/60 px-5 py-3.5`}>
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                            <V2Icons.spark className="h-4 w-4" />
                          </span>
                          <span className="v2-tight text-[14px] font-semibold text-[var(--v2-ink-900)]">Налоги</span>
                        </div>
                        <div className="v2-tight pr-3 text-[12.5px] text-[var(--v2-ink-500)]">
                          6 916 ₽/мес + 1% от расчётного счёта
                        </div>
                        <div className="v2-tnum v2-tight text-right text-[14px] font-semibold text-red-500">
                          {formatRub(summary.taxAmount)}
                        </div>
                        <div className="v2-tight pl-3 text-[12.5px] italic text-[var(--v2-ink-500)]">
                          6916 ₽ + 1% с оплат на р/с
                        </div>
                        <div className="text-right">
                          <span className="v2-tight inline-flex items-center gap-1 text-[12px] font-medium text-[var(--v2-ink-400)]">
                            <V2Icons.spark className="h-3.5 w-3.5" />
                            Авто
                          </span>
                        </div>
                      </div>
                    ) : null}

                    <div className="divide-y divide-[var(--v2-ink-100)]/70">
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
                            className={`group ${EXPENSE_COLS} cursor-pointer items-center px-5 py-3.5 transition hover:bg-[var(--v2-ink-50)]/60`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold"
                                style={{ background: `${tint}1A`, color: tint }}
                              >
                                {e.employee_name[0]}
                              </span>
                              <span className="v2-tight text-[14px] font-medium text-[var(--v2-ink-900)]">
                                {e.employee_name}
                              </span>
                            </div>
                            <div className="v2-tight flex items-center gap-2 text-[13px] text-[var(--v2-ink-600)]">
                              {e.employee_role}
                              <span
                                className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                                style={{
                                  background: FINANCE_BUSINESS_LINE_META[e.business_line].bg,
                                  color: FINANCE_BUSINESS_LINE_META[e.business_line].tint,
                                }}
                              >
                                {FINANCE_BUSINESS_LINE_META[e.business_line].label}
                              </span>
                            </div>
                            <div className="v2-tnum v2-tight text-right text-[14px] font-semibold text-red-500">
                              {formatRub(e.amount)}
                            </div>
                            <div className="v2-tight pl-3 text-[13px] text-[var(--v2-ink-400)]">
                              {e.notes || <Dash />}
                            </div>
                            <div className="text-right">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void fetchJson(`/api/v2/finance/general-expenses?id=${e.id}`, {
                                    method: "DELETE",
                                  }).then(reload);
                                }}
                                className="v2-tight text-[12.5px] font-medium text-[var(--v2-ink-400)] opacity-0 transition hover:text-red-500 group-hover:opacity-100 [@media(hover:none)]:-my-2 [@media(hover:none)]:px-2 [@media(hover:none)]:py-2.5 [@media(hover:none)]:opacity-100"
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
                        className={`${EXPENSE_COLS} items-center border-t border-[var(--v2-ink-200)]/60 bg-[var(--v2-ink-50)]/50 px-5 py-3.5`}
                      >
                        <div className="v2-tight col-span-2 text-[13px] font-semibold text-[var(--v2-ink-900)]">
                          Итого общих расходов
                        </div>
                        <div className="v2-tnum text-right text-[15px] font-semibold text-red-500">
                          {formatRub(summary.manualGeneralExpenses)}
                        </div>
                        <div className="v2-tight col-span-2 text-right text-[12px] text-[var(--v2-ink-400)]">
                          без учёта налога
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </FinanceCard>
            </>
          ) : (
            <StatsTab
              byService={data?.byService ?? []}
              summary={summary}
              projectCount={projects.length}
            />
          )}
        </div>
      </div>

      {newProjectOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/30 sm:items-center sm:p-4">
          <div className="max-h-[94dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-[var(--v2-shadow-pop)] sm:max-h-[90vh] sm:rounded-2xl sm:p-6">
            <h2 className="v2-tight text-lg font-semibold text-[var(--v2-ink-900)]">Новый проект</h2>
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
                className="h-10 w-full rounded-xl border border-[var(--v2-ink-200)] px-3 text-sm max-sm:h-11 max-sm:text-[16px]"
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
                className="v2-tnum h-10 w-full rounded-xl border border-[var(--v2-ink-200)] px-3 text-sm max-sm:h-11 max-sm:text-[16px]"
              />
            </label>
            <div className="mt-3">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
                Направление
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(FINANCE_BUSINESS_LINE_META) as V2FinanceBusinessLine[]).map((k) => {
                  const meta = FINANCE_BUSINESS_LINE_META[k];
                  const active = newProjectLine === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setNewProjectLine(k)}
                      className={`v2-tight rounded-xl border px-3 py-2.5 text-[13px] font-medium transition ${
                        active
                          ? "border-[var(--v2-brand-400)] bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]"
                          : "border-[var(--v2-ink-200)] text-[var(--v2-ink-700)] hover:border-[var(--v2-ink-300)]"
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewProjectOpen(false);
                  setNewProjectName("");
                  setNewProjectAmount("");
                  setNewProjectLine(lineTab);
                }}
                className="h-9 rounded-xl px-4 text-sm text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-100)] max-sm:h-12"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => void handleCreateProject()}
                className="h-9 rounded-xl bg-[var(--v2-ink-900)] px-4 text-sm font-medium text-white max-sm:h-12 max-sm:flex-1"
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

function StatsTab({
  byService,
  summary,
  projectCount,
}: {
  byService: V2FinanceServiceStat[];
  summary: V2FinanceMonthSummary | undefined;
  projectCount: number;
}) {
  if (!summary) return null;
  const maxSvc = Math.max(...byService.map((s) => s.total), 1);
  const comp = [
    { label: "Команда (дизайнеры)", value: summary.manualGeneralExpenses + summary.projectExpenses, tint: "#EF4444" },
    { label: "Налоги", value: summary.taxAmount, tint: "#F59E0B" },
    { label: "Прибыль", value: summary.profit, tint: "#10B981" },
  ];
  const maxComp = summary.expectedRevenue || 1;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <FinanceCard className="p-5 sm:p-6">
        <h3 className="v2-tight mb-4 text-[15px] font-semibold text-[var(--v2-ink-900)]">Выручка по услугам</h3>
        <div className="space-y-4">
          {byService.map((s) => (
            <StatBar
              key={s.serviceType}
              label={`${s.label} · ${s.count}`}
              value={s.total}
              max={maxSvc}
              tint={s.tint}
            />
          ))}
          {byService.length === 0 ? (
            <p className="text-sm text-[var(--v2-ink-500)]">Нет данных за месяц</p>
          ) : null}
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-[var(--v2-ink-100)]/80 pt-4 text-[13px]">
          <span className="v2-tight text-[var(--v2-ink-500)]">Средний чек</span>
          <span className="v2-tnum font-semibold text-[var(--v2-ink-900)]">
            {formatRub(projectCount ? Math.round(summary.actualRevenue / projectCount) : 0)}
          </span>
        </div>
      </FinanceCard>
      <FinanceCard className="p-5 sm:p-6">
        <h3 className="v2-tight mb-4 text-[15px] font-semibold text-[var(--v2-ink-900)]">Куда уходит выручка</h3>
        <div className="space-y-4">
          {comp.map((c) => (
            <StatBar key={c.label} label={c.label} value={c.value} max={maxComp} tint={c.tint} />
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-[var(--v2-ink-100)]/80 pt-4 text-[13px]">
          <span className="v2-tight text-[var(--v2-ink-500)]">Маржа прибыли</span>
          <span className="v2-tnum font-semibold text-emerald-600">{Math.round(summary.margin)}%</span>
        </div>
      </FinanceCard>
    </div>
  );
}
