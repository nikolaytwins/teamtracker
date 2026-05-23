"use client";

export function ProjectChip({
  name,
  short,
  bg,
  tint,
}: {
  name: string;
  short?: string | null;
  bg?: string | null;
  tint?: string | null;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-[12px] shadow-[var(--v2-shadow-card)]">
      <span
        className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] font-semibold"
        style={{ background: bg ?? "#EEE", color: tint ?? "#333" }}
      >
        {short ?? name.slice(0, 1)}
      </span>
      <span className="font-medium tracking-tight">{name}</span>
    </span>
  );
}

export function TimerButton({
  running,
  onClick,
  size = "md",
}: {
  running: boolean;
  onClick: () => void;
  size?: "md" | "lg";
}) {
  const px = size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const ip = size === "lg" ? "h-5 w-5" : "h-[18px] w-[18px]";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={running ? "Пауза" : "Запустить таймер"}
      className={`inline-flex items-center justify-center rounded-full transition-all ${px} ${
        running
          ? "v2-timer-running bg-[var(--v2-brand-600)] text-white shadow-[var(--v2-shadow-glow)]"
          : "bg-white text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] hover:text-[var(--v2-brand-600)]"
      }`}
    >
      {running ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className={ip}>
          <rect x="6.5" y="5" width="4" height="14" rx="1.3" />
          <rect x="13.5" y="5" width="4" height="14" rx="1.3" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" className={`${ip} translate-x-px`}>
          <path d="M8 5.5c0-.8.86-1.3 1.55-.91l9.04 5.5a1.06 1.06 0 0 1 0 1.82l-9.04 5.5C8.86 17.8 8 17.3 8 16.5v-11Z" />
        </svg>
      )}
    </button>
  );
}
