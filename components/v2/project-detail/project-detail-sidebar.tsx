"use client";

import type { ProjectDetailPayload } from "@/lib/v2/projects/project-detail-types";
import { fmtRubShort, pluralRu } from "@/lib/v2/projects/portfolio-utils";
import { MemberAvatar, ProjectBadge } from "@/components/v2/projects/project-atoms";
import { V2Icons } from "@/components/v2/ui/icons";

type BadgeProject = {
  shortName: string | null;
  name: string;
  colorBg: string | null;
  colorInk: string | null;
  colorTint: string | null;
};

function linkInitial(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "").slice(0, 1).toUpperCase();
  } catch {
    return "L";
  }
}

export function ProjectDetailSidebar({
  detail,
  badgeProject,
  onEditMembers,
}: {
  detail: ProjectDetailPayload;
  badgeProject: BadgeProject;
  onEditMembers?: () => void;
}) {
  const totalHours = detail.memberHours.reduce((a, m) => a + m.hours, 0);
  const totalRub = detail.memberHours.reduce((a, m) => a + m.rub, 0);

  return (
    <aside className="sticky top-28 flex max-h-[calc(100vh-7rem)] flex-col gap-4 overflow-y-auto v2-no-scrollbar">
      <div className="rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-card)]">
        <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">О проекте</h4>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[12.5px]">
          <dt className="v2-tight text-[var(--v2-ink-500)]">Проект</dt>
          <dd className="v2-tight inline-flex items-center gap-1.5 font-medium text-[var(--v2-ink-900)]">
            <ProjectBadge project={badgeProject} size="xs" /> {detail.name}
          </dd>
          <dt className="v2-tight text-[var(--v2-ink-500)]">Категория</dt>
          <dd className="v2-tight font-medium text-[var(--v2-ink-900)]">{detail.category}</dd>
          {detail.contractRef ? (
            <>
              <dt className="v2-tight text-[var(--v2-ink-500)]">Договор</dt>
              <dd className="v2-tight v2-tnum font-medium text-[var(--v2-ink-900)]">{detail.contractRef}</dd>
            </>
          ) : null}
          <dt className="v2-tight text-[var(--v2-ink-500)]">Старт</dt>
          <dd className="v2-tight font-medium text-[var(--v2-ink-900)]">
            {detail.startedAt} · {detail.durationDays} {pluralRu(detail.durationDays, ["день", "дня", "дней"])}
          </dd>
          <dt className="v2-tight text-[var(--v2-ink-500)]">Релиз</dt>
          <dd className="v2-tight font-medium text-[var(--v2-brand-700)]">{detail.releaseLabel}</dd>
          <dt className="v2-tight text-[var(--v2-ink-500)]">Бюджет</dt>
          <dd className="v2-tight v2-tnum font-medium text-[var(--v2-ink-900)]">{detail.budget.toLocaleString("ru-RU")} ₽</dd>
        </dl>
      </div>

      <div className="rounded-2xl bg-white p-3 shadow-[var(--v2-shadow-card)]">
        <div className="flex items-center justify-between px-2 py-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">Ссылки</h4>
          <span className="v2-tnum text-[11px] text-[var(--v2-ink-400)]">{detail.links.length}</span>
        </div>
        <div className="space-y-0.5">
          {detail.links.length === 0 ? (
            <p className="px-2 py-3 text-[12px] text-[var(--v2-ink-400)]">Нет ссылок</p>
          ) : (
            detail.links.slice(0, 5).map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-[var(--v2-ink-50)]"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--v2-brand-50)] text-[12px] font-bold text-[var(--v2-brand-700)]">
                  {linkInitial(l.url)}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="v2-tight truncate text-[13px] font-medium text-[var(--v2-ink-900)]">{l.title}</div>
                  <div className="truncate text-[11px] text-[var(--v2-ink-500)]">{l.updatedLabel}</div>
                </div>
                <V2Icons.arrowExt className="h-[14px] w-[14px] text-[var(--v2-ink-300)] group-hover:text-[var(--v2-ink-700)]" />
              </a>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-3 shadow-[var(--v2-shadow-card)]">
        <div className="flex items-center justify-between px-2 py-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">
            Файлы <span className="ml-1 normal-case tracking-normal text-[var(--v2-ink-300)]">· {detail.files.length}</span>
          </h4>
        </div>
        <div className="space-y-0.5">
          {detail.files.length === 0 ? (
            <p className="px-2 py-3 text-[12px] text-[var(--v2-ink-400)]">Нет файлов</p>
          ) : (
            detail.files.slice(0, 5).map((f) => (
              <a
                key={f.id}
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-[var(--v2-ink-50)]"
              >
                <span className="inline-flex h-9 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--v2-ink-100)] text-[9.5px] font-bold uppercase tracking-wide text-[var(--v2-ink-600)]">
                  {f.kind.slice(0, 3)}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="v2-tight truncate text-[12.5px] font-medium text-[var(--v2-ink-900)]">{f.name}</div>
                  <div className="v2-tnum truncate text-[11px] text-[var(--v2-ink-500)]">
                    {f.sizeLabel} · {f.dateLabel}
                  </div>
                </div>
                <V2Icons.download className="h-[14px] w-[14px] text-[var(--v2-ink-300)] opacity-0 transition group-hover:opacity-100" />
              </a>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-card)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">Команда и часы</h4>
          <div className="flex items-center gap-2">
            <span className="v2-tnum text-[11px] text-[var(--v2-ink-400)]">{totalHours}ч всего</span>
            {detail.canManageMembers && onEditMembers ? (
              <button
                type="button"
                onClick={onEditMembers}
                className="v2-tight inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-[var(--v2-brand-700)] transition hover:bg-[var(--v2-brand-50)]"
              >
                <V2Icons.edit className="h-3 w-3" />
                Изменить
              </button>
            ) : null}
          </div>
        </div>
        <div className="space-y-3">
          {detail.memberHours.map((row) => {
            const pct = totalHours > 0 ? row.hours / totalHours : 0;
            return (
              <div key={row.member.userId} className="flex items-center gap-3">
                <MemberAvatar member={row.member} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="v2-tight truncate text-[12.5px] font-medium text-[var(--v2-ink-800)]">{row.member.name}</span>
                    {row.hoursToday > 0 ? (
                      <span className="v2-tnum rounded bg-[var(--v2-brand-50)] px-1 py-px text-[10px] font-semibold text-[var(--v2-brand-700)]">
                        +{row.hoursToday}ч
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
                    <div className="h-full rounded-full bg-[var(--v2-brand-500)]" style={{ width: `${pct * 100}%` }} />
                  </div>
                </div>
                <div className="v2-tnum leading-tight text-right">
                  <div className="text-[12px] font-medium text-[var(--v2-ink-800)]">{row.hours}ч</div>
                  <div className="text-[10.5px] text-[var(--v2-ink-500)]">{fmtRubShort(row.rub)} ₽</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-[var(--v2-ink-100)]/70 pt-3">
          <div className="v2-tight text-[11.5px] text-[var(--v2-ink-500)]">всего списано</div>
          <div className="v2-tnum text-[12.5px] font-semibold text-[var(--v2-ink-900)]">
            {totalHours}ч · {fmtRubShort(totalRub)} ₽
          </div>
        </div>
        {detail.clients.length > 0 ? (
          <div className="mt-4 border-t border-[var(--v2-ink-100)]/70 pt-3">
            <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">
              Клиенты
            </div>
            <div className="space-y-2">
              {detail.clients.map((c) => (
                <div key={c.userId} className="flex items-center gap-2">
                  <MemberAvatar member={c} size={24} />
                  <span className="v2-tight truncate text-[12px] text-[var(--v2-ink-800)]">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
