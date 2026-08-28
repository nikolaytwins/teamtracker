"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { PersonalBudgetCategoryRow, PersonalTxnType } from "@/lib/v2/personal/types";
import { useEffect, useState } from "react";

export function PersonalOperationModal({
  open,
  onClose,
  year,
  month,
  budgetCategories,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  year: number;
  month: number;
  budgetCategories: PersonalBudgetCategoryRow[];
  onDone: () => void;
}) {
  const [txnType, setTxnType] = useState<PersonalTxnType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [txnDate, setTxnDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTxnType("expense");
    setAmount("");
    setDescription("");
    setError(null);
    const pad = (n: number) => String(n).padStart(2, "0");
    const today = new Date();
    const inMonth =
      today.getFullYear() === year && today.getMonth() + 1 === month
        ? today
        : new Date(year, month - 1, Math.min(today.getDate(), 28));
    setTxnDate(`${inMonth.getFullYear()}-${pad(inMonth.getMonth() + 1)}-${pad(inMonth.getDate())}`);
    setCategoryId(budgetCategories[0]?.id ?? "");
  }, [open, budgetCategories, year, month]);

  if (!open) return null;

  const submit = async () => {
    const n = parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Укажите сумму");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let y = year;
      let m = month;
      if (txnDate && /^\d{4}-\d{2}-\d{2}$/.test(txnDate)) {
        y = Number(txnDate.slice(0, 4));
        m = Number(txnDate.slice(5, 7));
      }
      await fetchJson("/api/v2/personal/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txn_type: txnType,
          amount_rub: n,
          description: description.trim() || null,
          from_account_id: null,
          to_account_id: null,
          budget_category_id: txnType === "expense" ? categoryId || null : null,
          year: y,
          month: m,
          txn_date: txnDate || null,
        }),
      });
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-pop)]">
        <h2 className="v2-tight text-lg font-semibold text-[var(--v2-ink-900)]">Новая операция</h2>
        <div className="mt-4 flex gap-1 rounded-xl bg-[var(--v2-ink-100)]/70 p-1">
          {(
            [
              ["expense", "Расход"],
              ["income", "Доход"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTxnType(k)}
              className={`flex-1 rounded-lg py-2 text-[12.5px] font-medium transition ${
                txnType === k
                  ? "bg-white text-[var(--v2-ink-900)] shadow-[var(--v2-shadow-card)]"
                  : "text-[var(--v2-ink-500)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-xs text-[var(--v2-ink-500)]">
          Сумма, ₽
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="v2-tnum mt-1 h-10 w-full rounded-xl border border-[var(--v2-ink-200)] px-3 text-sm"
          />
        </label>
        <label className="mt-3 block text-xs text-[var(--v2-ink-500)]">
          Дата
          <input
            type="date"
            value={txnDate}
            onChange={(e) => setTxnDate(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-[var(--v2-ink-200)] px-3 text-sm"
          />
        </label>
        {txnType === "expense" ? (
          <label className="mt-3 block text-xs text-[var(--v2-ink-500)]">
            Категория бюджета
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-[var(--v2-ink-200)] px-3 text-sm"
            >
              <option value="">Без категории</option>
              {budgetCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="mt-3 block text-xs text-[var(--v2-ink-500)]">
          Описание
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-[var(--v2-ink-200)] px-3 text-sm"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl px-4 text-sm text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-100)]"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="h-9 rounded-xl bg-[var(--v2-ink-900)] px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
