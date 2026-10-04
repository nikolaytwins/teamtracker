export const INBOX_CATEGORY_IDS = ["work", "strat", "life", "create", "backlog"] as const;

export type InboxCategoryId = (typeof INBOX_CATEGORY_IDS)[number];

export type InboxCategory = {
  id: InboxCategoryId;
  label: string;
  description: string;
  color: string;
  bg: string;
  shortcut: string;
  sort_order: number;
};

export const INBOX_CATEGORIES: InboxCategory[] = [
  {
    id: "work",
    label: "Рабочие задачи",
    description: "Текущая работа на неделе",
    color: "#2d5eef",
    bg: "",
    shortcut: "1",
    sort_order: 1,
  },
  {
    id: "strat",
    label: "Стратегический день",
    description: "Решения, системы, продукты",
    color: "oklch(0.58 0.13 262)",
    bg: "oklch(0.962 0.028 262)",
    shortcut: "2",
    sort_order: 2,
  },
  {
    id: "life",
    label: "Жизнь",
    description: "Быт, здоровье, люди, документы",
    color: "oklch(0.58 0.13 155)",
    bg: "oklch(0.965 0.03 155)",
    shortcut: "3",
    sort_order: 3,
  },
  {
    id: "create",
    label: "Творческий день",
    description: "Контент, тексты, дизайн",
    color: "oklch(0.58 0.13 320)",
    bg: "oklch(0.965 0.03 320)",
    shortcut: "4",
    sort_order: 4,
  },
  {
    id: "backlog",
    label: "Бэклог",
    description: "Не в ближайшее время",
    color: "#71717A",
    bg: "",
    shortcut: "5",
    sort_order: 5,
  },
];

const PARSE_TOKENS: Record<string, InboxCategoryId> = {
  раб: "work",
  жизнь: "life",
  личн: "life",
  страт: "strat",
  творч: "create",
  бэклог: "backlog",
  потом: "backlog",
};

export function isInboxCategory(value: unknown): value is InboxCategoryId {
  return typeof value === "string" && (INBOX_CATEGORY_IDS as readonly string[]).includes(value);
}

export function inboxSectionForCategory(category: InboxCategoryId): "inbox" | "later" {
  return category === "backlog" ? "later" : "inbox";
}

export function inboxCategoryFromRow(row: {
  inbox_category?: unknown;
  inbox_section?: unknown;
}): InboxCategoryId {
  if (isInboxCategory(row.inbox_category)) return row.inbox_category;
  return row.inbox_section === "later" ? "backlog" : "work";
}

export function parseInboxCapture(raw: string): {
  title: string;
  dest: InboxCategoryId | "";
  projectHint: string;
  prio: 0 | 1;
} {
  const r: { title: string; dest: InboxCategoryId | ""; projectHint: string; prio: 0 | 1 } = {
    title: raw,
    dest: "",
    projectHint: "",
    prio: 0,
  };
  r.title = raw
    .replace(/#([\wа-яё]+)/gi, (m, w: string) => {
      const key = w.toLowerCase();
      for (const token of Object.keys(PARSE_TOKENS)) {
        if (key.startsWith(token)) {
          r.dest = PARSE_TOKENS[token]!;
          return "";
        }
      }
      return m;
    })
    .replace(/@([\wа-яё]+)/gi, (_m, w: string) => {
      r.projectHint = String(w);
      return "";
    })
    .replace(/(^|\s)!(?=\s|$)/g, () => {
      r.prio = 1;
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();
  return r;
}
