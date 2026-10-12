export const WISH_STATUSES = ["want", "saving", "done"] as const;
export type WishStatus = (typeof WISH_STATUSES)[number];

export const WISH_STATUS_LABEL: Record<WishStatus, string> = {
  want: "Хочу",
  saving: "Коплю",
  done: "Исполнено",
};

export const WISH_TIERS = [
  { id: "t1", max: 100_000, limit: 50, name: "До 100 тр", title: "до 100 000 ₽" },
  { id: "t2", max: 300_000, limit: 30, name: "До 300 тр", title: "до 300 000 ₽" },
  { id: "t3", max: 500_000, limit: 20, name: "До 500 тр", title: "до 500 000 ₽" },
  { id: "t4", max: 1_000_000, limit: 10, name: "До 1 млн", title: "до 1 000 000 ₽" },
  { id: "t5", max: 3_000_000, limit: 5, name: "До 3 млн", title: "до 3 000 000 ₽" },
  { id: "t6", max: 50_000_000, limit: 3, name: "До 50 млн", title: "до 50 000 000 ₽" },
] as const;

export type WishTier = (typeof WISH_TIERS)[number];

export type WishlistSeed = { title: string; price_rub: number; status: WishStatus; saved_rub?: number };

export const WISHLIST_SEED: WishlistSeed[] = [
  { title: "Кабаре в ноябре", price_rub: 15_000, status: "saving", saved_rub: 15_000 },
  { title: "Красивый отель на выходные с Лерой", price_rub: 40_000, status: "want" },
  { title: "Очки в хорошей оправе", price_rub: 35_000, status: "done" },
  { title: "Абонемент в бассейн на год", price_rub: 50_000, status: "want" },
  { title: "Наушники", price_rub: 30_000, status: "saving", saved_rub: 12_000 },
  { title: "Подарок Лере без повода", price_rub: 60_000, status: "want" },
  { title: "Фотосессия для бренда", price_rub: 25_000, status: "want" },
  { title: "Москва", price_rub: 250_000, status: "saving", saved_rub: 90_000 },
  { title: "Китай", price_rub: 300_000, status: "saving", saved_rub: 45_000 },
  { title: "MacBook Pro", price_rub: 260_000, status: "want" },
  { title: "Неделя в Стамбуле вдвоём", price_rub: 180_000, status: "want" },
  { title: "Путешествие в Японию вдвоём", price_rub: 450_000, status: "want" },
  { title: "Студия для съёмки", price_rub: 400_000, status: "want" },
  { title: "Месяц у океана", price_rub: 900_000, status: "want" },
  { title: "Машина, в которую хочется садиться просто так", price_rub: 2_800_000, status: "want" },
  { title: "Дом с большими окнами у воды", price_rub: 45_000_000, status: "want" },
];

export type WishItem = {
  id: string;
  title: string;
  price_rub: number;
  saved_rub: number;
  status: WishStatus;
  note: string;
  prev_status: "want" | "saving" | null;
  done_at: string | null;
  sort_order: number;
};

export function isWishStatus(value: string): value is WishStatus {
  return (WISH_STATUSES as readonly string[]).includes(value);
}

export function wishTier(price: number): WishTier {
  const amount = Math.max(0, price || 0);
  return WISH_TIERS.find((tier) => amount <= tier.max) ?? WISH_TIERS[WISH_TIERS.length - 1]!;
}

export function wishSeatLimit() {
  return WISH_TIERS.reduce((sum, tier) => sum + tier.limit, 0);
}

export function wishPlacesLeft(count: number) {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n1 === 1 && n !== 11) return "место";
  if (n1 >= 2 && n1 <= 4 && (n < 10 || n >= 20)) return "места";
  return "мест";
}

export function shortRub(value: number) {
  const amount = Math.max(0, value || 0);
  if (amount >= 1_000_000) {
    const millions = Math.round((amount / 1_000_000) * 10) / 10;
    return `${String(millions).replace(".", ",")} млн`;
  }
  if (amount >= 1_000) return `${Math.round(amount / 1_000)} тр`;
  return `${amount} ₽`;
}

const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const MONTHS_LONG = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

export function wishDateShort(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function wishDateLong(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "дата не отмечена";
  return `${date.getDate()} ${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}
