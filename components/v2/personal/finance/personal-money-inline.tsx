"use client";

import { PersonalAmt } from "./personal-finance-mask";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { formatPersonalNative } from "@/lib/v2/personal/formatters";
import type { PersonalAccountRow, PersonalCapitalRow, PersonalTransactionRow, PersonalTxnType } from "@/lib/v2/personal/types";
import { useEffect, useRef, useState } from "react";

function parseMoneyInput(raw: string, allowCents = false): number | null {
  const t = raw.trim();
  if (!t || t === "—" || t === "-") return null;
  const cleaned = t.replace(/\s/g, "").replace(/₽/g, "").replace(/,/g, ".").replace(/^\+/, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  if (allowCents) return Math.round(n * 100) / 100;
  return Math.round(n);
}

function formatDraft(v: number, allowCents = false) {
  if (allowCents && v % 1 !== 0) return String(v);
  return String(Math.round(v));
}

type PersonalMoneyInlineProps = {
  value: number;
  onSave: (next: number) => Promise<number>;
  onSaved?: (next: number) => void;
  onError?: (msg: string) => void;
  title?: string;
  className?: string;
  /** Разрешить копейки / центы (для валютных счетов) */
  allowCents?: boolean;
  /** Кастомный рендер отображаемого значения */
  display?: React.ReactNode;
};

/** Клик по сумме → ввод → Enter / blur сохраняет. Escape отменяет. */
export function PersonalMoneyInline({
  value,
  onSave,
  onSaved,
  onError,
  title = "Нажмите, чтобы изменить",
  className = "",
  allowCents = false,
  display,
}: PersonalMoneyInlineProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurCommit = useRef(false);

  useEffect(() => {
    if (editing) {
      setDraft(formatDraft(value, allowCents));
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing, value, allowCents]);

  const commit = async () => {
    const parsed = parseMoneyInput(draft, allowCents);
    if (parsed == null) {
      onError?.("Некорректная сумма");
      setEditing(false);
      return;
    }
    setEditing(false);
    if (parsed === value) return;

    setSaving(true);
    try {
      const next = await onSave(parsed);
      onSaved?.(next);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (skipBlurCommit.current) {
            skipBlurCommit.current = false;
            return;
          }
          void commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            skipBlurCommit.current = true;
            setEditing(false);
          }
        }}
        className={`v2-tnum w-[120px] rounded-lg border border-[var(--v2-brand-300)] bg-white px-2.5 py-1.5 text-right text-[15px] font-semibold text-[var(--v2-ink-900)] outline-none ring-2 ring-[var(--v2-brand-100)] ${className}`}
        inputMode="decimal"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      disabled={saving}
      title={title}
      className={`v2-tnum rounded-lg px-2 py-1 text-right text-[15px] font-semibold text-[var(--v2-ink-900)] transition hover:bg-[var(--v2-brand-50)] hover:text-[var(--v2-brand-700)] disabled:opacity-50 ${className}`}
    >
      {display ?? <PersonalAmt v={value} />}
    </button>
  );
}

export function PersonalAccountBalanceInline({
  accountId,
  value,
  currencyCode = "RUB",
  rubValue,
  onSaved,
  onError,
  className = "",
}: {
  accountId: string;
  /** Для RUB — рубли; для валюты — остаток в исходной валюте */
  value: number;
  currencyCode?: string;
  /** Рублёвая оценка (показывается рядом для валютных) */
  rubValue?: number;
  onSaved?: (account: PersonalAccountRow) => void;
  onError?: (msg: string) => void;
  className?: string;
}) {
  const isFx = currencyCode !== "RUB";
  return (
    <div className="flex flex-col items-start gap-0.5">
      <PersonalMoneyInline
        value={value}
        allowCents={isFx}
        className={className}
        title={isFx ? "Нажмите, чтобы изменить остаток в валюте" : "Нажмите, чтобы изменить баланс"}
        display={
          isFx ? (
            <span>{formatPersonalNative(value, currencyCode)}</span>
          ) : (
            <PersonalAmt v={value} />
          )
        }
        onSave={async (next) => {
          const body = isFx ? { balance_native: next } : { balance_rub: next };
          const { account } = await fetchJson<{ account: PersonalAccountRow }>(
            `/api/v2/personal/finance/accounts/${accountId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          );
          onSaved?.(account);
          return isFx ? account.balance_native : account.balance_rub;
        }}
        onError={onError}
      />
      {isFx && rubValue != null ? (
        <span className="v2-tnum text-[11px] font-medium text-[var(--v2-ink-400)]">
          ≈ <PersonalAmt v={rubValue} />
        </span>
      ) : null}
    </div>
  );
}

export function PersonalTransactionAmountInline({
  transactionId,
  value,
  txnType,
  onSaved,
  onError,
  className = "",
}: {
  transactionId: string;
  value: number;
  txnType: PersonalTxnType;
  onSaved?: (transaction: PersonalTransactionRow) => void;
  onError?: (msg: string) => void;
  className?: string;
}) {
  const sign = txnType === "income" ? "+" : txnType === "expense" ? "−" : "";
  return (
    <PersonalMoneyInline
      value={value}
      className={className}
      title="Нажмите, чтобы изменить сумму"
      display={
        <>
          {sign}
          <PersonalAmt v={value} />
        </>
      }
      onSave={async (next) => {
        const { transaction } = await fetchJson<{ transaction: PersonalTransactionRow }>(
          `/api/v2/personal/finance/transactions/${transactionId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount_rub: next }),
          }
        );
        onSaved?.(transaction);
        return transaction.amount_rub;
      }}
      onError={onError}
    />
  );
}

export function PersonalCapitalAmountInline({
  capitalId,
  value,
  onSaved,
  onError,
  className = "",
}: {
  capitalId: string;
  value: number;
  onSaved?: (amount: number) => void;
  onError?: (msg: string) => void;
  className?: string;
}) {
  return (
    <PersonalMoneyInline
      value={value}
      className={className}
      title="Нажмите, чтобы изменить сумму"
      onSave={async (next) => {
        const { item } = await fetchJson<{ item: PersonalCapitalRow }>(
          `/api/v2/personal/finance/capital/${capitalId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount_rub: next }),
          }
        );
        return item.amount_rub;
      }}
      onSaved={onSaved}
      onError={onError}
    />
  );
}
