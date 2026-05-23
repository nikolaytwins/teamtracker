import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export const V2Icons = {
  logo: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M4 7.5C4 5.567 5.567 4 7.5 4h9A3.5 3.5 0 0 1 20 7.5v9a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 16.5v-9Z"
        fill="currentColor"
        opacity=".12"
      />
      <path d="M8 8h8M8 12h6M8 16h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  home: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1v-7.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  inbox: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M4 13h4l1.5 3h5L16 13h4M4 13l2.5-6.3A2 2 0 0 1 8.36 5.5h7.28a2 2 0 0 1 1.86 1.2L20 13M4 13v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  ),
  tasks: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8.5 12.2 2.2 2.2L15.8 9.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  cal: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 10h16M8 4v3M16 4v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  team: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="9" cy="9.5" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 19c.6-2.7 2.8-4.3 5.5-4.3s4.9 1.6 5.5 4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16.5" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15.5 14.4c2.6.06 4.4 1.5 5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  reports: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M5 19V9m5 10V5m5 14v-7m5 7v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  clients: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M3 20V8.5l4.5-3 4.5 3 4.5-3 4.5 3V20" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 20v-5h6v5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  search: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m20 20-3.4-3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  bell: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
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
  chev: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="m8 10 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  filter: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  sort: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0 3 3m-3-3-3 3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  more: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
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
  paperclip: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M8 13l6-6a3.5 3.5 0 1 1 5 5L12 19a5.5 5.5 0 0 1-7.8-7.8L11 4.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  spark: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 3.5 13.7 9 19 10.8 13.7 12.6 12 18l-1.7-5.4L5 10.8 10.3 9 12 3.5Z" fill="currentColor" />
    </svg>
  ),
  command: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M9 6h6v6m0 0v6H9v-6m0 0H6a2 2 0 1 1 2-2v8a2 2 0 1 1-2-2h12a2 2 0 1 1-2 2V8a2 2 0 1 1 2 2h-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  plus: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

export const PRIORITY_META = {
  urgent: { label: "Срочно", dot: "#EF4444", soft: "#FEECEC", ink: "#B42318" },
  high: { label: "Высокий", dot: "#F59E0B", soft: "#FEF3D1", ink: "#915E0B" },
  medium: { label: "Средний", dot: "#3B6FF7", soft: "#E6EDFF", ink: "#1F3AAF" },
  low: { label: "Низкий", dot: "#A1A1AA", soft: "#F1F1F4", ink: "#52525B" },
} as const;
