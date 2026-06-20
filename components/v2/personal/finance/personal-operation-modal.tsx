"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import type {
  PersonalAccountRow,
  PersonalBudgetCategoryRow,
  PersonalTxnType,
} from "@/lib/v2/personal/types";
import { useEffect, useState } from "react";

export function PersonalOperationModal({
  open,
  onClose,
  year,
  month,
  accounts,
  budgetCategories,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  year: number;
  month: number;
  accounts: PersonalAccountRow[];
  budgetCategories: PersonalBudgetCategoryRow[];
  onDone: () => void;
}) {
  const [txnType, setTxnType] = useState<PersonalTxnType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTxnType("expense");
    setAmount("");
    setDescription("");
    setError(null);
    setFromId(accounts[0]?.id ?? "");
    setToId(accounts[1]?.id ?? accounts[0]?.id ?? "");
    setCategoryId(budgetCategories[0]?.id ?? "");
  }, [open, accounts, budgetCategories]);

  if (!open) return null;

  const submit = async () => {
    const n = parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Укажите сумму");
      return;
    }
    if (accounts.length === 0) {
      setError("Сначала добавьте счёт");
      return;
    }
    if (txnType === "expense" && !fromId) {
      setError("Выберите счёт списания");
      return;
    }
    if (txnType === "income" && !toId) {
      setError("Выберите счёт зачисления");
      return;
    }
    if (txnType === "transfer") {
      if (!fromId || !toId) {
        setError("Выберите оба счёта");
        return;
      }
      if (fromId === toId) {
        setError("Счета должны отличаться");
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      await fetchJson("/api/v2/personal/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txn_type: txnType,
          amount_rub: n,
          description: description.trim() || null,
          from_account_id: txnType !== "income" ? fromId || null : null,
          to_account_id: txnType !== "expense" ? toId || null : null,
          budget_category_id: txnType === "expense" ? categoryId || null : null,
          year,
          month,
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
        {accounts.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--v2-ink-600)]">
            Добавьте хотя бы один счёт в разделе «Счета и активы».
          </p>
        ) : (
          <>
            <div className="mt-4 flex gap-1 rounded-xl bg-[var(--v2-ink-100)]/70 p-1">
              {(
                [
                  ["expense", "Расход"],
                  ["income", "Доход"],
                  ["transfer", "Перевод"],
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
            {txnType !== "income" ? (
              <label className="mt-3 block text-xs text-[var(--v2-ink-500)]">
                Со счёта
                <select
                  value={fromId}
                  onChange={(e) => setFromId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-[var(--v2-ink-200)] px-3 text-sm"
                >
                  <option value="">—</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {txnType !== "expense" ? (
              <label className="mt-3 block text-xs text-[var(--v2-ink-500)]">
                На счёт
                <select
                  value={toId}
                  onChange={(e) => setToId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-[var(--v2-ink-200)] px-3 text-sm"
                >
                  <option value="">—</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
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
          </>
        )}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl px-4 text-sm text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-100)]"
          >
            Отмена
          </button>
          {accounts.length > 0 ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="h-9 rounded-xl bg-[var(--v2-ink-900)] px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              Сохранить
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
