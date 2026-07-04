"use client";

import { PersonalMaskProvider } from "./personal-finance-mask";
import {
  CHART_KIND_META,
  IncomeHistoryChartByKind,
  type IncomeHistoryChartKind,
  type IncomeHistoryChartMode,
  incomeHistoryChartExpandHref,
  useIncomeHistoryChartPoints,
  getChartLayout,
} from "./personal-income-history-charts";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { appPath } from "@/lib/api-url";
import type { PersonalIncomeHistoryRow } from "@/lib/v2/personal/types";
import { V2Icons } from "@/components/v2/ui/icons";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const VALID_KINDS = new Set<string>(Object.keys(CHART_KIND_META));

function parseKind(raw: string | null): IncomeHistoryChartKind {
  if (raw === "profit-bars" || raw === "profit-trend") return "profit-total";
  if (raw && VALID_KINDS.has(raw)) return raw as IncomeHistoryChartKind;
  return "capital-total";
}

export function PersonalIncomeHistoryChartsFullClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kind = parseKind(searchParams.get("kind"));
  const modeParam = searchParams.get("mode") as IncomeHistoryChartMode | null;
  const mode = modeParam === "profit" || modeParam === "capital" ? modeParam : CHART_KIND_META[kind].mode;

  const [rows, setRows] = useState<PersonalIncomeHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const meta = CHART_KIND_META[kind];
  const chartPoints = useIncomeHistoryChartPoints(rows);
  const layout = useMemo(() => getChartLayout(chartPoints.length, true), [chartPoints.length]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { rows: data } = await fetchJson<{ rows: PersonalIncomeHistoryRow[] }>(
        "/api/v2/personal/finance/income-history"
      );
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const switchMode = (next: IncomeHistoryChartMode) => {
    const defaultKind: IncomeHistoryChartKind =
      next === "capital" ? "capital-total" : "profit-total";
    router.push(incomeHistoryChartExpandHref(defaultKind, next));
  };

  return (
    <PersonalMaskProvider masked={false}>
      <div className="flex min-h-0 flex-1 flex-col bg-[var(--v2-ink-50)]/40">
        <div className="shrink-0 border-b border-[var(--v2-ink-100)] bg-white px-6 py-4">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href={appPath("/v2/personal/finance/history")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--v2-ink-500)] transition hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-900)]"
                title="Назад к истории"
              >
                <V2Icons.chevL className="h-4 w-4" />
              </Link>
              <div>
                <h1 className="v2-tight text-[18px] font-semibold text-[var(--v2-ink-900)]">{meta.title}</h1>
                <p className="text-[13px] text-[var(--v2-ink-500)]">Полный график · прокрутка по горизонтали</p>
              </div>
            </div>
            <div className="inline-flex rounded-xl bg-[var(--v2-ink-100)]/80 p-1">
              <button
                type="button"
                onClick={() => switchMode("capital")}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition ${
                  mode === "capital"
                    ? "bg-white text-[var(--v2-brand-700)] shadow-[var(--v2-shadow-card)]"
                    : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
                }`}
              >
                Капитал
              </button>
              <button
                type="button"
                onClick={() => switchMode("profit")}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition ${
                  mode === "profit"
                    ? "bg-white text-emerald-700 shadow-[var(--v2-shadow-card)]"
                    : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
                }`}
              >
                Прибыль
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="mx-auto max-w-[1600px]">
            {mode === "capital" ? (
              <div className="mb-4 flex flex-wrap gap-2">
                <ChartTabLink
                  active={kind === "capital-total"}
                  href={incomeHistoryChartExpandHref("capital-total", "capital")}
                  label="Капитал на счетах"
                />
                <ChartTabLink
                  active={kind === "capital-delta"}
                  href={incomeHistoryChartExpandHref("capital-delta", "capital")}
                  label="Изменение помесячно"
                />
              </div>
            ) : null}

            <div className="rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-soft)]">
              {loading ? (
                <div className="py-24 text-center text-[13.5px] text-[var(--v2-ink-500)]">Загрузка…</div>
              ) : error ? (
                <div className="py-24 text-center text-[13.5px] text-red-600">{error}</div>
              ) : chartPoints.length < 2 ? (
                <div className="py-24 text-center text-[13.5px] text-[var(--v2-ink-500)]">
                  Недостаточно данных для графика
                </div>
              ) : (
                <div className="overflow-x-auto pb-2">
                  <div style={{ minWidth: layout.W }}>
                    <IncomeHistoryChartByKind kind={kind} points={chartPoints} expanded />
                  </div>
                </div>
              )}
            </div>

            {!loading && chartPoints.length >= 2 ? (
              <p className="mt-3 text-[12px] text-[var(--v2-ink-400)]">
                {chartPoints.length} мес. · ширина {layout.W}px · наведите на точку для деталей
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </PersonalMaskProvider>
  );
}

function ChartTabLink({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
        active
          ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]"
          : "bg-white text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-soft)] hover:text-[var(--v2-ink-900)]"
      }`}
    >
      {label}
    </Link>
  );
}
