export type ManifestBlock =
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "todo"; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "table"; head: [string, string]; rows: [string, string][] };

export type ManifestChapter = {
  id: string;
  index: number;
  title: string;
  blocks: ManifestBlock[];
};

export type ManifestDoc = {
  title: string;
  lead: string;
  vision: { intro: string; items: string[]; outro: string };
  howTo: { title: string; blocks: ManifestBlock[] };
  chapters: ManifestChapter[];
};

export function slugifyManifestHeading(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

/** «II. РАЗРЫВ: СТАРАЯ ЖИЗНЬ» → «Разрыв: старая жизнь» */
export function humanizeManifestTitle(raw: string): string {
  const cleaned = raw.replace(/^[ivxlc]+\.\s*/i, "").trim();
  const lower = cleaned.toLocaleLowerCase("ru");
  return lower.charAt(0).toLocaleUpperCase("ru") + lower.slice(1);
}
