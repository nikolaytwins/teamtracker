"use client";

import { formatRubWithSpaces, parseRubInput } from "@/lib/v2/format-money";

export function MoneyRubInput({
  value,
  onChange,
  placeholder,
  className = "v2-input mt-1.5 w-full",
}: {
  value: string;
  onChange: (display: string, amount: number | null) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        const amount = parseRubInput(raw);
        onChange(amount == null ? raw.replace(/[^\d\s]/g, "") : formatRubWithSpaces(amount), amount);
      }}
      onBlur={() => {
        const amount = parseRubInput(value);
        if (amount != null) onChange(formatRubWithSpaces(amount), amount);
      }}
    />
  );
}
