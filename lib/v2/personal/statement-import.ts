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
    .replace(/\u2212/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\b(RUB|USD|EUR|RUR)\b/gi, "")
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
  const normalized = csv.replace(/^\uFEFF/, "").trim();
  const rows = parseCsvRows(normalized);
  if (rows.length === 0) {
    return { bank: "generic", operations, skipped, warnings: ["Пустой CSV"] };
  }

  const headerIdx = rows.findIndex((row) => isHeaderRow(row));
  const header = headerIdx >= 0 ? rows[headerIdx] : null;
  const dataRows = headerIdx >= 0 ? rows.slice(headerIdx + 1) : rows;
  const columns = header ? mapCsvColumns(header) : null;

  for (const parts of dataRows) {
    if (!parts.length || parts.every((p) => !p.trim())) continue;
    if (isHeaderRow(parts)) continue;

    let dateRaw = "";
    let timeRaw: string | null = null;
    let descRaw = "";
    let amountRaw = "";
    let cardRaw: string | null = null;

    if (columns && columns.date >= 0 && columns.amount >= 0) {
      dateRaw = pickField(parts, columns.date) ?? "";
      timeRaw = extractTimeFromDate(dateRaw);
      descRaw = pickField(parts, columns.description) ?? "";
      amountRaw = pickField(parts, columns.amount) ?? "";
      cardRaw = columns.card >= 0 ? pickField(parts, columns.card) : null;
    } else if (parts.length >= 3) {
      dateRaw = parts[0]?.trim() ?? "";
      timeRaw = extractTimeFromDate(dateRaw);
      descRaw = parts.slice(1, -1).join(" ").trim();
      amountRaw = parts[parts.length - 1]?.trim() ?? "";
    } else {
      skipped++;
      continue;
    }

    dateRaw = dateRaw.trim().replace(/^"|"$/g, "");
    amountRaw = amountRaw.trim().replace(/^"|"$/g, "");
    descRaw = descRaw.trim().replace(/^"|"$/g, "");

    let iso: string | null = null;
    if (/^\d{2}\.\d{2}\.\d{4}/.test(dateRaw)) iso = dmyToIso(dateRaw.slice(0, 10));
    else if (/^\d{4}-\d{2}-\d{2}/.test(dateRaw)) iso = dateRaw.slice(0, 10);

    const amount = parseMoneyRub(amountRaw);
    if (!iso || amount == null || amount === 0) {
      skipped++;
      if (dateRaw || amountRaw) warnings.push(`CSV: ${[dateRaw, descRaw, amountRaw].filter(Boolean).join(" · ").slice(0, 80)}`);
      continue;
    }

    const cleaned = cleanDescription(descRaw || "Операция");
    const card_last4 =
      cardRaw && /\d{4}/.test(cardRaw)
        ? (cardRaw.match(/(\d{4})\s*$/)?.[1] ?? null)
        : cleaned.card_last4;

    operations.push({
      date: iso,
      time: timeRaw,
      amount_rub: Math.abs(amount),
      txn_type: amount < 0 ? "expense" : "income",
      description: cleaned.description,
      card_last4,
      external_id: makeExternalId({ date: iso, time: timeRaw, amount, description: cleaned.description }),
      raw_line: parts.join(";"),
    });
  }

  const bank =
    header && columns && columns.amount >= 0 && /дата операции|сумма операции|tbank|tinkoff/i.test(normalized)
      ? "tbank"
      : "generic";

  return { bank, operations, skipped, warnings: warnings.slice(0, 20) };
}

export function looksLikeBankCsv(text: string): boolean {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, "").trim());
  const first = rows[0];
  if (!first?.length) return false;
  if (isHeaderRow(first)) return true;
  const dateCell = first[0]?.trim() ?? "";
  return first.length >= 3 && (/^\d{2}\.\d{2}\.\d{4}/.test(dateCell) || /^\d{4}-\d{2}-\d{2}/.test(dateCell));
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  for (const line of csv.split(/\r?\n/)) {
    if (!line.trim()) continue;
    rows.push(parseCsvLine(line));
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const delimiter = detectCsvDelimiter(line);
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      result.push(stripCsvCell(current));
      current = "";
      continue;
    }
    current += ch;
  }

  result.push(stripCsvCell(current));
  return result;
}

function stripCsvCell(value: string): string {
  return value.trim().replace(/^"|"$/g, "").trim();
}

function detectCsvDelimiter(line: string): ";" | "\t" | "," {
  const semicolons = (line.match(/;/g) ?? []).length;
  const tabs = (line.match(/\t/g) ?? []).length;
  const commas = (line.match(/,/g) ?? []).length;
  if (semicolons >= tabs && semicolons >= commas && semicolons > 0) return ";";
  if (tabs >= commas && tabs > 0) return "\t";
  return ",";
}

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/ё/g, "е")
    .trim();
}

function isHeaderRow(parts: string[]): boolean {
  const joined = normalizeHeader(parts.join(" "));
  if (!joined) return false;
  if (DATE_START.test(parts[0]?.trim() ?? "")) return false;
  return (
    /(дата операции|дата проведения|date|описание|description|сумма операции|amount|номер карты)/.test(
      joined
    ) && !/^\d{4}-\d{2}-\d{2}/.test(parts[0]?.trim() ?? "")
  );
}

function mapCsvColumns(header: string[]): {
  date: number;
  amount: number;
  description: number;
  card: number;
} {
  const idx = (patterns: RegExp[]) =>
    header.findIndex((cell) => {
      const h = normalizeHeader(cell);
      return patterns.some((p) => p.test(h));
    });

  const date =
    idx([/^дата операции$/, /^operation date$/, /^date$/, /^дата$/]) >= 0
      ? idx([/^дата операции$/, /^operation date$/, /^date$/, /^дата$/])
      : idx([/дата/]);

  const amount = idx([
    /^сумма операции$/,
    /^сумма операции в валюте счета$/,
    /^сумма в валюте счета$/,
    /^amount$/,
    /^сумма$/,
  ]);

  const description = idx([
    /^описание операции$/,
    /^описание$/,
    /^description$/,
    /^назначение платежа$/,
    /^merchant$/,
  ]);

  const card = idx([/^номер карты$/, /^card$/, /^карта$/]);

  return { date, amount, description, card };
}

function pickField(parts: string[], index: number): string | null {
  if (index < 0 || index >= parts.length) return null;
  const value = parts[index]?.trim();
  return value ? value : null;
}

function extractTimeFromDate(value: string): string | null {
  const match = /(\d{2}:\d{2})/.exec(value);
  return match?.[1] ?? null;
}

/** Decode bank statement bytes (UTF-8/UTF-16/Windows-1251). */
export function decodeStatementBytes(buf: Buffer): string {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.subarray(3).toString("utf-8").replace(/^\uFEFF/, "");
  }
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.subarray(2).toString("utf16le").replace(/^\uFEFF/, "");
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.alloc(buf.length - 2);
    for (let i = 2; i + 1 < buf.length; i += 2) {
      swapped[i - 2] = buf[i + 1];
      swapped[i - 1] = buf[i];
    }
    return swapped.toString("utf16le").replace(/^\uFEFF/, "");
  }

  const utf8 = buf.toString("utf-8").replace(/^\uFEFF/, "");
  if (!utf8.includes("\ufffd") && /[А-Яа-яЁё]/.test(utf8.slice(0, 2000))) return utf8;

  try {
    const win1251 = new TextDecoder("windows-1251").decode(buf);
    if (/[А-Яа-яЁё]/.test(win1251.slice(0, 2000))) return win1251.replace(/^\uFEFF/, "");
  } catch {
    /* ignore */
  }

  return utf8;
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
