import * as chrono from "chrono-node";
import * as ruChrono from "chrono-node/ru";

export type ParsedQuickTask = {
  title: string;
  deadlineAt: string | null;
};

export function parseQuickTaskInput(raw: string, refDate: Date = new Date()): ParsedQuickTask {
  const text = raw.trim();
  if (!text) return { title: "", deadlineAt: null };

  const results = ruChrono.parse(text, refDate, { forwardDate: true });
  if (results.length === 0) {
    const fallback = chrono.parse(text, refDate, { forwardDate: true });
    if (fallback.length === 0) return { title: text, deadlineAt: null };
    return extract(fallback[0]!, text);
  }
  return extract(results[0]!, text);
}

function extract(best: chrono.ParsedResult, text: string): ParsedQuickTask {
  let title = text;
  if (best.index != null && best.text) {
    title = (text.slice(0, best.index) + text.slice(best.index + best.text.length)).replace(/\s+/g, " ").trim();
  }
  if (!title) title = text;
  return { title, deadlineAt: best.start.date().toISOString() };
}
