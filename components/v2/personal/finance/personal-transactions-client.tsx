"use client";

import "./transactions-design.css";
import { PersonalAmt, PersonalMaskProvider } from "./personal-finance-mask";
import { PersonalOperationModal } from "./personal-operation-modal";
import { PersonalTransactionAmountInline } from "./personal-money-inline";
import { PersonalTransactionCategoryInline } from "./personal-transaction-category-inline";
import {
  CategoryBreakdown,
  dayShortLabel,
  monthLabel,
  TransactionsHero,
  TransactionsTrendChart,
  txnTimeLabel,
  type TxCatRow,
} from "./personal-transactions-v3-ui";
import { fetchJson, IMPORT_FETCH_TIMEOUT_MS } from "@/lib/v2/client/fetch-json";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { apiUrl } from "@/lib/api-url";
import { formatPersonalRub } from "@/lib/v2/personal/formatters";
import type {
  PersonalAccountRow,
  PersonalBudgetCategoryRow,
  PersonalFinanceDashboard,
  PersonalMonthSnapshotRow,
  PersonalTransactionRow,
  PersonalTxnType,
} from "@/lib/v2/personal/types";
import { V2Icons } from "@/components/v2/ui/icons";
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

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function incomeLabel(t: PersonalTransactionRow) {
  return t.description?.trim() || "Поступление";
}

function typeMeta(t: PersonalTxnType) {
  if (t === "income") return { label: "Доход", tint: "#10B981" };
  if (t === "transfer") return { label: "Перевод", tint: "#6366F1" };
  return { label: "Расход", tint: "#EF4444" };
}

function buildExpenseRows(transactions: PersonalTransactionRow[], budgetCategories: PersonalBudgetCategoryRow[]): TxCatRow[] {
  const byId = new Map<string, number>();
  for (const t of transactions.filter((x) => x.txn_type === "expense")) {
    const id = t.budget_category_id ?? "__none__";
    byId.set(id, (byId.get(id) ?? 0) + t.amount_rub);
  }
  const total = [...byId.values()].reduce((s, v) => s + v, 0) || 1;
  const catMeta = new Map(budgetCategories.map((c) => [c.id, c]));
  return [...byId.entries()]
    .map(([id, amount]) => {
      const cat = catMeta.get(id);
      return {
        id,
        name: id === "__none__" ? "Без категории" : (cat?.name ?? "Категория"),
        tint: cat?.tint ?? "#94A3B8",
        amount,
        pct: Math.round((amount / total) * 100),
        avg: amount,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

function buildIncomeRows(transactions: PersonalTransactionRow[]): TxCatRow[] {
  const byLabel = new Map<string, number>();
  for (const t of transactions.filter((x) => x.txn_type === "income")) {
    const label = incomeLabel(t);
    byLabel.set(label, (byLabel.get(label) ?? 0) + t.amount_rub);
  }
  const total = [...byLabel.values()].reduce((s, v) => s + v, 0) || 1;
  const palette = ["#2A56EB", "#0E7490", "#7C3AED", "#6366F1", "#C2410C", "#10B981"];
  return [...byLabel.entries()]
    .map(([label, amount], idx) => ({
      id: `income:${label}`,
      name: label,
      tint: palette[idx % palette.length]!,
      amount,
      pct: Math.round((amount / total) * 100),
      avg: amount,
    }))
    .sort((a, b) => b.amount - a.amount);
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
  const [monthHistory, setMonthHistory] = useState<PersonalMonthSnapshotRow[]>([]);
  const [filterType, setFilterType] = useState<PersonalTxnType | "all">("all");
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"date" | "sum" | "cat">("date");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [operationOpen, setOperationOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [qaAmount, setQaAmount] = useState("");
  const [qaCategoryId, setQaCategoryId] = useState("");
  const [qaDate, setQaDate] = useState("");
  const [qaSaving, setQaSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year: String(y), month: String(m) });
      if (qDebounced.trim()) params.set("q", qDebounced.trim());

      const [dash, list] = await Promise.all([
        fetchJson<PersonalFinanceDashboard>(`/api/v2/personal/finance/dashboard?year=${y}&month=${m}`),
        fetchJson<{ transactions: PersonalTransactionRow[] }>(
          `/api/v2/personal/finance/transactions?${params.toString()}`
        ),
      ]);
      setAccounts(dash.accounts);
      setBudgetCategories(dash.budgetCategories);
      setMonthHistory(dash.history);
      setTransactions(list.transactions);
      setYear(dash.year);
      setMonth(dash.month);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [qDebounced]);

  useEffect(() => {
    void load(year, month);
  }, [year, month, load]);

  const deleteTxn = async (id: string) => {
    if (!confirm("Удалить операцию?")) return;
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

  const expenseRows = useMemo(
    () => buildExpenseRows(transactions, budgetCategories),
    [transactions, budgetCategories]
  );
  const incomeRows = useMemo(() => buildIncomeRows(transactions), [transactions]);

  const displayed = useMemo(() => {
    let rows = [...transactions];
    if (filterType !== "all") rows = rows.filter((t) => t.txn_type === filterType);
    if (filterCat) {
      if (filterCat.startsWith("income:")) {
        const label = filterCat.slice(7);
        rows = rows.filter((t) => t.txn_type === "income" && incomeLabel(t) === label);
      } else if (filterCat === "__none__") {
        rows = rows.filter((t) => t.txn_type === "expense" && !t.budget_category_id);
      } else {
        rows = rows.filter((t) => t.budget_category_id === filterCat);
      }
    }
    const needle = qDebounced.trim().toLowerCase();
    if (needle) {
      rows = rows.filter(
        (t) =>
          (t.description ?? "").toLowerCase().includes(needle) ||
          (t.budget_category_name ?? "").toLowerCase().includes(needle)
      );
    }
    if (sortOrder === "sum") rows.sort((a, b) => b.amount_rub - a.amount_rub);
    else if (sortOrder === "cat") {
      rows.sort(
        (a, b) =>
          (a.budget_category_name ?? incomeLabel(a)).localeCompare(b.budget_category_name ?? incomeLabel(b)) ||
          b.txn_date.localeCompare(a.txn_date)
      );
    } else {
      rows.sort((a, b) => b.txn_date.localeCompare(a.txn_date));
    }
    return rows;
  }, [transactions, filterType, filterCat, qDebounced, sortOrder]);

  const chipRows = useMemo(() => {
    const map = new Map<string, { id: string; name: string; tint: string; count: number }>();
    for (const t of transactions) {
      if (filterType === "expense" && t.txn_type !== "expense") continue;
      if (filterType === "income" && t.txn_type !== "income") continue;
      if (filterType === "transfer" && t.txn_type !== "transfer") continue;
      let id: string;
      let name: string;
      let tint: string;
      if (t.txn_type === "income") {
        id = `income:${incomeLabel(t)}`;
        name = incomeLabel(t);
        tint = "#2A56EB";
      } else if (t.txn_type === "expense") {
        id = t.budget_category_id ?? "__none__";
        name = t.budget_category_name ?? "Без категории";
        tint = t.budget_category_tint ?? "#94A3B8";
      } else continue;
      const prev = map.get(id);
      map.set(id, { id, name, tint, count: (prev?.count ?? 0) + 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [transactions, filterType]);

  const grouped = useMemo(() => {
    if (sortOrder !== "date") return [["all", displayed] as const];
    const map = new Map<string, PersonalTransactionRow[]>();
    for (const t of displayed) {
      const k = dayKey(t.txn_date);
      const arr = map.get(k) ?? [];
      arr.push(t);
      map.set(k, arr);
    }
    return [...map.entries()];
  }, [displayed, sortOrder]);

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

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
    setFilterCat(null);
    setYear(y);
    setMonth(m);
  };

  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    setQaDate(`${year}-${pad(month)}-${pad(Math.min(today.getDate(), 28))}`);
    setQaCategoryId(budgetCategories[0]?.id ?? "");
  }, [year, month, budgetCategories, today]);

  const quickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(qaAmount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Укажите сумму");
      return;
    }
    setQaSaving(true);
    setError(null);
    try {
      let y = year;
      let m = month;
      if (qaDate && /^\d{4}-\d{2}-\d{2}$/.test(qaDate)) {
        y = Number(qaDate.slice(0, 4));
        m = Number(qaDate.slice(5, 7));
      }
      await fetchJson("/api/v2/personal/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txn_type: "expense",
          amount_rub: n,
          description: null,
          from_account_id: null,
          to_account_id: null,
          budget_category_id: qaCategoryId || null,
          year: y,
          month: m,
          txn_date: qaDate || null,
        }),
      });
      setQaAmount("");
      await load(year, month);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось добавить");
    } finally {
      setQaSaving(false);
    }
  };

  const exportCsv = () => {
    const head = ["Дата", "Тип", "Описание", "Категория", "Сумма"];
    const rows = displayed.map((t) => [
      t.txn_date.slice(0, 10),
      t.txn_type === "income" ? "Приход" : t.txn_type === "expense" ? "Расход" : "Перевод",
      t.description ?? "",
      t.budget_category_name ?? incomeLabel(t),
      t.txn_type === "expense" ? -t.amount_rub : t.amount_rub,
    ]);
    const csv =
      "\ufeff" +
      [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `transactions-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
  };

  const heroActions = (
    <>
      <button
        type="button"
        onClick={() => setMasked((v) => !v)}
        className="iconbtn tip"
        data-tip={masked ? "Показать суммы" : "Скрыть суммы"}
        title={masked ? "Показать суммы" : "Скрыть суммы"}
      >
        {masked ? "◌" : "◉"}
      </button>
      <button type="button" className="btn btn--gh" onClick={() => setImportOpen(true)}>
        Импорт
      </button>
      <button type="button" className="btn btn--pri" onClick={() => setOperationOpen(true)}>
        Операция
      </button>
    </>
  );

  return (
    <PersonalMaskProvider masked={masked}>
      <div className="transactions-v3 min-h-0 flex-1 overflow-y-auto">
        <div className="page">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
          ) : null}

          <TransactionsHero
            year={year}
            month={month}
            incomeTotal={incomeTotal}
            expenseTotal={expenseTotal}
            isCurrentMonth={isCurrentMonth}
            onPrev={() => shift(-1)}
            onNext={() => shift(1)}
            actions={heroActions}
          />

          <div className="charts">
            <CategoryBreakdown
              title="Куда ушли деньги"
              subtitle={
                expenseTotal
                  ? `${formatPersonalRub(expenseTotal)} за ${monthLabel(year, month).toLowerCase()}`
                  : monthLabel(year, month).toLowerCase()
              }
              rows={expenseRows}
              activeId={filterCat && !filterCat.startsWith("income:") ? filterCat : null}
              onSelect={(id) => {
                setFilterCat(id);
                if (id) setFilterType("expense");
              }}
            />
            <CategoryBreakdown
              title="Откуда пришли деньги"
              subtitle={
                incomeTotal
                  ? `${formatPersonalRub(incomeTotal)} за ${monthLabel(year, month).toLowerCase()}`
                  : monthLabel(year, month).toLowerCase()
              }
              rows={incomeRows}
              activeId={filterCat?.startsWith("income:") ? filterCat : null}
              positive
              onSelect={(id) => {
                setFilterCat(id);
                if (id) setFilterType("income");
              }}
              footer={
                incomeRows.length > 0 ? (
                  <div className="avg-row">
                    <div className="avg">
                      <b className="tnum">
                        {formatPersonalRub(Math.round(incomeTotal / Math.max(incomeRows.length, 1)))}
                      </b>
                      <span>средняя оплата</span>
                    </div>
                    <div className="avg">
                      <b className="tnum">{transactions.filter((t) => t.txn_type === "income").length}</b>
                      <span>оплат за месяц</span>
                    </div>
                  </div>
                ) : null
              }
            />
          </div>

          <TransactionsTrendChart
            data={monthHistory}
            currentYear={year}
            currentMonth={month}
            onPickMonth={(y, m) => {
              setFilterCat(null);
              setYear(y);
              setMonth(m);
            }}
          />

          <section className="card pad">
            <div className="bar-row">
              <div className="seg">
                {(
                  [
                    ["all", "Все"],
                    ["income", "Приход"],
                    ["expense", "Расход"],
                    ["transfer", "Перевод"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    className={filterType === k ? "on" : ""}
                    onClick={() => {
                      setFilterType(k);
                      setFilterCat(null);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="sec-sub">
                {displayed.length
                  ? `${displayed.length} из ${transactions.length} операций месяца`
                  : ""}
              </span>
              <div className="ml-auto flex gap-2" style={{ marginLeft: "auto" }}>
                <button type="button" className="btn btn--gh" onClick={() => setImportOpen(true)}>
                  Импорт выписки
                </button>
                <button type="button" className="btn btn--gh" onClick={exportCsv}>
                  Экспорт CSV
                </button>
              </div>
            </div>

            <div className="bar-row">
              <button
                type="button"
                className={`chip${filterCat ? "" : " on"}`}
                onClick={() => setFilterCat(null)}
              >
                Все категории
              </button>
              {chipRows.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`chip${filterCat === c.id ? " on" : ""}`}
                  onClick={() => setFilterCat(filterCat === c.id ? null : c.id)}
                >
                  <span className="dot" style={{ background: c.tint }} />
                  {c.name}
                  <i>{c.count}</i>
                </button>
              ))}
            </div>

            <div className="bar-row" style={{ marginBottom: 14 }}>
              <input
                type="text"
                className="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск по названию, категории"
              />
              <select
                className="sortsel"
                style={{ marginLeft: "auto" }}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "date" | "sum" | "cat")}
              >
                <option value="date">Сначала новые</option>
                <option value="sum">По сумме</option>
                <option value="cat">По категориям</option>
              </select>
            </div>

            <div className="addbox">
              <form className="qa" onSubmit={(e) => void quickAdd(e)}>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={qaAmount}
                  onChange={(e) => setQaAmount(e.target.value)}
                  placeholder="Сумма ₽"
                  aria-label="Сумма"
                />
                <select
                  value={qaCategoryId}
                  onChange={(e) => setQaCategoryId(e.target.value)}
                  aria-label="Категория"
                >
                  <option value="">Без категории</option>
                  {budgetCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input type="date" value={qaDate} onChange={(e) => setQaDate(e.target.value)} aria-label="Дата" />
                <button type="submit" disabled={qaSaving}>
                  {qaSaving ? "…" : "Добавить"}
                </button>
              </form>
              <p className="hint">Быстрый расход — или кнопка «Операция» для дохода и подробностей.</p>
            </div>

            {loading ? (
              <div className="empty">Загрузка…</div>
            ) : displayed.length === 0 ? (
              <div className="empty">Ничего не нашлось. Сбросьте фильтры или добавьте операцию.</div>
            ) : (
              <div className="tlist">
                {grouped.map(([day, rows]) => (
                  <div key={day}>
                    {sortOrder === "date" && day !== "all" ? (
                      <div className="daysep">
                        <b>{dayShortLabel(rows[0]!.txn_date)}</b>
                        <hr />
                        <span className="tnum">
                          {formatPersonalRub(
                            rows.reduce(
                              (s, t) => s + (t.txn_type === "expense" ? -t.amount_rub : t.amount_rub),
                              0
                            )
                          )}{" "}
                          за день
                        </span>
                      </div>
                    ) : null}
                    {rows.map((t) => {
                      const meta = typeMeta(t.txn_type);
                      const amountClass =
                        t.txn_type === "income" ? "pos" : t.txn_type === "expense" ? "" : "";
                      return (
                        <div key={t.id} className="tx">
                          <span className="tx-ic" style={{ color: meta.tint }}>
                            {t.txn_type === "income" ? "↓" : "↑"}
                          </span>
                          <div className="tx-mid">
                            <div className="tx-t">{t.description || meta.label}</div>
                            <div className="tx-meta">
                              {t.txn_type === "expense" ? (
                                <PersonalTransactionCategoryInline
                                    transactionId={t.id}
                                    categoryId={t.budget_category_id}
                                    categoryName={t.budget_category_name ?? null}
                                    categoryTint={t.budget_category_tint ?? null}
                                    year={t.year}
                                    month={t.month}
                                    categories={budgetCategories.filter(
                                      (c) => c.year === t.year && c.month === t.month
                                    )}
                                    onSaved={(txn) => {
                                      setTransactions((prev) =>
                                        prev.map((row) => (row.id === txn.id ? txn : row))
                                      );
                                    }}
                                    onCategoryCreated={(category) => {
                                      setBudgetCategories((prev) => [
                                        ...prev.filter((c) => c.id !== category.id),
                                        category,
                                      ]);
                                    }}
                                    onError={(msg) => setError(msg)}
                                  />
                              ) : (
                                <span className="tag tag--cat">
                                  <span className="dot" style={{ background: meta.tint }} />
                                  {meta.label}
                                </span>
                              )}
                              {t.import_batch_id ? <span className="tag tag--sub">импорт</span> : null}
                              {t.from_account_name || t.to_account_name ? (
                                <span className="tag tag--sub">
                                  {t.txn_type === "transfer"
                                    ? `${t.from_account_name ?? "?"} → ${t.to_account_name ?? "?"}`
                                    : t.txn_type === "income"
                                      ? t.to_account_name
                                      : t.from_account_name}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="tx-r">
                            <div className={`tx-sum tnum ${amountClass}`}>
                              <PersonalTransactionAmountInline
                                transactionId={t.id}
                                value={t.amount_rub}
                                txnType={t.txn_type}
                                className={amountClass === "pos" ? "text-emerald-600" : ""}
                                onSaved={(txn) => {
                                  setTransactions((prev) =>
                                    prev.map((row) => (row.id === txn.id ? txn : row))
                                  );
                                }}
                                onError={(msg) => setError(msg)}
                              />
                            </div>
                            <div className="tx-date tnum">
                              {dayShortLabel(t.txn_date).split(" ")[0]} · {txnTimeLabel(t.txn_date)}
                            </div>
                          </div>
                          <div className="tx-act">
                            <button
                              type="button"
                              className="iconbtn tip"
                              data-tip="Удалить"
                              title="Удалить"
                              onClick={() => void deleteTxn(t.id)}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <PersonalOperationModal
          open={operationOpen}
          onClose={() => setOperationOpen(false)}
          year={year}
          month={month}
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
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ bank?: string; warnings?: string[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [categoriesByMonth, setCategoriesByMonth] = useState<Record<string, PersonalBudgetCategoryRow[]>>({});
  const [creatingForIdx, setCreatingForIdx] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    if (!open) return;
    setItems([]);
    setError(null);
    setMeta(null);
    setCategoriesByMonth({});
    setCreatingForIdx(null);
    setNewCategoryName("");
    setAccountId(accounts.find((a) => a.account_type === "card")?.id ?? accounts[0]?.id ?? "");
  }, [open, accounts]);

  if (!open) return null;

  const categoriesForItem = (item: ImportPreviewItem) =>
    categoriesByMonth[`${item.year}-${item.month}`] ??
    budgetCategories.filter((c) => c.year === item.year && c.month === item.month);

  const submitNewCategory = async (idx: number) => {
    const item = items[idx];
    if (!item) return;
    const name = newCategoryName.trim();
    if (!name) return;
    setCreatingCategory(true);
    setError(null);
    try {
      const { category } = await fetchJson<{ category: PersonalBudgetCategoryRow }>(
        "/api/v2/personal/finance/budget/categories",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year: item.year, month: item.month, name }),
        }
      );
      const key = `${item.year}-${item.month}`;
      setCategoriesByMonth((prev) => ({
        ...prev,
        [key]: [...(prev[key] ?? []).filter((c) => c.id !== category.id), category],
      }));
      setItems((prev) =>
        prev.map((p, i) =>
          i === idx ? { ...p, budget_category_id: category.id, budget_category_name: category.name } : p
        )
      );
      setCreatingForIdx(null);
      setNewCategoryName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать категорию");
    } finally {
      setCreatingCategory(false);
    }
  };

  const parseFile = async (file: File) => {
    setParsing(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetchWithTimeout(
        apiUrl("/api/v2/personal/finance/transactions/import/parse"),
        { method: "POST", body: fd, credentials: "include" },
        IMPORT_FETCH_TIMEOUT_MS
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const parsedItems = data.items as ImportPreviewItem[];
      setItems(parsedItems);
      setMeta({ bank: data.bank, warnings: data.warnings });
      setCategoriesByMonth((data.categoriesByMonth as Record<string, PersonalBudgetCategoryRow[]>) ?? {});
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
            items: selected,
          }),
        },
        IMPORT_FETCH_TIMEOUT_MS
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
            PDF Т-Банка («Движение средств за период») или CSV из раздела «Операции». Дубликаты пропускаются автоматически. Новые категории — кнопкой + у операции.
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
              <div className="mb-4">
                <label className="block text-[12px] font-medium text-[var(--v2-ink-600)]">
                  Счёт (для привязки операций)
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="mt-1 h-10 w-full max-w-sm rounded-xl border border-[var(--v2-ink-200)] px-3 text-[13px]"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
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
                            creatingForIdx === idx ? (
                              <div className="flex min-w-[148px] flex-col gap-1">
                                <input
                                  autoFocus
                                  value={newCategoryName}
                                  onChange={(e) => setNewCategoryName(e.target.value)}
                                  placeholder="Название категории"
                                  disabled={creatingCategory}
                                  className="h-8 w-full rounded-lg border border-[var(--v2-brand-300)] px-2 text-[12px] outline-none ring-[var(--v2-brand-500)] focus:ring-2"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      void submitNewCategory(idx);
                                    }
                                    if (e.key === "Escape") {
                                      setCreatingForIdx(null);
                                      setNewCategoryName("");
                                    }
                                  }}
                                />
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    disabled={creatingCategory || !newCategoryName.trim()}
                                    onClick={() => void submitNewCategory(idx)}
                                    className="h-7 flex-1 rounded-md bg-[var(--v2-brand-600)] px-2 text-[11px] font-medium text-white disabled:opacity-45"
                                  >
                                    {creatingCategory ? "…" : "Создать"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={creatingCategory}
                                    onClick={() => {
                                      setCreatingForIdx(null);
                                      setNewCategoryName("");
                                    }}
                                    className="h-7 rounded-md px-2 text-[11px] text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-100)]"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <select
                                  value={item.budget_category_id ?? ""}
                                  onChange={(e) => {
                                    const id = e.target.value || null;
                                    const name =
                                      categoriesForItem(item).find((c) => c.id === id)?.name ?? null;
                                    setItems((prev) =>
                                      prev.map((p, i) =>
                                        i === idx
                                          ? { ...p, budget_category_id: id, budget_category_name: name }
                                          : p
                                      )
                                    );
                                  }}
                                  className="h-8 min-w-0 max-w-[118px] flex-1 rounded-lg border border-[var(--v2-ink-200)] px-1.5 text-[12px]"
                                >
                                  <option value="">—</option>
                                  {categoriesForItem(item).map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  title="Новая категория"
                                  aria-label="Создать категорию"
                                  onClick={() => {
                                    setCreatingForIdx(idx);
                                    setNewCategoryName(item.budget_category_name ?? "");
                                  }}
                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--v2-ink-200)] text-[var(--v2-brand-700)] transition hover:border-[var(--v2-brand-300)] hover:bg-[var(--v2-brand-50)]"
                                >
                                  <V2Icons.plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )
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
