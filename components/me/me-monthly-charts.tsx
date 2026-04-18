"use client";

type ByDayPoint = { date: string; seconds: number; hours: number };

type BucketPoint = { id: string; label: string; hours: number; seconds?: number };

const BUCKET_BAR_COLORS = [
  "bg-sky-500 dark:bg-sky-400",
  "bg-violet-500 dark:bg-violet-400",
  "bg-amber-500 dark:bg-amber-400",
  "bg-emerald-500 dark:bg-emerald-400",
  "bg-rose-500 dark:bg-rose-400",
  "bg-cyan-600 dark:bg-cyan-400",
  "bg-fuchsia-500 dark:bg-fuchsia-400",
  "bg-orange-500 dark:bg-orange-400",
];

function bucketStrength(b: BucketPoint): number {
  return typeof b.seconds === "number" && !Number.isNaN(b.seconds) ? b.seconds : Math.max(0, b.hours) * 3600;
}

const DAY_CHART_PX = 168;

export function MeMonthlyByDayChart({ byDay, monthLabel }: { byDay: ByDayPoint[]; monthLabel: string }) {
  const maxSec = Math.max(1, ...byDay.map((d) => d.seconds));
  const hasWork = byDay.some((d) => d.seconds > 0);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-[var(--text)]">По дням</h3>
      <p className="text-xs text-[var(--muted-foreground)]">
        Часы за каждый день месяца ({monthLabel}). Наведите на столбец — дата и время.
      </p>
      {!hasWork ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] py-8 text-center text-sm text-[var(--muted-foreground)]">
          Нет данных по дням
        </p>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30 px-2 pb-3 pt-3 dark:bg-[var(--surface-2)]/15">
          <div className="overflow-x-auto">
            <div
              className="mx-auto flex min-w-[280px] items-end justify-stretch gap-px sm:min-w-0 sm:gap-0.5"
              role="img"
              aria-label={`Столбчатая диаграмма времени по дням за ${monthLabel}`}
            >
              {byDay.map((d) => {
                const barH =
                  d.seconds <= 0 ? 0 : Math.max(5, Math.round((d.seconds / maxSec) * DAY_CHART_PX));
                const dayNum = Number(d.date.slice(-2));
                const title = `${d.date}: ${d.hours} ч (${formatDurShort(d.seconds)})`;
                return (
                  <div
                    key={d.date}
                    className="group relative z-0 flex min-w-0 flex-1 flex-col items-center gap-0.5 pb-6"
                    title={title}
                  >
                    <div className="relative w-full max-w-[20px] cursor-default" style={{ height: DAY_CHART_PX }}>
                      <div className="absolute bottom-0 left-0 right-0 flex flex-col justify-end" style={{ height: DAY_CHART_PX }}>
                        <div
                          className="w-full rounded-t-sm bg-[var(--primary)]/85 transition-[filter] duration-150 group-hover:brightness-110 dark:bg-[var(--primary)]/90"
                          style={{ height: barH }}
                        />
                      </div>
                    </div>
                    <span className="select-none text-[9px] font-medium tabular-nums leading-none text-[var(--muted-foreground)] sm:text-[10px]">
                      {dayNum}
                    </span>
                    <span className="pointer-events-none absolute left-1/2 top-full z-[200] mt-0.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--text)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--bg)] opacity-0 shadow-lg ring-1 ring-black/10 transition-opacity group-hover:opacity-100 dark:ring-white/10">
                      {d.hours} ч
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDurShort(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м`;
  return `${s}с`;
}

export function MeMonthlyBucketsChart({ buckets }: { buckets: BucketPoint[] }) {
  const maxStr = Math.max(1, ...buckets.map(bucketStrength));

  if (buckets.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-[var(--text)]">По категориям</h3>
        <p className="rounded-xl border border-dashed border-[var(--border)] py-8 text-center text-sm text-[var(--muted-foreground)]">
          Нет данных по категориям
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-[var(--text)]">По категориям</h3>
      <p className="text-xs text-[var(--muted-foreground)]">Доля времени по сводным категориям за месяц.</p>
      <ul className="space-y-3" role="list">
        {buckets.map((b, i) => {
          const str = bucketStrength(b);
          const pct = Math.min(100, Math.round((str / maxStr) * 100));
          const color = BUCKET_BAR_COLORS[i % BUCKET_BAR_COLORS.length];
          return (
            <li key={b.id} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate font-medium text-[var(--text)]">{b.label}</span>
                <span className="shrink-0 tabular-nums text-sm font-bold text-[var(--text)]">{b.hours} ч</span>
              </div>
              <div
                className="h-3 w-full overflow-hidden rounded-full bg-[var(--surface-2)] ring-1 ring-[var(--border)]"
                title={`${b.label}: ${b.hours} ч`}
              >
                <div
                  className={`h-full rounded-full ${color} transition-[width] duration-300 ease-out`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
