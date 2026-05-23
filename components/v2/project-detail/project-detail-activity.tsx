"use client";

import type { ProjectDetailActivity } from "@/lib/v2/projects/project-detail-types";
import { V2Icons } from "@/components/v2/ui/icons";

const TONE_META: Record<
  ProjectDetailActivity["tone"],
  { color: string; bg: string; icon: keyof typeof V2Icons }
> = {
  edit: { color: "#3B6FF7", bg: "#E6EDFF", icon: "edit" },
  comment: { color: "#7C3AED", bg: "#EDE9FE", icon: "chat" },
  timer: { color: "#0EA5E9", bg: "#E0F2FE", icon: "clock" },
  attach: { color: "#0F766E", bg: "#CCFBF1", icon: "paperclip" },
  done: { color: "#10B981", bg: "#D1FAE5", icon: "check" },
  review: { color: "#F59E0B", bg: "#FEF3D1", icon: "flag" },
};

export function ProjectDetailActivity({ activity }: { activity: ProjectDetailActivity[] }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-card)]">
      <h4 className="v2-tight mb-4 text-[16px] font-semibold text-[var(--v2-ink-900)]">Лента активности</h4>
      {activity.length === 0 ? (
        <p className="text-[13px] text-[var(--v2-ink-400)]">Пока нет активности по проекту</p>
      ) : (
        <div className="relative">
          <span aria-hidden className="absolute bottom-2 left-[15px] top-2 w-px bg-[var(--v2-ink-100)]" />
          <ul className="space-y-1">
            {activity.map((a) => {
              const tm = TONE_META[a.tone] ?? TONE_META.edit;
              const Icon = V2Icons[tm.icon];
              const nameParts = a.actorName.split(" ");
              const shortName = nameParts.length >= 2 ? `${nameParts[0]} ${nameParts[1]?.[0]}.` : a.actorName;
              return (
                <li key={a.id} className="relative flex items-start gap-3 py-2">
                  <span
                    className="relative z-10 inline-flex h-[30px] w-[30px] items-center justify-center rounded-full ring-4 ring-white"
                    style={{ background: tm.bg }}
                  >
                    <Icon className="h-[13px] w-[13px]" style={{ color: tm.color }} />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="v2-tight text-[13px]">
                      <span className="font-semibold text-[var(--v2-ink-900)]">{shortName}</span>
                      <span className="text-[var(--v2-ink-500)]"> {a.message}</span>
                    </div>
                    {a.note ? <div className="v2-tight mt-0.5 text-[12px] text-[var(--v2-ink-500)]">{a.note}</div> : null}
                  </div>
                  <span className="v2-tight v2-tnum shrink-0 pt-1 text-[11px] text-[var(--v2-ink-400)]">{a.when}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
