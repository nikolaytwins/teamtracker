const MONTHS: Record<string, number> = {
  январ: 1,
  феврал: 2,
  март: 3,
  апрел: 4,
  ма: 5,
  июн: 6,
  июл: 7,
  август: 8,
  сентябр: 9,
  октябр: 10,
  ноябр: 11,
  декабр: 12,
};

export type ParsedProjectQuery = {
  priceRub: number | null;
  hours: number | null;
  deadline: Date | null;
  isTakeQuestion: boolean;
  isUrgent: boolean;
  isReplan: boolean;
  isNowQuestion: boolean;
  isCapacityQuestion: boolean;
};

function parsePrice(text: string): number | null {
  const m = text.match(/(\d[\d\s]{2,})\s*₽/);
  if (m) return Number(m[1]!.replace(/\s/g, ""));
  const m2 = text.match(/(?:за|бюджет|цен[ае])\s*(\d[\d\s]{2,})/i);
  if (m2) return Number(m2[1]!.replace(/\s/g, ""));
  return null;
}

function parseHours(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:час|ч\b|h\b)/i);
  if (m) return Math.round(parseFloat(m[1]!.replace(",", ".")));
  return null;
}

function parseDeadline(text: string, now: Date): Date | null {
  const dm = text.match(/(\d{1,2})\s*(январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр)\w*/i);
  if (dm) {
    const day = Number(dm[1]);
    const monthKey = Object.keys(MONTHS).find((k) => dm[2]!.toLowerCase().startsWith(k));
    if (!monthKey) return null;
    const month = MONTHS[monthKey]!;
    let year = now.getFullYear();
    const candidate = new Date(year, month - 1, day);
    if (candidate < now) year += 1;
    return new Date(year, month - 1, day);
  }
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00`);
  return null;
}

export function parseProjectQuery(text: string, now = new Date()): ParsedProjectQuery {
  const lower = text.toLowerCase();
  return {
    priceRub: parsePrice(text),
    hours: parseHours(text),
    deadline: parseDeadline(text, now),
    isTakeQuestion: /брать|можно\s+брать|взять\s+проект|новый\s+проект/i.test(text),
    isUrgent: /срочн|форс|сломал|горит|сегодня/i.test(text),
    isReplan: /перестро|переплан|перенест/i.test(text),
    isNowQuestion: /что\s+делать|с\s+чего\s+начать|сейчас\s+делать/i.test(text),
    isCapacityQuestion: /можно\s+брать|есть\s+место|загрузк|свободн/i.test(text),
  };
}
