"use client";

import { userInitials } from "@/lib/v2/format";

export type V2ShellUser = {
  id: string;
  name: string;
  login?: string;
  title?: string;
  avatarUrl?: string | null;
};

function UserAvatar({ user, size = 36 }: { user: V2ShellUser; size?: number }) {
  const px = `${size}px`;
  if (user.avatarUrl?.trim()) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className="shrink-0 rounded-full object-cover ring-2 ring-white"
        style={{ width: px, height: px }}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--v2-brand-400)] to-[var(--v2-brand-600)] font-semibold text-white ring-2 ring-white"
      style={{ width: px, height: px, fontSize: size <= 32 ? "12.5px" : "13px" }}
    >
      {userInitials(user.name)}
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[var(--v2-ink-800)] transition hover:bg-[var(--v2-ink-50)]"
    >
      <span className="text-[var(--v2-ink-500)]">{children}</span>
      {label}
    </button>
  );
}

export function V2UserAccountMenu({
  user,
  roleLabel,
  compact = false,
  onOpenProfile,
  onLogout,
}: {
  user: V2ShellUser;
  roleLabel: string;
  compact?: boolean;
  onOpenProfile: () => void;
  onLogout: () => void | Promise<void>;
}) {
  return (
    <div className={`group/user-menu relative ${compact ? "flex justify-center" : ""}`}>
      <div
        className={`cursor-default transition ${
          compact
            ? "rounded-xl p-1 hover:bg-[var(--v2-ink-50)]"
            : "rounded-2xl border border-[var(--v2-ink-100)] bg-white p-2.5 shadow-[var(--v2-shadow-card)] hover:border-[var(--v2-ink-200)]"
        }`}
        aria-label="Меню профиля"
        aria-haspopup="menu"
      >
        <div className={`flex items-center ${compact ? "justify-center" : "gap-2.5"}`}>
          <UserAvatar user={user} size={compact ? 32 : 36} />
          {!compact ? (
            <div className="min-w-0 flex-1 text-left leading-tight">
              <div className="v2-tight truncate text-[13px] font-semibold text-[var(--v2-ink-900)]">{user.name}</div>
              <div className="truncate text-[11px] text-[var(--v2-ink-500)]">{user.title?.trim() || roleLabel}</div>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={`pointer-events-none absolute bottom-full z-[85] flex opacity-0 invisible transition-opacity duration-150 group-hover/user-menu:pointer-events-auto group-hover/user-menu:visible group-hover/user-menu:opacity-100 group-focus-within/user-menu:pointer-events-auto group-focus-within/user-menu:visible group-focus-within/user-menu:opacity-100 ${
          compact ? "left-1/2 w-max -translate-x-1/2 pb-1.5" : "left-0 right-0 pb-1.5"
        }`}
      >
        <div
          role="menu"
          aria-label="Профиль"
          className="min-w-[9.5rem] overflow-hidden rounded-xl border border-[var(--v2-ink-100)] bg-white py-1 shadow-[var(--v2-shadow-pop)]"
        >
          <MenuItem label="Профиль" onClick={onOpenProfile}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </MenuItem>
          <MenuItem label="Выйти" onClick={() => void onLogout()}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </MenuItem>
        </div>
      </div>
    </div>
  );
}
