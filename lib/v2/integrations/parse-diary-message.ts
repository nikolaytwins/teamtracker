const HASHTAG_RE = /#([\w\u0400-\u04FF-]+)/gu;

function extractHashtags(line: string): string[] {
  const tags: string[] = [];
  for (const match of line.matchAll(HASHTAG_RE)) {
    const tag = match[1]?.trim().toLowerCase();
    if (tag) tags.push(tag);
  }
  return tags;
}

function isHashtagOnlyLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const tags = extractHashtags(trimmed);
  if (tags.length === 0) return false;
  const remainder = trimmed.replace(HASHTAG_RE, "").trim();
  return !remainder;
}

/** Текст заметки + теги с нижней строки (или нескольких строк) вида `#tag #tag2`. */
export function parseDiaryMessage(raw: string): { body: string; tagNames: string[] } {
  const text = String(raw ?? "").trim();
  if (!text) return { body: "", tagNames: [] };

  const lines = text.split("\n");
  const tagNames: string[] = [];

  while (lines.length > 0) {
    const line = lines[lines.length - 1] ?? "";
    if (!line.trim()) {
      lines.pop();
      continue;
    }
    if (!isHashtagOnlyLine(line)) break;
    tagNames.unshift(...extractHashtags(line));
    lines.pop();
  }

  const uniqueTags = [...new Set(tagNames)];
  return { body: lines.join("\n").trim(), tagNames: uniqueTags };
}
