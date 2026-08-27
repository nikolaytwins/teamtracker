export const OBSERVATION_TYPES = [
  "loop",
  "chance",
  "market",
  "magnet",
  "person",
  "pattern",
  "place",
  "love",
  "other",
  "conclusion",
] as const;

export type ObservationType = (typeof OBSERVATION_TYPES)[number];

export const OBSERVATION_TYPE_META: Record<
  ObservationType,
  { emoji: string; label: string; short: string; tint: string; bg: string; border: string }
> = {
  loop: { emoji: "🔥", label: "Само возвращается", short: "Само возвращается", tint: "#C2410C", bg: "#FFF1E8", border: "#FBD9C4" },
  chance: { emoji: "💡", label: "Возможность", short: "Возможности", tint: "#A16207", bg: "#FEF7E0", border: "#F6E4AE" },
  market: { emoji: "📈", label: "Сигнал рынка", short: "Рынок", tint: "#0E7490", bg: "#E6F6FA", border: "#BFE6EF" },
  magnet: { emoji: "🧲", label: "Магнит", short: "Магнит", tint: "#7C3AED", bg: "#F3EDFF", border: "#DCCCFB" },
  person: { emoji: "👤", label: "Человек", short: "Люди", tint: "#2A56EB", bg: "#EFF4FF", border: "#CDDCFE" },
  pattern: { emoji: "🧠", label: "Паттерн", short: "Паттерны", tint: "#047857", bg: "#E7F6F0", border: "#C2E7DA" },
  place: { emoji: "🌍", label: "Среда", short: "Среда", tint: "#4D7C0F", bg: "#F1F7E4", border: "#DCE9BE" },
  love: { emoji: "❤️", label: "Отношения", short: "Отношения", tint: "#BE185D", bg: "#FDECF3", border: "#F8CEDF" },
  other: { emoji: "✦", label: "Другое", short: "Другое", tint: "#52525B", bg: "#F2F2F4", border: "#E1E1E6" },
  conclusion: { emoji: "◆", label: "Вывод", short: "Выводы", tint: "#1F3AAF", bg: "#EFF4FF", border: "#CDDCFE" },
};

export const OBSERVATION_FILTER_TYPES: ObservationType[] = [
  "loop",
  "chance",
  "market",
  "magnet",
  "person",
  "pattern",
  "place",
];

export const OBSERVATION_LINKS: Record<string, { label: string; kind: string }> = {
  qmagic: { label: "Qmagic", kind: "проект" },
  hypeman: { label: "HypeMan", kind: "проект" },
  arkalium: { label: "Аркалиум", kind: "проект" },
  brand: { label: "Личный бренд", kind: "бренд" },
  saas: { label: "SaaS-гипотезы", kind: "saas" },
  code: { label: "Мой код", kind: "паттерн" },
  wish: { label: "Желания", kind: "желание" },
};

export function isObservationType(v: string): v is ObservationType {
  return (OBSERVATION_TYPES as readonly string[]).includes(v);
}
