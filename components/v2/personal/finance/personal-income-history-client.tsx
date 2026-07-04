"use client";

import { PersonalMaskProvider } from "./personal-finance-mask";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  formatPersonalRub,
  formatPersonalRubSigned,
  nextPersonalMonthAfter,
  PERSONAL_MONTH_NAMES,
} from "@/lib/v2/personal/formatters";
import type { PersonalIncomeHistoryRow } from "@/lib/v2/personal/types";
import {
  IncomeHistoryChartsSection,
  useIncomeHistoryChartPoints,
  type IncomeHistoryChartMode,
} from "./personal-income-history-charts";
import { V2Icons } from "@/components/v2/ui/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type MoneyField = "accounts_total_rub" | "earned_rub" | "profit_rub" | "spent_rub";

function monthTitle(year: number, month: number) {
  return `${PERSONAL_MONTH_NAMES[month - 1]} ${year} г.`;
}

function parseMoneyInput(raw: string): number | null {
  const t = raw.trim();
  if (!t || t === "—" || t === "-") return null;
  const cleaned = t.replace(/\s/g, "").replace(/₽/g, "").replace(/,/g, ".").replace(/^\+/, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function formatDraft(v: number | null) {
  if (v == null) return "";
  return String(Math.round(v));
}

function PfCard({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl bg-white shadow-[var(--v2-shadow-soft)] ${className}`}>{children}</div>
  );
}

function DeltaRub({ value }: { value: number | null }) {
  if (value == null) return <span className="text-[var(--v2-ink-300)]">—</span>;
  const up = value >= 0;
  return (
    <span className={`v2-tnum font-medium ${up ? "text-emerald-600" : "text-red-500"}`}>
      {formatPersonalRubSigned(value)}
    </span>
  );
}

function EditableMoneyCell({
  value,
  field,
  year,
  month,
  required,
  profitStyle,
  onSaved,
  onError,
}: {
  value: number | null;
  field: MoneyField;
  year: number;
  month: number;
  required?: boolean;
  profitStyle?: boolean;
  onSaved: (row: PersonalIncomeHistoryRow) => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(formatDraft(value));
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing, value]);

  const commit = async () => {
    const parsed = parseMoneyInput(draft);
    if (required && parsed == null) {
      onError("Укажите сумму");
      setEditing(false);
      return;
    }
    if (!required && draft.trim() !== "" && parsed == null) {
      onError("Некорректная сумма");
      return;
    }
    const same = (parsed ?? null) === (value ?? null);
    setEditing(false);
    if (same) return;

    setSaving(true);
    try {
      const { row } = await fetchJson<{ row: PersonalIncomeHistoryRow }>(
        `/api/v2/personal/finance/income-history/${year}/${month}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: parsed }),
        }
      );
      onSaved(row);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Не удалось сохранить");
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
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commit();
          }
          if (e.key === "Escape") {
            setEditing(false);
          }
        }}
        className="v2-tnum w-full rounded-md border border-[var(--v2-brand-300)] bg-white px-2 py-1 text-right text-[13.5px] font-medium text-[var(--v2-ink-900)] outline-none ring-2 ring-[var(--v2-brand-100)]"
        inputMode="numeric"
      />
    );
  }

  const empty = value == null && !required;

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      disabled={saving}
      className={`v2-tnum w-full rounded-md px-2 py-1 text-right text-[13.5px] transition hover:bg-[var(--v2-ink-50)] ${
        saving ? "opacity-60" : ""
      } ${
        empty
          ? "font-normal text-[var(--v2-ink-300)]"
          : profitStyle && value != null
            ? value >= 0
              ? "font-semibold text-emerald-600"
              : "font-semibold text-red-500"
            : field === "earned_rub"
              ? "font-medium text-emerald-600"
              : "font-semibold text-[var(--v2-ink-900)]"
      }`}
      title="Нажмите, чтобы изменить"
    >
      {empty ? "—" : profitStyle ? formatPersonalRubSigned(value!) : formatPersonalRub(value!)}
    </button>
  );
}

type RowWithDelta = PersonalIncomeHistoryRow & { delta: number | null };

function computeYearDelta(year: number, rows: PersonalIncomeHistoryRow[]): number | null {
  const dec = rows.find((r) => r.year === year && r.month === 12);
  const prevDec = rows.find((r) => r.year === year - 1 && r.month === 12);
  if (dec && prevDec) return dec.accounts_total_rub - prevDec.accounts_total_rub;
  const jan = rows.find((r) => r.year === year && r.month === 1);
  if (dec && jan) return dec.accounts_total_rub - jan.accounts_total_rub;
  return null;
}

function HistoryTableRow({
  row,
  onSaved,
  onError,
}: {
  row: RowWithDelta;
  onSaved: (row: PersonalIncomeHistoryRow) => void;
  onError: (msg: string) => void;
}) {
  return (
    <div className="grid grid-cols-[1.35fr_1fr_1fr_0.95fr_0.95fr_0.95fr] items-center px-3 py-1.5 transition hover:bg-[var(--v2-ink-50)]/50">
      <div className="px-2 py-2">
        <span className="v2-tight text-[13.5px] font-medium text-[var(--v2-ink-900)]">
          {monthTitle(row.year, row.month)}
        </span>
      </div>
      <EditableMoneyCell
        value={row.accounts_total_rub}
        field="accounts_total_rub"
        year={row.year}
        month={row.month}
        required
        onSaved={onSaved}
        onError={onError}
      />
      <div className="px-2 py-2 text-right">
        <DeltaRub value={row.delta} />
      </div>
      <EditableMoneyCell
        value={row.earned_rub}
        field="earned_rub"
        year={row.year}
        month={row.month}
        onSaved={onSaved}
        onError={onError}
      />
      <EditableMoneyCell
        value={row.profit_rub}
        field="profit_rub"
        year={row.year}
        month={row.month}
        profitStyle
        onSaved={onSaved}
        onError={onError}
      />
      <EditableMoneyCell
        value={row.spent_rub}
        field="spent_rub"
        year={row.year}
        month={row.month}
        onSaved={onSaved}
        onError={onError}
      />
    </div>
  );
}

function YearAccordion({
  year,
  rows,
  yearDelta,
  defaultOpen,
  onSaved,
  onError,
}: {
  year: number;
  rows: RowWithDelta[];
  yearDelta: number | null;
  defaultOpen: boolean;
  onSaved: (row: PersonalIncomeHistoryRow) => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-[var(--v2-ink-100)]/70 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-[var(--v2-ink-50)]/60"
      >
        <V2Icons.chev
          className={`h-4 w-4 shrink-0 text-[var(--v2-ink-400)] transition-transform ${open ? "" : "-rotate-90"}`}
        />
        <span className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">{year}</span>
        {yearDelta != null ? (
          <span className="text-[12.5px] text-[var(--v2-ink-500)]">
            Динамика за год:{" "}
            <span className={`v2-tnum font-medium ${yearDelta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {formatPersonalRubSigned(yearDelta)}
            </span>
          </span>
        ) : null}
        <span className="ml-auto text-[12px] text-[var(--v2-ink-400)]">{rows.length} мес.</span>
      </button>
      {open ? (
        <div className="divide-y divide-[var(--v2-ink-100)]/70 border-t border-[var(--v2-ink-100)]/50 bg-[var(--v2-ink-50)]/20">
          {rows.map((row) => (
            <HistoryTableRow key={`${row.year}-${row.month}`} row={row} onSaved={onSaved} onError={onError} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PersonalIncomeHistoryClient() {
  const [rows, setRows] = useState<PersonalIncomeHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<IncomeHistoryChartMode>("capital");

  const showError = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { rows: data } = await fetchJson<{ rows: PersonalIncomeHistoryRow[] }>(
        "/api/v2/personal/finance/income-history"
      );
      setRows(data);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Не удалось загрузить историю");
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void load();
  }, [load]);

  const rowsWithDelta = useMemo((): RowWithDelta[] => {
    return rows.map((row, i) => {
      const older = rows[i + 1];
      const delta = older ? row.accounts_total_rub - older.accounts_total_rub : null;
      return { ...row, delta };
    });
  }, [rows]);

  const yearGroups = useMemo(() => {
    const byYear = new Map<number, RowWithDelta[]>();
    for (const row of rowsWithDelta) {
      const list = byYear.get(row.year) ?? [];
      list.push(row);
      byYear.set(row.year, list);
    }
    const years = [...byYear.keys()].sort((a, b) => b - a);
    const currentYear = years[0] ?? new Date().getFullYear();
    return years.map((year) => ({
      year,
      rows: byYear.get(year)!,
      yearDelta: computeYearDelta(year, rows),
      isCurrent: year === currentYear,
    }));
  }, [rowsWithDelta, rows]);

  const chartPoints = useIncomeHistoryChartPoints(rows);

  const handleSaved = (row: PersonalIncomeHistoryRow) => {
    setRows((prev) => prev.map((r) => (r.year === row.year && r.month === row.month ? row : r)));
  };

  const addMonth = async () => {
    const { year, month } = nextPersonalMonthAfter(rows);
    setAdding(true);
    try {
      const { row } = await fetchJson<{ row: PersonalIncomeHistoryRow }>(
        "/api/v2/personal/finance/income-history",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year, month, accounts_total_rub: 0 }),
        }
      );
      setRows((prev) => [row, ...prev]);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Не удалось добавить месяц");
    } finally {
      setAdding(false);
    }
  };

  return (
    <PersonalMaskProvider masked={false}>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-[var(--v2-ink-50)]/40">
        <div className="mx-auto w-full max-w-[1180px] px-6 py-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="v2-tight text-[22px] font-semibold tracking-[-0.02em] text-[var(--v2-ink-900)]">
                История дохода
              </h1>
              <p className="mt-1 text-[13.5px] text-[var(--v2-ink-500)]">
                Помесячная сводка: счета, динамика, доход, прибыль и расход. Клик по ячейке — редактирование.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void addMonth()}
              disabled={adding || loading}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--v2-brand-600)] px-4 text-[13.5px] font-semibold text-white shadow-[var(--v2-shadow-glow)] transition hover:bg-[var(--v2-brand-700)] disabled:opacity-60"
            >
              <V2Icons.plus className="h-4 w-4" />
              {adding ? "Добавляем…" : "Новый месяц"}
            </button>
          </div>

          {toast ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700">
              {toast}
            </div>
          ) : null}

          {!loading && rows.length > 0 ? (
            <IncomeHistoryChartsSection points={chartPoints} mode={chartMode} onModeChange={setChartMode} />
          ) : null}

          <PfCard className="overflow-hidden">
            <div className="grid grid-cols-[1.35fr_1fr_1fr_0.95fr_0.95fr_0.95fr] border-b border-[var(--v2-ink-100)]/70 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-400)]">
              <div>Месяц</div>
              <div className="text-right">Всего на счетах</div>
              <div className="text-right">Динамика капитала</div>
              <div className="text-right">Доход</div>
              <div className="text-right">Прибыль</div>
              <div className="text-right">Расход</div>
            </div>

            {loading ? (
              <div className="px-5 py-16 text-center text-[13.5px] text-[var(--v2-ink-500)]">Загрузка…</div>
            ) : rowsWithDelta.length === 0 ? (
              <div className="px-5 py-16 text-center text-[13.5px] text-[var(--v2-ink-500)]">
                История пуста — нажмите «Новый месяц»
              </div>
            ) : (
              <div>
                {yearGroups.map((group) =>
                  group.isCurrent ? (
                    <div key={group.year} className="divide-y divide-[var(--v2-ink-100)]/70">
                      {group.rows.map((row) => (
                        <HistoryTableRow
                          key={`${row.year}-${row.month}`}
                          row={row}
                          onSaved={handleSaved}
                          onError={showError}
                        />
                      ))}
                    </div>
                  ) : (
                    <YearAccordion
                      key={group.year}
                      year={group.year}
                      rows={group.rows}
                      yearDelta={group.yearDelta}
                      defaultOpen={false}
                      onSaved={handleSaved}
                      onError={showError}
                    />
                  )
                )}
              </div>
            )}
          </PfCard>

          <p className="mt-4 text-[12px] text-[var(--v2-ink-400)]">
            Динамика считается автоматически: разница с предыдущим месяцем. Пустое поле — «—», очистите значение и
            сохраните Enter.
          </p>
        </div>
      </div>
    </PersonalMaskProvider>
  );
}
