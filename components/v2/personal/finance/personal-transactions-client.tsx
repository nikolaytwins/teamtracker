"use client";

import { PersonalAmt, PersonalMaskProvider } from "./personal-finance-mask";
import { PersonalOperationModal } from "./personal-operation-modal";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { apiUrl, appPath } from "@/lib/api-url";
import {
  PERSONAL_MONTH_NAMES,
} from "@/lib/v2/personal/formatters";
import type {
  PersonalAccountRow,
  PersonalBudgetCategoryRow,
  PersonalFinanceDashboard,
  PersonalTransactionRow,
  PersonalTxnType,
} from "@/lib/v2/personal/types";
import { V2Icons } from "@/components/v2/ui/icons";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ImportPreviewItem = {
  date: string;
  time: string | null;
  amount_rub: number;
  txn_type: "expense" | "income";
  description: string;
  external_id: string;
  budget_category_id: string | null;
  budget_category_name: string | null;
  selected: boolean;
  year: number;
  month: number;
};

function PfCard({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl bg-white shadow-[var(--v2-shadow-soft)] ${className}`}>{children}</div>;
}

function formatDayLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "short" });
}

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function typeMeta(t: PersonalTxnType) {
  if (t === "income") return { label: "Доход", tint: "#10B981", soft: "#ECFDF5" };
  if (t === "transfer") return { label: "Перевод", tint: "#6366F1", soft: "#EEF2FF" };
  return { label: "Расход", tint: "#EF4444", soft: "#FEF2F2" };
}

export function PersonalTransactionsClient({
  initialYear,
  initialMonth,
}: {
  initialYear?: number;
  initialMonth?: number;
}) {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(initialYear ?? today.getFullYear());
  const [month, setMonth] = useState(initialMonth ?? today.getMonth() + 1);
  const [masked, setMasked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<PersonalTransactionRow[]>([]);
  const [accounts, setAccounts] = useState<PersonalAccountRow[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<PersonalBudgetCategoryRow[]>([]);
  const [budgetLimit, setBudgetLimit] = useState(0);
  const [filterType, setFilterType] = useState<PersonalTxnType | "all">("all");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [operationOpen, setOperationOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year: String(y), month: String(m) });
      if (filterType !== "all") params.set("txn_type", filterType);
      if (filterCat !== "all") params.set("budget_category_id", filterCat);
      if (qDebounced.trim()) params.set("q", qDebounced.trim());

      const [dash, list] = await Promise.all([
        fetchJson<PersonalFinanceDashboard>(`/api/v2/personal/finance/dashboard?year=${y}&month=${m}`),
        fetchJson<{ transactions: PersonalTransactionRow[] }>(
          `/api/v2/personal/finance/transactions?${params.toString()}`
        ),
      ]);
      setAccounts(dash.accounts);
      setBudgetCategories(dash.budgetCategories);
      setBudgetLimit(dash.budget.limit_rub);
      setTransactions(list.transactions);
      setYear(dash.year);
      setMonth(dash.month);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [filterType, filterCat, qDebounced]);

  useEffect(() => {
    void load(year, month);
  }, [year, month, load]);

  const deleteTxn = async (id: string) => {
    if (!confirm("Удалить операцию? Баланс и траты по категории откатятся.")) return;
    try {
      await fetchJson(`/api/v2/personal/finance/transactions/${id}`, { method: "DELETE" });
      await load(year, month);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить");
    }
  };

  const expenseTotal = transactions
    .filter((t) => t.txn_type === "expense")
    .reduce((s, t) => s + t.amount_rub, 0);
  const incomeTotal = transactions
    .filter((t) => t.txn_type === "income")
    .reduce((s, t) => s + t.amount_rub, 0);

  const grouped = useMemo(() => {
    const map = new Map<string, PersonalTransactionRow[]>();
    for (const t of transactions) {
      const k = dayKey(t.txn_date);
      const arr = map.get(k) ?? [];
      arr.push(t);
      map.set(k, arr);
    }
    return [...map.entries()];
  }, [transactions]);

  const shift = (delta: number) => {
    let m = month + delta;
    let y = year;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    setYear(y);
    setMonth(m);
  };

  return (
    <PersonalMaskProvider masked={masked}>
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--v2-ink-100)]/70 bg-white/90 px-6 backdrop-blur-md">
          <nav className="flex items-center gap-1.5 text-[13px] text-[var(--v2-ink-500)]">
            <Link href={appPath("/v2/personal/finance")} className="transition hover:text-[var(--v2-ink-800)]">
              Финансы
            </Link>
            <V2Icons.chevR className="h-3.5 w-3.5 text-[var(--v2-ink-300)]" />
            <span className="font-medium text-[var(--v2-ink-900)]">Транзакции</span>
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMasked((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--v2-ink-500)] transition hover:bg-[var(--v2-ink-50)]"
              title={masked ? "Показать суммы" : "Скрыть суммы"}
            >
              {masked ? <TxnEyeIcons.eyeOff /> : <TxnEyeIcons.eye />}
            </button>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--v2-ink-200)] bg-white px-3 text-[12.5px] font-medium text-[var(--v2-ink-700)] transition hover:bg-[var(--v2-ink-50)]"
            >
              <V2Icons.upload className="h-4 w-4" />
              Импорт выписки
            </button>
            <button
              type="button"
              onClick={() => setOperationOpen(true)}
              disabled={accounts.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-3.5 text-[12.5px] font-medium text-white transition hover:bg-[var(--v2-ink-700)] disabled:opacity-40"
            >
              <V2Icons.plus className="h-4 w-4" />
              Операция
            </button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[980px] flex-1 px-6 py-8">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="v2-tighter text-[28px] font-semibold tracking-tight text-[var(--v2-ink-900)]">
                Траты на жизнь
              </h1>
              <p className="mt-1 text-[13.5px] text-[var(--v2-ink-500)]">
                Операции месяца, категории бюджета и массовый импорт PDF/CSV
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-[var(--v2-ink-100)]/60 p-1">
              <button
                type="button"
                onClick={() => shift(-1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--v2-ink-600)] hover:bg-white"
              >
                <V2Icons.chevL className="h-4 w-4" />
              </button>
              <span className="v2-tight min-w-[140px] text-center text-[13.5px] font-semibold text-[var(--v2-ink-900)]">
                {PERSONAL_MONTH_NAMES[month - 1]} {year}
              </span>
              <button
                type="button"
                onClick={() => shift(1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--v2-ink-600)] hover:bg-white"
              >
                <V2Icons.chevR className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <PfCard className="p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
                Расходы
              </div>
              <div className="v2-tighter mt-1.5 text-[24px] font-semibold text-red-500">
                <PersonalAmt v={expenseTotal} />
              </div>
              <div className="mt-1 text-[12px] text-[var(--v2-ink-500)]">
                лимит <PersonalAmt v={budgetLimit} short className="font-medium text-[var(--v2-ink-700)]" />
              </div>
            </PfCard>
            <PfCard className="p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
                Поступления
              </div>
              <div className="v2-tighter mt-1.5 text-[24px] font-semibold text-emerald-600">
                <PersonalAmt v={incomeTotal} />
              </div>
              <div className="mt-1 text-[12px] text-[var(--v2-ink-500)]">{transactions.length} операций</div>
            </PfCard>
            <PfCard className="p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
                Категории
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {budgetCategories.slice(0, 6).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFilterCat(filterCat === c.id ? "all" : c.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition ${
                      filterCat === c.id
                        ? "bg-[var(--v2-ink-900)] text-white"
                        : "bg-[var(--v2-ink-50)] text-[var(--v2-ink-700)] hover:bg-[var(--v2-ink-100)]"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.tint }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </PfCard>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-xl bg-[var(--v2-ink-100)]/70 p-1">
              {(
                [
                  ["all", "Все"],
                  ["expense", "Расход"],
                  ["income", "Доход"],
                  ["transfer", "Перевод"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilterType(k)}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                    filterType === k
                      ? "bg-white text-[var(--v2-ink-900)] shadow-[var(--v2-shadow-card)]"
                      : "text-[var(--v2-ink-500)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по описанию…"
              className="h-9 min-w-[200px] flex-1 rounded-xl border border-[var(--v2-ink-200)] bg-white px-3 text-[13px] outline-none focus:border-[var(--v2-brand-300)] focus:ring-2 focus:ring-[var(--v2-brand-100)]"
            />
          </div>

          {loading ? (
            <PfCard className="p-10 text-center text-sm text-[var(--v2-ink-500)]">Загрузка…</PfCard>
          ) : grouped.length === 0 ? (
            <PfCard className="p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--v2-brand-50)] text-[var(--v2-brand-600)]">
                <V2Icons.inbox className="h-6 w-6" />
              </div>
              <p className="mt-4 text-[15px] font-medium text-[var(--v2-ink-800)]">Пока нет операций</p>
              <p className="mt-1 text-[13px] text-[var(--v2-ink-500)]">
                Добавьте вручную или загрузите PDF-выписку Т-Банка
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportOpen(true)}
                  className="h-9 rounded-xl border border-[var(--v2-ink-200)] px-4 text-[13px] font-medium text-[var(--v2-ink-700)]"
                >
                  Импорт выписки
                </button>
                <button
                  type="button"
                  onClick={() => setOperationOpen(true)}
                  className="h-9 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-medium text-white"
                >
                  Новая операция
                </button>
              </div>
            </PfCard>
          ) : (
            <div className="space-y-5">
              {grouped.map(([day, rows]) => {
                const dayExpense = rows
                  .filter((r) => r.txn_type === "expense")
                  .reduce((s, r) => s + r.amount_rub, 0);
                return (
                  <div key={day}>
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span className="v2-tight text-[12.5px] font-semibold uppercase tracking-[0.06em] text-[var(--v2-ink-500)]">
                        {formatDayLabel(rows[0].txn_date)}
                      </span>
                      {dayExpense > 0 ? (
                        <span className="v2-tnum text-[12px] text-[var(--v2-ink-500)]">
                          −<PersonalAmt v={dayExpense} short />
                        </span>
                      ) : null}
                    </div>
                    <PfCard className="divide-y divide-[var(--v2-ink-100)]/80 overflow-hidden">
                      {rows.map((t) => {
                        const meta = typeMeta(t.txn_type);
                        const sign = t.txn_type === "income" ? "+" : t.txn_type === "expense" ? "−" : "";
                        return (
                          <div
                            key={t.id}
                            className="group flex items-center gap-3 px-4 py-3.5 transition hover:bg-[var(--v2-ink-50)]/60"
                          >
                            <span
                              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                              style={{ background: meta.soft, color: meta.tint }}
                            >
                              {t.txn_type === "income" ? (
                                <V2Icons.plus className="h-4 w-4" />
                              ) : t.txn_type === "transfer" ? (
                                <V2Icons.chevR className="h-4 w-4" />
                              ) : (
                                <V2Icons.ruble className="h-4 w-4" />
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="v2-tight truncate text-[14px] font-medium text-[var(--v2-ink-900)]">
                                {t.description || meta.label}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-[var(--v2-ink-500)]">
                                {t.budget_category_name ? (
                                  <span className="inline-flex items-center gap-1">
                                    <span
                                      className="h-1.5 w-1.5 rounded-full"
                                      style={{ background: t.budget_category_tint ?? "#94A3B8" }}
                                    />
                                    {t.budget_category_name}
                                  </span>
                                ) : (
                                  <span>{meta.label}</span>
                                )}
                                {t.from_account_name || t.to_account_name ? (
                                  <span>
                                    ·{" "}
                                    {t.txn_type === "transfer"
                                      ? `${t.from_account_name ?? "?"} → ${t.to_account_name ?? "?"}`
                                      : t.txn_type === "income"
                                        ? t.to_account_name
                                        : t.from_account_name}
                                  </span>
                                ) : null}
                                {t.import_batch_id ? <span>· импорт</span> : null}
                              </div>
                            </div>
                            <div
                              className={`v2-tnum shrink-0 text-[15px] font-semibold ${
                                t.txn_type === "income"
                                  ? "text-emerald-600"
                                  : t.txn_type === "expense"
                                    ? "text-[var(--v2-ink-900)]"
                                    : "text-[var(--v2-ink-700)]"
                              }`}
                            >
                              {sign}
                              <PersonalAmt v={t.amount_rub} />
                            </div>
                            <button
                              type="button"
                              onClick={() => void deleteTxn(t.id)}
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--v2-ink-300)] opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                              title="Удалить"
                            >
                              <V2Icons.trash className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </PfCard>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <PersonalOperationModal
          open={operationOpen}
          onClose={() => setOperationOpen(false)}
          year={year}
          month={month}
          accounts={accounts}
          budgetCategories={budgetCategories}
          onDone={() => void load(year, month)}
        />

        <StatementImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          accounts={accounts}
          budgetCategories={budgetCategories}
          onDone={() => void load(year, month)}
        />
      </div>
    </PersonalMaskProvider>
  );
}

const TxnEyeIcons = {
  eye: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  eyeOff: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3l18 18M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2M9.9 5.2A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.1 4.1M6.1 6.1A17.4 17.4 0 0 0 2 12s3.5 7 10 7a10.4 10.4 0 0 0 4.2-.9" />
    </svg>
  ),
};

function StatementImportModal({
  open,
  onClose,
  accounts,
  budgetCategories,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  accounts: PersonalAccountRow[];
  budgetCategories: PersonalBudgetCategoryRow[];
  onDone: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ImportPreviewItem[]>([]);
  const [accountId, setAccountId] = useState("");
  const [applyBalances, setApplyBalances] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ bank?: string; warnings?: string[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!open) return;
    setItems([]);
    setError(null);
    setMeta(null);
    setApplyBalances(false);
    setAccountId(accounts.find((a) => a.account_type === "card")?.id ?? accounts[0]?.id ?? "");
  }, [open, accounts]);

  if (!open) return null;

  const parseFile = async (file: File) => {
    setParsing(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(apiUrl("/api/v2/personal/finance/transactions/import/parse"), {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setItems(data.items as ImportPreviewItem[]);
      setMeta({ bank: data.bank, warnings: data.warnings });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка разбора");
      setItems([]);
    } finally {
      setParsing(false);
    }
  };

  const commit = async () => {
    if (!accountId) {
      setError("Выберите счёт");
      return;
    }
    const selected = items.filter((i) => i.selected);
    if (selected.length === 0) {
      setError("Отметьте хотя бы одну операцию");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await fetchJson<{ created: number; skipped: number }>(
        "/api/v2/personal/finance/transactions/import/commit",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from_account_id: accountId,
            to_account_id: accountId,
            apply_balances: applyBalances,
            items: selected,
          }),
        }
      );
      onDone();
      onClose();
      alert(`Импортировано: ${result.created}, пропущено (дубли): ${result.skipped}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось импортировать");
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = items.filter((i) => i.selected).length;
  const selectedExpense = items
    .filter((i) => i.selected && i.txn_type === "expense")
    .reduce((s, i) => s + i.amount_rub, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--v2-shadow-pop)]">
        <div className="border-b border-[var(--v2-ink-100)] px-6 py-4">
          <h2 className="v2-tight text-lg font-semibold text-[var(--v2-ink-900)]">Импорт выписки</h2>
          <p className="mt-1 text-[12.5px] text-[var(--v2-ink-500)]">
            PDF Т-Банка («Движение средств за период») или CSV. Дубликаты пропускаются автоматически.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void parseFile(f);
              }}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 transition ${
                dragOver
                  ? "border-[var(--v2-brand-400)] bg-[var(--v2-brand-50)]"
                  : "border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)]/50"
              }`}
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[var(--v2-brand-600)] shadow-[var(--v2-shadow-card)]">
                <V2Icons.upload className="h-5 w-5" />
              </span>
              <p className="mt-4 text-[14px] font-medium text-[var(--v2-ink-800)]">
                {parsing ? "Разбираем выписку…" : "Перетащите PDF или CSV сюда"}
              </p>
              <p className="mt-1 text-[12.5px] text-[var(--v2-ink-500)]">или выберите файл с компьютера</p>
              <button
                type="button"
                disabled={parsing}
                onClick={() => fileRef.current?.click()}
                className="mt-5 h-9 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-medium text-white disabled:opacity-50"
              >
                Выбрать файл
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.csv,.txt,application/pdf,text/csv,text/plain"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void parseFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-[12px] font-medium text-[var(--v2-ink-600)]">
                  Счёт
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-[var(--v2-ink-200)] px-3 text-[13px]"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-col justify-end">
                  <label className="flex items-start gap-2 text-[12.5px] text-[var(--v2-ink-600)]">
                    <input
                      type="checkbox"
                      checked={applyBalances}
                      onChange={(e) => setApplyBalances(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      Менять баланс счёта
                      <span className="mt-0.5 block text-[11.5px] text-[var(--v2-ink-400)]">
                        Выкл., если баланс уже актуален — учтём только траты по категориям
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="mb-3 flex items-center justify-between text-[12.5px] text-[var(--v2-ink-500)]">
                <span>
                  Выбрано {selectedCount} из {items.length}
                  {meta?.bank ? ` · ${meta.bank === "tbank" ? "Т-Банк" : "выписка"}` : ""}
                </span>
                <span className="v2-tnum font-medium text-[var(--v2-ink-800)]">
                  расходы <PersonalAmt v={selectedExpense} short />
                </span>
              </div>

              <div className="max-h-[42vh] overflow-y-auto rounded-xl border border-[var(--v2-ink-100)]">
                <table className="w-full text-left text-[12.5px]">
                  <thead className="sticky top-0 bg-[var(--v2-ink-50)] text-[11px] uppercase tracking-wide text-[var(--v2-ink-500)]">
                    <tr>
                      <th className="w-10 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={items.every((i) => i.selected)}
                          onChange={(e) =>
                            setItems((prev) => prev.map((i) => ({ ...i, selected: e.target.checked })))
                          }
                        />
                      </th>
                      <th className="px-2 py-2">Дата</th>
                      <th className="px-2 py-2">Описание</th>
                      <th className="px-2 py-2">Категория</th>
                      <th className="px-2 py-2 text-right">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.external_id} className="border-t border-[var(--v2-ink-100)]/80">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, selected: e.target.checked } : p))
                              )
                            }
                          />
                        </td>
                        <td className="v2-tnum whitespace-nowrap px-2 py-2 text-[var(--v2-ink-600)]">
                          {item.date.slice(8, 10)}.{item.date.slice(5, 7)}
                        </td>
                        <td className="max-w-[220px] truncate px-2 py-2 text-[var(--v2-ink-800)]">
                          {item.description}
                        </td>
                        <td className="px-2 py-2">
                          {item.txn_type === "expense" ? (
                            <select
                              value={item.budget_category_id ?? ""}
                              onChange={(e) => {
                                const id = e.target.value || null;
                                const name = budgetCategories.find((c) => c.id === id)?.name ?? null;
                                setItems((prev) =>
                                  prev.map((p, i) =>
                                    i === idx
                                      ? { ...p, budget_category_id: id, budget_category_name: name }
                                      : p
                                  )
                                );
                              }}
                              className="h-8 max-w-[130px] rounded-lg border border-[var(--v2-ink-200)] px-1.5 text-[12px]"
                            >
                              <option value="">—</option>
                              {budgetCategories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-emerald-600">доход</span>
                          )}
                        </td>
                        <td
                          className={`v2-tnum whitespace-nowrap px-2 py-2 text-right font-medium ${
                            item.txn_type === "income" ? "text-emerald-600" : "text-[var(--v2-ink-900)]"
                          }`}
                        >
                          {item.txn_type === "income" ? "+" : "−"}
                          <PersonalAmt v={item.amount_rub} short />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {meta?.warnings && meta.warnings.length > 0 ? (
                <p className="mt-2 text-[11.5px] text-amber-700">{meta.warnings[0]}</p>
              ) : null}

              <button
                type="button"
                className="mt-3 text-[12.5px] text-[var(--v2-brand-600)] hover:underline"
                onClick={() => {
                  setItems([]);
                  setMeta(null);
                }}
              >
                Загрузить другой файл
              </button>
            </>
          )}

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--v2-ink-100)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl px-4 text-sm text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-100)]"
          >
            Отмена
          </button>
          {items.length > 0 ? (
            <button
              type="button"
              disabled={saving || selectedCount === 0}
              onClick={() => void commit()}
              className="h-9 rounded-xl bg-[var(--v2-brand-600)] px-4 text-sm font-medium text-white hover:bg-[var(--v2-brand-700)] disabled:opacity-50"
            >
              {saving ? "Импорт…" : `Импортировать ${selectedCount}`}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
