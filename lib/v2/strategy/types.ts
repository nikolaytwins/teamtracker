export type StrategyArticleTag = "work" | "personal" | "sport";

export type StrategyArticleMeta = {
  slug: string;
  title: string;
  tag: StrategyArticleTag;
  excerpt: string;
  cover: string;
  source?: string;
};

export type StrategyArticle = StrategyArticleMeta & {
  body: string;
};

export type StrategyPinRow = {
  id: string;
  user_id: string;
  month_label: string;
  title: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const STRATEGY_TAG_META: Record<
  StrategyArticleTag,
  { label: string; tint: string; soft: string }
> = {
  work: { label: "Работа", tint: "#2A56EB", soft: "#E7EDFD" },
  personal: { label: "Личная жизнь", tint: "#C2410C", soft: "#FFF7ED" },
  sport: { label: "Спорт", tint: "#059669", soft: "#ECFDF5" },
};

export const DEFAULT_STRATEGY_PINS: { month_label: string; title: string }[] = [
  { month_label: "Август", title: "Завершение обязательств по курсу и продукту" },
  {
    month_label: "Сентябрь",
    title: "Реструктуризация агентства (тимтрекер, тендеры, подписки, реактивация базы)",
  },
  {
    month_label: "Сентябрь",
    title: "Запуск инстаграма (рилсы на лидмагниты + карусели с сохраненных)",
  },
  {
    month_label: "Октябрь",
    title: "Запуск продукта: протестируй подходит ли тебе профессия ИИ-креатора за 5499 рублей",
  },
];

export function isStrategyArticleTag(v: unknown): v is StrategyArticleTag {
  return v === "work" || v === "personal" || v === "sport";
}
