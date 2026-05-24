"use client";

import type { PortfolioMember, PortfolioProject } from "@/lib/v2/projects/portfolio-types";
import type { V2ProjectEngagementType } from "@/lib/v2/types";
import { HEALTH_META, PRIORITY_META, STATUS_META } from "@/components/v2/projects/portfolio-meta";

type BadgeProject = Pick<
  PortfolioProject,
  "shortName" | "name" | "colorBg" | "colorInk" | "colorTint"
>;

const BADGE_SIZES = {
  xl: "h-12 w-12 rounded-2xl text-[16px]",
  lg: "h-11 w-11 rounded-xl text-[15px]",
  md: "h-9 w-9 rounded-xl text-[13px]",
  sm: "h-7 w-7 rounded-lg text-[11.5px]",
  xs: "h-6 w-6 rounded-md text-[11px]",
} as const;

export function ProjectBadge({
  project,
  size = "md",
}: {
  project: BadgeProject;
  size?: keyof typeof BADGE_SIZES;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-semibold ${BADGE_SIZES[size]}`}
      style={{
        background: project.colorBg ?? "#EEEEF1",
        color: project.colorInk ?? project.colorTint ?? "#0A0A0B",
      }}
      title={project.name}
    >
      {project.shortName ?? project.name.slice(0, 1)}
    </span>
  );
}

export function StatusBadge({
  status,
  size = "md",
}: {
  status: keyof typeof STATUS_META;
  size?: "sm" | "md";
}) {
  const m = STATUS_META[status];
  const isSm = size === "sm";
  return (
    <span
      className={`v2-tight inline-flex items-center gap-1.5 rounded-full font-medium ${isSm ? "py-[2px] pl-1.5 pr-2 text-[11px]" : "py-[3px] pl-2 pr-2.5 text-[12px]"}`}
      style={{ background: m.soft, color: m.ink }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

export function EngagementBadge({
  type,
  size = "sm",
}: {
  type: V2ProjectEngagementType;
  size?: "sm" | "md";
}) {
  if (type !== "retainer") return null;
  const isSm = size === "sm";
  return (
    <span
      className={`v2-tight inline-flex items-center gap-1 rounded-md bg-violet-50 font-medium text-violet-700 ${isSm ? "px-1.5 py-[2px] text-[10.5px]" : "px-1.5 py-[2px] text-[11.5px]"}`}
    >
      Постоянный
    </span>
  );
}

export function HealthDot({
  health,
  withLabel = false,
}: {
  health: keyof typeof HEALTH_META;
  withLabel?: boolean;
}) {
  const m = HEALTH_META[health] ?? HEALTH_META.on_track;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: m.dot }}>
        {health === "critical" ? (
          <span className="v2-livedot absolute inset-0 rounded-full" style={{ color: m.dot }} />
        ) : null}
      </span>
      {withLabel ? <span className="v2-tight text-[11.5px] text-[var(--v2-ink-500)]">{m.label}</span> : null}
    </span>
  );
}

export function PriorityDot({ priority }: { priority: keyof typeof PRIORITY_META }) {
  const m = PRIORITY_META[priority];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.dot }} />
      <span className="v2-tight text-[12px] text-[var(--v2-ink-600)]">{m.label}</span>
    </span>
  );
}

export function MemberAvatar({
  member,
  size = 24,
  ring = "ring-white",
}: {
  member: PortfolioMember;
  size?: number;
  ring?: string;
}) {
  const fontSize = Math.round(size * 0.42);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ${ring}`}
      style={{ width: size, height: size, background: member.gradient, fontSize }}
      title={member.name}
    >
      {member.initials}
    </span>
  );
}

export function AvatarStack({
  members,
  size = 26,
  max = 4,
}: {
  members: PortfolioMember[];
  size?: number;
  max?: number;
}) {
  const visible = members.slice(0, max);
  const rest = members.length - visible.length;
  return (
    <div className="flex items-center">
      {visible.map((m, i) => (
        <div key={m.userId} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i }} className="relative">
          <MemberAvatar member={m} size={size} />
        </div>
      ))}
      {rest > 0 ? (
        <div style={{ marginLeft: -8 }} className="inline-flex items-center justify-center rounded-full bg-[var(--v2-ink-100)] font-semibold text-[var(--v2-ink-700)] ring-2 ring-white">
          <span className="inline-flex items-center justify-center text-[10.5px]" style={{ width: size, height: size }}>
            +{rest}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function ProgressBar({
  pct,
  status,
  height = 6,
}: {
  pct: number;
  status: keyof typeof STATUS_META;
  height?: number;
}) {
  const isPaused = status === "paused";
  const isDone = status === "done" || status === "done_unpaid";
  return (
    <div
      className={`relative w-full overflow-hidden rounded-full ${isPaused ? "bg-[var(--v2-ink-100)]/60" : "bg-[var(--v2-ink-100)]"}`}
      style={{ height }}
    >
      {isPaused ? (
        <div className="v2-stripes h-full rounded-full opacity-70" style={{ width: `${pct * 100}%` }} />
      ) : (
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct * 100}%`,
            background: isDone
              ? "linear-gradient(90deg,#10B981,#059669)"
              : status === "review"
                ? "linear-gradient(90deg,#F59E0B,#D97706)"
                : "linear-gradient(90deg,#3B6FF7,#2A56EB)",
            transition: "width .9s cubic-bezier(.2,.7,.2,1)",
          }}
        />
      )}
    </div>
  );
}

export function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  const pct = budget > 0 ? Math.min(spent / budget, 1.2) : 0;
  const over = spent > budget;
  return (
    <div className="relative h-[6px] w-full overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(pct, 1) * 100}%`,
          background: over ? "#EF4444" : pct > 0.85 ? "#F59E0B" : "#3B6FF7",
          transition: "width .9s cubic-bezier(.2,.7,.2,1)",
        }}
      />
    </div>
  );
}

export function IconBtn({
  children,
  onClick,
  title,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--v2-ink-500)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)] ${className}`}
    >
      {children}
    </button>
  );
}

export function rolesSummaryFromHours(
  members: PortfolioMember[],
  hoursByMember: Record<string, number>
): string[] {
  const entries = members
    .map((m) => ({ name: m.name.split(" ")[0], hours: hoursByMember[m.userId] ?? 0 }))
    .filter((e) => e.hours > 0)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 3);
  return entries.map((e) => `${e.name?.toLowerCase() ?? ""} ${Math.round(e.hours)}ч`);
}
