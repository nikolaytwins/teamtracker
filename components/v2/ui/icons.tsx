import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export const V2Icons = {
  play: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M8 5.5c0-.8.86-1.3 1.55-.91l9.04 5.5a1.06 1.06 0 0 1 0 1.82l-9.04 5.5C8.86 17.8 8 17.3 8 16.5v-11Z" />
    </svg>
  ),
  pause: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <rect x="6.5" y="5" width="4" height="14" rx="1.3" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.3" />
    </svg>
  ),
  stop: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  ),
  plus: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  chev: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="m8 10 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  clock: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8v4.2l2.6 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  chat: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M5 5h14a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H10l-4 3.2V16.5H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export const PRIORITY_META = {
  urgent: { label: "Срочно", dot: "#EF4444" },
  high: { label: "Высокий", dot: "#F59E0B" },
  medium: { label: "Средний", dot: "#3B6FF7" },
  low: { label: "Низкий", dot: "#A1A1AA" },
} as const;
