"use client";

import { PersonalMaskProvider, PersonalAmt } from "./personal-finance-mask";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { PERSONAL_MONTH_NAMES } from "@/lib/v2/personal/formatters";
import type { PersonalCashForecast } from "@/lib/v2/personal/types";
import { V2Icons } from "@/components/v2/ui/icons";
import { useCallback, useEffect, useMemo, useState } from "react";

function monthLabel(year: number, month: number) {
  return `${PERSONAL_MONTH_NAMES[month - 1]} ${year}`;
}

function adjacentMonth(year: number, month: number, delta: -1 | 1) {
  let m = month + delta;
  let y = year;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  return { year: y, month: m };
}

function parseMoney(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, "").replace(/₽/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function PfCard({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl bg-white shadow-[var(--v2-shadow-soft)] ${className}`}>{children}</div>
  );
}

export function PersonalCashForecastClient() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<PersonalCashForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [dailyDraft, setDailyDraft] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchJson<PersonalCashForecast>(
        `/api/v2/personal/finance/cash-forecast?year=${year}&month=${month}`
      );
      setData(res);
      setDailyDraft(String(Math.round(res.daily_spend_rub) || ""));
      setExcludedIds((prev) => {
        const next = new Set<string>();
        for (const id of prev) {
          if (res.planned_incomes.some((p) => p.project_id === id)) next.add(id);
        }
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить прогноз");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const includedIncomes = useMemo(() => {
    if (!data) return [];
    return data.planned_incomes.filter((p) => !excludedIds.has(p.project_id));
  }, [data, excludedIds]);

  const incomesTotal = includedIncomes.reduce((s, p) => s + p.remaining_rub, 0);
  const dailyTotal = data ? data.daily_spend_rub * data.days_left : 0;
  const oneTimeTotal = data?.one_time_total ?? 0;
  const projected =
    data != null ? data.disposable - oneTimeTotal - dailyTotal + incomesTotal : 0;

  const saveDaily = async () => {
    const n = parseMoney(dailyDraft);
    if (n == null || n < 0) {
      setError("Проверьте сумму в день");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await fetchJson("/api/v2/personal/finance/cash-forecast", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, daily_spend_rub: n }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const addExtra = async () => {
    const amount = parseMoney(newAmount);
    if (amount == null || amount <= 0) {
      setError("Укажите сумму разовой траты");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await fetchJson("/api/v2/personal/finance/forecast", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          month,
          extra: { label: newLabel.trim() || "Разовая трата", amount_rub: amount },
        }),
      });
      setNewLabel("");
      setNewAmount("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить");
    } finally {
      setSaving(false);
    }
  };

  const removeExtra = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      await fetchJson(`/api/v2/personal/finance/forecast/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить");
    } finally {
      setSaving(false);
    }
  };

  const toggleIncome = (projectId: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const go = (delta: -1 | 1) => {
    const n = adjacentMonth(year, month, delta);
    setYear(n.year);
    setMonth(n.month);
  };

  return (
    <PersonalMaskProvider masked={false}>
      <div className="min-h-0 flex-1 overflow-auto bg-[var(--v2-ink-50)] px-6 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-[22px] font-semibold tracking-tight text-[var(--v2-ink-900)]">
                Прогноз
              </h1>
              <p className="mt-0.5 text-[13px] text-[var(--v2-ink-500)]">
                Сколько останется к концу месяца
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-[var(--v2-shadow-soft)]">
              <button
                type="button"
                onClick={() => go(-1)}
                className="rounded-lg p-2 text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)]"
                aria-label="Предыдущий месяц"
              >
                <V2Icons.chevL className="h-4 w-4" />
              </button>
              <span className="min-w-[9.5rem] text-center text-[13px] font-medium text-[var(--v2-ink-800)]">
                {monthLabel(year, month)}
              </span>
              <button
                type="button"
                onClick={() => go(1)}
                className="rounded-lg p-2 text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)]"
                aria-label="Следующий месяц"
              >
                <V2Icons.chevR className="h-4 w-4" />
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {error}
            </div>
          ) : null}

          {loading && !data ? (
            <PfCard className="px-5 py-10 text-center text-[13px] text-[var(--v2-ink-400)]">
              Загрузка…
            </PfCard>
          ) : data ? (
            <>
              <PfCard className="overflow-hidden">
                <div className="border-b border-[var(--v2-ink-100)] bg-gradient-to-br from-[var(--v2-brand-50)] to-white px-5 py-5">
                  <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--v2-ink-500)]">
                    К концу {PERSONAL_MONTH_NAMES[month - 1]?.toLowerCase() ?? "месяца"}
                  </div>
                  <div
                    className={`mt-1 text-[32px] font-semibold tracking-tight v2-tnum ${
                      projected >= 0 ? "text-[var(--v2-ink-900)]" : "text-red-600"
                    }`}
                  >
                    <PersonalAmt v={projected} />
                  </div>
                  <p className="mt-2 text-[13px] text-[var(--v2-ink-500)]">
                    Доступно сейчас − разовые − ежедневные × {data.days_left} дн. + поступления
                  </p>
                </div>
                <div className="grid gap-0 sm:grid-cols-2">
                  {[
                    { label: "В распоряжении сейчас", value: data.disposable, tone: "neutral" as const },
                    {
                      label: "Разовые траты",
                      value: -oneTimeTotal,
                      tone: "neg" as const,
                    },
                    {
                      label: `Ежедневные (${data.daily_spend_rub.toLocaleString("ru-RU")} ₽ × ${data.days_left})`,
                      value: -dailyTotal,
                      tone: "neg" as const,
                    },
                    {
                      label: "Планируемые поступления",
                      value: incomesTotal,
                      tone: "pos" as const,
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="border-t border-[var(--v2-ink-100)] px-5 py-3.5 sm:odd:border-r"
                    >
                      <div className="text-[12px] text-[var(--v2-ink-500)]">{row.label}</div>
                      <div
                        className={`mt-0.5 text-[16px] font-semibold v2-tnum ${
                          row.tone === "pos"
                            ? "text-emerald-600"
                            : row.tone === "neg"
                              ? "text-red-500"
                              : "text-[var(--v2-ink-900)]"
                        }`}
                      >
                        {row.tone === "neutral" ? (
                          <PersonalAmt v={row.value} />
                        ) : (
                          <PersonalAmt v={row.value} signed />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </PfCard>

              <PfCard className="px-5 py-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-semibold text-[var(--v2-ink-900)]">
                      Траты в день
                    </div>
                    <p className="mt-0.5 text-[12px] text-[var(--v2-ink-500)]">
                      Осталось {data.days_left} из {data.days_in_month} дней месяца
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={dailyDraft}
                      onChange={(e) => setDailyDraft(e.target.value)}
                      onBlur={() => void saveDaily()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        }
                      }}
                      placeholder="0"
                      className="w-28 rounded-lg border border-[var(--v2-ink-200)] bg-white px-3 py-2 text-right text-[14px] v2-tnum text-[var(--v2-ink-900)] outline-none focus:border-[var(--v2-brand-400)]"
                    />
                    <span className="text-[13px] text-[var(--v2-ink-500)]">₽ / день</span>
                  </div>
                </div>
              </PfCard>

              <PfCard className="px-5 py-4">
                <div className="text-[14px] font-semibold text-[var(--v2-ink-900)]">
                  Разовые траты
                </div>
                <p className="mt-0.5 text-[12px] text-[var(--v2-ink-500)]">
                  Планируемые разовые расходы до конца месяца
                </p>
                <ul className="mt-3 divide-y divide-[var(--v2-ink-100)]">
                  {data.one_time_expenses.length === 0 ? (
                    <li className="py-3 text-[13px] text-[var(--v2-ink-400)]">Пока нет</li>
                  ) : (
                    data.one_time_expenses.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="min-w-0 truncate text-[13px] text-[var(--v2-ink-800)]">
                          {e.label}
                        </span>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[13px] font-medium v2-tnum text-red-500">
                            <PersonalAmt v={e.amount_rub} />
                          </span>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void removeExtra(e.id)}
                            className="rounded-md px-2 py-1 text-[12px] text-[var(--v2-ink-400)] hover:bg-[var(--v2-ink-50)] hover:text-red-600"
                          >
                            Удалить
                          </button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--v2-ink-100)] pt-3">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Название"
                    className="min-w-[8rem] flex-1 rounded-lg border border-[var(--v2-ink-200)] px-3 py-2 text-[13px] outline-none focus:border-[var(--v2-brand-400)]"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="Сумма"
                    className="w-28 rounded-lg border border-[var(--v2-ink-200)] px-3 py-2 text-right text-[13px] v2-tnum outline-none focus:border-[var(--v2-brand-400)]"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void addExtra()}
                    className="rounded-lg bg-[var(--v2-brand-600)] px-3 py-2 text-[13px] font-medium text-white hover:bg-[var(--v2-brand-700)] disabled:opacity-50"
                  >
                    Добавить
                  </button>
                </div>
              </PfCard>

              <PfCard className="px-5 py-4">
                <div className="text-[14px] font-semibold text-[var(--v2-ink-900)]">
                  Планируемые поступления
                </div>
                <p className="mt-0.5 text-[12px] text-[var(--v2-ink-500)]">
                  Остатки по неоплаченным проектам. Уберите проект из прогноза, если не хотите его
                  учитывать.
                </p>
                <ul className="mt-3 divide-y divide-[var(--v2-ink-100)]">
                  {data.planned_incomes.length === 0 ? (
                    <li className="py-3 text-[13px] text-[var(--v2-ink-400)]">
                      Нет неоплаченных проектов
                    </li>
                  ) : (
                    data.planned_incomes.map((p) => {
                      const excluded = excludedIds.has(p.project_id);
                      return (
                        <li
                          key={p.project_id}
                          className={`flex items-center justify-between gap-3 py-2.5 ${
                            excluded ? "opacity-45" : ""
                          }`}
                        >
                          <div className="min-w-0">
                            <div
                              className={`truncate text-[13px] text-[var(--v2-ink-800)] ${
                                excluded ? "line-through" : ""
                              }`}
                            >
                              {p.name}
                            </div>
                            <div className="text-[11px] text-[var(--v2-ink-400)]">
                              {p.status === "prepaid" ? "Предоплата" : "Не оплачен"}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span
                              className={`text-[13px] font-medium v2-tnum ${
                                excluded ? "text-[var(--v2-ink-400)]" : "text-emerald-600"
                              }`}
                            >
                              <PersonalAmt v={p.remaining_rub} signed />
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleIncome(p.project_id)}
                              className="rounded-md px-2 py-1 text-[12px] text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-800)]"
                            >
                              {excluded ? "Вернуть" : "Убрать"}
                            </button>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
                {excludedIds.size > 0 ? (
                  <p className="mt-2 text-[12px] text-[var(--v2-ink-400)]">
                    Убрано из прогноза: {excludedIds.size}. Сами проекты не удаляются.
                  </p>
                ) : null}
              </PfCard>
            </>
          ) : null}
        </div>
      </div>
    </PersonalMaskProvider>
  );
}
