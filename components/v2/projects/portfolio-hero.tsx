"use client";

import { appPath } from "@/lib/api-url";
import type { PortfolioPayload } from "@/lib/v2/projects/portfolio-types";
import { fmtLoadSeconds } from "@/lib/v2/team/daily-team-load";
import { pluralRu } from "@/lib/v2/projects/portfolio-utils";
import { MemberAvatar } from "@/components/v2/projects/project-atoms";
import { V2Icons } from "@/components/v2/ui/icons";
import Link from "next/link";

function KpiTile({
  accent,
  label,
  value,
  sub,
}: {
  accent: string;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="relative flex flex-col gap-1 overflow-hidden rounded-2xl bg-white p-4 shadow-[var(--v2-shadow-card)]">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <div className="v2-tnum v2-tighter text-[34px] font-semibold leading-none text-[var(--v2-ink-900)]">{value}</div>
      </div>
      <div className="mt-1 text-[11.5px] text-[var(--v2-ink-500)]">{sub}</div>
    </div>
  );
}

function TeamLoadCard({ rows }: { rows: PortfolioPayload["teamLoad"] }) {
  return (
    <div className="h-full rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-card)]">
      <div className="mb-4 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">
        <span>Загрузка команды</span>
        <span className="normal-case tracking-normal text-[var(--v2-ink-400)]">сегодня</span>
      </div>
      <div className="space-y-2.5">
        {rows.length === 0 ? (
          <p className="text-[12px] text-[var(--v2-ink-400)]">Нет задач на сегодня</p>
        ) : (
          rows.map((r) => (
            <div key={r.userId} className="flex items-center gap-3">
              <MemberAvatar member={r} size={26} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="v2-tight truncate text-[12.5px] font-medium text-[var(--v2-ink-800)]">{r.name}</span>
                  <span className="text-[11px] text-[var(--v2-ink-400)]">
                    {r.taskCount} {pluralRu(r.taskCount, ["задача", "задачи", "задач"])}
                    {r.isWorkDay ? (
                      <> · {fmtLoadSeconds(r.estimatedSeconds)} / {fmtLoadSeconds(r.capacitySeconds)}</>
                    ) : (
                      <> · выходной</>
                    )}
                  </span>
                </div>
                <div className="mt-1 h-[5px] w-full overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(r.isWorkDay ? r.load : 0, 1) * 100}%`,
                      background: !r.isWorkDay ? "#A1A1AA" : r.load > 0.95 ? "#EF4444" : r.load > 0.85 ? "#F59E0B" : "#3B6FF7",
                      transition: "width .9s cubic-bezier(.2,.7,.2,1)",
                    }}
                  />
                </div>
              </div>
              <span
                className={`v2-tnum w-9 text-right text-[11.5px] font-medium ${
                  !r.isWorkDay
                    ? "text-[var(--v2-ink-400)]"
                    : r.load > 0.95
                      ? "text-red-600"
                      : r.load > 0.85
                        ? "text-amber-700"
                        : "text-[var(--v2-ink-600)]"
                }`}
              >
                {r.isWorkDay ? `${Math.round(r.load * 100)}%` : "—"}
              </span>
            </div>
          ))
        )}
      </div>
      <Link
        href={appPath("/v2/admin/people")}
        className="v2-tight mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--v2-brand-700)] hover:text-[var(--v2-brand-800)]"
      >
        Открыть команду <V2Icons.arrowR className="h-[14px] w-[14px]" />
      </Link>
    </div>
  );
}

export function PortfolioHero({ kpis, teamLoad, projects }: PortfolioPayload) {
  const review = projects.filter((p) => p.status === "review").length;
  const critical = projects.filter((p) => p.health === "critical").length;

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 grid grid-cols-2 gap-4 lg:col-span-8">
        <KpiTile accent="#3B6FF7" label="В работе" value={kpis.inProgress} sub={`${review} ещё на согласовании`} />
        <KpiTile
          accent="#EF4444"
          label="Под угрозой"
          value={kpis.atRisk}
          sub={critical ? `${critical} критично · нужна помощь` : "всё под контролем"}
        />
        <KpiTile accent="#F59E0B" label="На согласовании" value={kpis.review} sub="ждут решения клиента" />
        <KpiTile accent="#A1A1AA" label="Не начаты" value={kpis.notStarted} sub="старт по плану" />
      </div>
      <div className="col-span-12 lg:col-span-4">
        <TeamLoadCard rows={teamLoad} />
      </div>
    </div>
  );
}
