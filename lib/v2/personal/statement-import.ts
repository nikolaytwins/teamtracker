import { createHash } from "crypto";

export type ParsedStatementOp = {
  /** ISO date YYYY-MM-DD */
  date: string;
  /** Optional time HH:MM */
  time: string | null;
  amount_rub: number;
  /** expense | income (transfers from statement are usually expense/income net) */
  txn_type: "expense" | "income";
  description: string;
  card_last4: string | null;
  /** Stable id for dedup */
  external_id: string;
  raw_line: string;
};

export type StatementParseResult = {
  bank: "tbank" | "generic";
  operations: ParsedStatementOp[];
  skipped: number;
  warnings: string[];
};

const DATE_START = /^\d{2}\.\d{2}\.\d{4}/;
const START_MARKERS = ["Движение средств за период", "Операции по карте", "История операций"];
const END_MARKERS = ["Пополнения:", "Итого по операциям", "Всего списано", "Всего зачислено"];
const IGNORE_KEYWORDS = ["АО «ТБанк»", "АО «Т-Банк»", "БИК", "ИНН", "КПП", "лицензия", "Лицензия"];

/** T-Bank cash-flow line: date [time] date [time] amount1 amount2 description */
const TBANK_LINE =
  /^(\d{2}\.\d{2}\.\d{4})(?:\s+(\d{2}:\d{2}))?\s+(\d{2}\.\d{2}\.\d{4})(?:\s+(\d{2}:\d{2}))?\s+([+-]?\d{1,3}(?:[ \u00a0]\d{3})*(?:[.,]\d+)?\s*₽)\s+([+-]?\d{1,3}(?:[ \u00a0]\d{3})*(?:[.,]\d+)?\s*₽)\s+(.+)$/u;

/** Simpler line: date amount description */
const GENERIC_LINE =
  /^(\d{2}\.\d{2}\.\d{4})(?:\s+(\d{2}:\d{2}))?\s+([+-]?\d{1,3}(?:[ \u00a0]\d{3})*(?:[.,]\d+)?(?:\s*₽)?)\s+(.+)$/u;

function parseMoneyRub(raw: string): number | null {
  const cleaned = raw
    .replace(/₽/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s/g, "")
    .replace(",", ".")
    .trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function dmyToIso(dmy: string): string | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(dmy);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

function cleanDescription(description: string): { description: string; card_last4: string | null } {
  let desc = description.trim();
  desc = desc.replace(/\s+\d+\s+Дата и время.*$/i, "");

  let card: string | null = null;
  const strict = [
    /\bна\s+(\d{4})\b/i,
    /\bпо\s+(\d{4})\b/i,
    /\bдля\s+(\d{4})\b/i,
    /\bс\s+(\d{4})\b/i,
    /\*\s*(\d{4})\b/,
  ];
  for (const p of strict) {
    const match = p.exec(desc);
    if (match) {
      card = match[1];
      break;
    }
  }
  if (!card) {
    const loose = /\b(\d{4})\b/.exec(desc);
    if (loose) card = loose[1];
  }
  if (card) desc = desc.replace(new RegExp(`\\b${card}\\b`), "");
  desc = desc.replace(/\b\d{2}:\d{2}\b/g, "");
  desc = desc.replace(/\s+/g, " ").trim();
  return { description: desc || "Операция", card_last4: card };
}

function makeExternalId(parts: {
  date: string;
  time: string | null;
  amount: number;
  description: string;
}): string {
  const raw = `${parts.date}|${parts.time ?? ""}|${parts.amount}|${parts.description}`;
  return createHash("sha1").update(raw).digest("hex").slice(0, 24);
}

function sliceCashFlowSection(text: string): string {
  const lines = text.split(/\r?\n/);
  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (start < 0 && START_MARKERS.some((m) => lines[i].includes(m))) {
      start = i + 1;
      continue;
    }
    if (start >= 0 && END_MARKERS.some((m) => lines[i].includes(m))) {
      end = i;
      break;
    }
  }
  if (start < 0) return text;
  return lines.slice(start, end).join("\n");
}

function mergeMultilineOps(lines: string[]): string[] {
  const merged: string[] = [];
  let current = "";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (IGNORE_KEYWORDS.some((k) => line.includes(k))) continue;
    if (DATE_START.test(line)) {
      if (current) merged.push(current.trim());
      current = line;
    } else if (current) {
      current += ` ${line}`;
    }
  }
  if (current) merged.push(current.trim());
  return merged;
}

function opFromMatch(
  date1: string,
  time1: string | null,
  amountRaw: string,
  descriptionRaw: string,
  rawLine: string
): ParsedStatementOp | null {
  const iso = dmyToIso(date1);
  const amount = parseMoneyRub(amountRaw);
  if (!iso || amount == null || amount === 0) return null;
  const { description, card_last4 } = cleanDescription(descriptionRaw);
  const abs = Math.abs(amount);
  return {
    date: iso,
    time: time1,
    amount_rub: abs,
    txn_type: amount < 0 ? "expense" : "income",
    description,
    card_last4,
    external_id: makeExternalId({
      date: iso,
      time: time1,
      amount,
      description,
    }),
    raw_line: rawLine,
  };
}

/** Parse extracted PDF/plain text from a bank statement. */
export function parseBankStatementText(text: string): StatementParseResult {
  const warnings: string[] = [];
  const section = sliceCashFlowSection(text);
  const merged = mergeMultilineOps(section.split(/\r?\n/));
  const operations: ParsedStatementOp[] = [];
  let skipped = 0;
  let bank: StatementParseResult["bank"] = "generic";

  for (const line of merged) {
    const tbank = TBANK_LINE.exec(line);
    if (tbank) {
      bank = "tbank";
      const op = opFromMatch(
        tbank[1],
        tbank[2] ?? null,
        tbank[6] || tbank[5],
        tbank[7],
        line
      );
      if (op) operations.push(op);
      else {
        skipped++;
        warnings.push(`Не разобрана сумма: ${line.slice(0, 80)}`);
      }
      continue;
    }

    const generic = GENERIC_LINE.exec(line);
    if (generic) {
      const op = opFromMatch(generic[1], generic[2] ?? null, generic[3], generic[4], line);
      if (op) operations.push(op);
      else skipped++;
      continue;
    }

    if (DATE_START.test(line)) {
      skipped++;
      warnings.push(`Не удалось разобрать: ${line.slice(0, 100)}`);
    }
  }

  return { bank, operations, skipped, warnings: warnings.slice(0, 20) };
}

/** Tinkoff / generic CSV: Date;Description;Amount or Date,Description,Amount */
export function parseBankStatementCsv(csv: string): StatementParseResult {
  const warnings: string[] = [];
  const operations: ParsedStatementOp[] = [];
  let skipped = 0;
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());

  for (const line of lines) {
    if (/дата|date|описание|сумма/i.test(line) && !DATE_START.test(line.trim())) continue;
    const parts = line.includes(";") ? line.split(";") : line.split(",");
    if (parts.length < 3) {
      skipped++;
      continue;
    }
    const dateRaw = parts[0].trim().replace(/^"|"$/g, "");
    const descRaw = parts.slice(1, -1).join(" ").trim().replace(/^"|"$/g, "");
    const amountRaw = parts[parts.length - 1].trim().replace(/^"|"$/g, "");
    let iso: string | null = null;
    if (/^\d{2}\.\d{2}\.\d{4}/.test(dateRaw)) iso = dmyToIso(dateRaw.slice(0, 10));
    else if (/^\d{4}-\d{2}-\d{2}/.test(dateRaw)) iso = dateRaw.slice(0, 10);
    const amount = parseMoneyRub(amountRaw);
    if (!iso || amount == null || amount === 0) {
      skipped++;
      warnings.push(`CSV: ${line.slice(0, 80)}`);
      continue;
    }
    const { description, card_last4 } = cleanDescription(descRaw || "Операция");
    operations.push({
      date: iso,
      time: null,
      amount_rub: Math.abs(amount),
      txn_type: amount < 0 ? "expense" : "income",
      description,
      card_last4,
      external_id: makeExternalId({ date: iso, time: null, amount, description }),
      raw_line: line,
    });
  }

  return { bank: "generic", operations, skipped, warnings: warnings.slice(0, 20) };
}

const CATEGORY_HINTS: { keys: string[]; name: string }[] = [
  { name: "Еда", keys: ["пятероч", "перекрест", "магнит", "вкусвилл", "лента", "ашан", "самокат", "яндекс лавка", "ozon fresh", "продукт"] },
  { name: "Кафе", keys: ["кофе", "coffee", "ресторан", "кафе", "бургер", "пицц", "суши", "mcdonald", "kfc", "vkusno"] },
  { name: "Транспорт", keys: ["такси", "яндекс.go", "uber", "метро", "транспорт", "заправ", "азс", "парков", "каршеринг"] },
  { name: "Подписки", keys: ["spotify", "apple.com/bill", "netflix", "youtube", "подписк", "icloud", "yandex plus", "ivi", "кинопоиск"] },
  { name: "Жильё", keys: ["жкх", "квартплат", "аренда", "газпром", "электро", "мосэнерго", "ук ", "жк "] },
];

export function guessBudgetCategoryName(description: string): string | null {
  const d = description.toLowerCase();
  for (const hint of CATEGORY_HINTS) {
    if (hint.keys.some((k) => d.includes(k))) return hint.name;
  }
  return null;
}
