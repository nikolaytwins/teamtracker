"use client";

import { PersonalAmt } from "./personal-finance-mask";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { PersonalAccountRow, PersonalCapitalRow } from "@/lib/v2/personal/types";
import { useEffect, useRef, useState } from "react";

function parseMoneyInput(raw: string): number | null {
  const t = raw.trim();
  if (!t || t === "—" || t === "-") return null;
  const cleaned = t.replace(/\s/g, "").replace(/₽/g, "").replace(/,/g, ".").replace(/^\+/, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function formatDraft(v: number) {
  return String(Math.round(v));
}

type PersonalMoneyInlineProps = {
  value: number;
  onSave: (next: number) => Promise<number>;
  onSaved?: (next: number) => void;
  onError?: (msg: string) => void;
  title?: string;
  className?: string;
};

/** Клик по сумме → ввод → Enter / blur сохраняет. Escape отменяет. */
export function PersonalMoneyInline({
  value,
  onSave,
  onSaved,
  onError,
  title = "Нажмите, чтобы изменить",
  className = "",
}: PersonalMoneyInlineProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurCommit = useRef(false);

  useEffect(() => {
    if (editing) {
      setDraft(formatDraft(value));
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing, value]);

  const commit = async () => {
    const parsed = parseMoneyInput(draft);
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
        inputMode="numeric"
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
      <PersonalAmt v={value} />
    </button>
  );
}

export function PersonalAccountBalanceInline({
  accountId,
  value,
  onSaved,
  onError,
}: {
  accountId: string;
  value: number;
  onSaved?: (balance: number) => void;
  onError?: (msg: string) => void;
}) {
  return (
    <PersonalMoneyInline
      value={value}
      title="Нажмите, чтобы изменить баланс"
      onSave={async (next) => {
        const { account } = await fetchJson<{ account: PersonalAccountRow }>(
          `/api/v2/personal/finance/accounts/${accountId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ balance_rub: next }),
          }
        );
        return account.balance_rub;
      }}
      onSaved={onSaved}
      onError={onError}
    />
  );
}

export function PersonalCapitalAmountInline({
  capitalId,
  value,
  onSaved,
  onError,
}: {
  capitalId: string;
  value: number;
  onSaved?: (amount: number) => void;
  onError?: (msg: string) => void;
}) {
  return (
    <PersonalMoneyInline
      value={value}
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
