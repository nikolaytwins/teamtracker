import fs from "fs";
import path from "path";
import {
  humanizeManifestTitle,
  slugifyManifestHeading,
  type ManifestBlock,
  type ManifestChapter,
  type ManifestDoc,
} from "@/lib/v2/personal/manifest-shared";

export type {
  ManifestBlock,
  ManifestChapter,
  ManifestDoc,
} from "@/lib/v2/personal/manifest-shared";

const MANIFEST_PATH = path.join(process.cwd(), "content/manifest/novoi-zhizni.md");

const HR = /^-{3,}$/;
const BULLET = /^[-*]\s+(.*)$/;
const TODO = /^[-*]\s+\[[ xX]\]\s*(.*)$/;
const NUMBERED = /^\d+\.\s+(.*)$/;

function isBlockStart(line: string): boolean {
  return (
    !line ||
    HR.test(line) ||
    line.startsWith("#") ||
    line.startsWith(">") ||
    line.startsWith("|") ||
    BULLET.test(line) ||
    NUMBERED.test(line)
  );
}

function parseBlocks(lines: string[]): ManifestBlock[] {
  const blocks: ManifestBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!.trim();

    if (!line || HR.test(line)) {
      i += 1;
      continue;
    }

    const h3 = /^###\s+(.+)$/.exec(line);
    if (h3) {
      blocks.push({ kind: "h3", text: h3[1]!.trim() });
      i += 1;
      continue;
    }

    const h2 = /^##\s+(.+)$/.exec(line);
    if (h2) {
      blocks.push({ kind: "h2", text: h2[1]!.trim() });
      i += 1;
      continue;
    }

    if (line.startsWith(">")) {
      const parts: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith(">")) {
        const text = lines[i]!.trim().replace(/^>\s?/, "").trim();
        if (text) parts.push(text);
        i += 1;
      }
      if (parts.length) blocks.push({ kind: "quote", text: parts.join(" ") });
      continue;
    }

    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.trim().startsWith("|")) {
        const cells = lines[i]!
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
        const isDivider = cells.every((c) => /^:?-{2,}:?$/.test(c));
        if (!isDivider) rows.push(cells);
        i += 1;
      }
      if (rows.length > 1) {
        const head = rows[0]!;
        blocks.push({
          kind: "table",
          head: [head[0] ?? "", head[1] ?? ""],
          rows: rows.slice(1).map((r) => [r[0] ?? "", r[1] ?? ""] as [string, string]),
        });
      }
      continue;
    }

    if (TODO.test(line)) {
      const items: string[] = [];
      while (i < lines.length && TODO.test(lines[i]!.trim())) {
        items.push(TODO.exec(lines[i]!.trim())![1]!.trim());
        i += 1;
      }
      blocks.push({ kind: "todo", items });
      continue;
    }

    if (BULLET.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const cur = lines[i]!.trim();
        if (!BULLET.test(cur) || TODO.test(cur)) break;
        items.push(BULLET.exec(cur)![1]!.trim().replace(/[;.]$/, ""));
        i += 1;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    if (NUMBERED.test(line)) {
      const items: string[] = [];
      while (i < lines.length && NUMBERED.test(lines[i]!.trim())) {
        items.push(NUMBERED.exec(lines[i]!.trim())![1]!.trim().replace(/[;.]$/, ""));
        i += 1;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && !isBlockStart(lines[i]!.trim())) {
      paragraph.push(lines[i]!.trim());
      i += 1;
    }
    if (paragraph.length) blocks.push({ kind: "p", text: paragraph.join(" ") });
  }

  return blocks;
}

function splitIntroAndChapters(lines: string[]): { intro: string[]; chapters: { title: string; lines: string[] }[] } {
  const intro: string[] = [];
  const chapters: { title: string; lines: string[] }[] = [];
  let current: { title: string; lines: string[] } | null = null;

  for (const line of lines) {
    const h1 = /^#\s+(.+)$/.exec(line.trim());
    if (h1) {
      current = { title: h1[1]!.trim(), lines: [] };
      chapters.push(current);
      continue;
    }
    (current ? current.lines : intro).push(line);
  }

  return { intro, chapters };
}

export function loadManifestDoc(): ManifestDoc {
  const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
  const allLines = raw.split("\n");

  let title = "Манифест новой жизни";
  const titleLine = allLines.findIndex((l) => /^#\s+.*манифест/i.test(l.trim()));
  if (titleLine >= 0) {
    title = /^#\s+(.+)$/.exec(allLines[titleLine]!.trim())![1]!.trim();
    allLines.splice(titleLine, 1);
  }

  const { intro, chapters: rawChapters } = splitIntroAndChapters(allLines);

  const howToAt = intro.findIndex((l) => /^##\s+Как пользоваться/i.test(l.trim()));
  const visionLines = howToAt >= 0 ? intro.slice(0, howToAt) : intro;
  const howToLines = howToAt >= 0 ? intro.slice(howToAt) : [];

  const visionBlocks = parseBlocks(visionLines);
  const lead = visionBlocks.find((b) => b.kind === "quote")?.text ?? "";
  const visionList = visionBlocks.find((b) => b.kind === "ul");
  const visionParagraphs = visionBlocks.filter((b) => b.kind === "p");

  const howToBlocks = parseBlocks(howToLines);
  const howToTitle =
    howToBlocks[0]?.kind === "h2" ? howToBlocks[0].text : "Как пользоваться этим манифестом";

  const chapters: ManifestChapter[] = rawChapters.map((c, i) => ({
    id: slugifyManifestHeading(c.title),
    index: i + 1,
    title: humanizeManifestTitle(c.title),
    blocks: parseBlocks(c.lines),
  }));

  return {
    title: humanizeManifestTitle(title),
    lead,
    vision: {
      intro: visionParagraphs[0]?.kind === "p" ? visionParagraphs[0].text : "",
      items: visionList?.kind === "ul" ? visionList.items : [],
      outro: visionParagraphs[1]?.kind === "p" ? visionParagraphs[1].text : "",
    },
    howTo: {
      title: howToTitle,
      blocks: howToBlocks.filter((b) => b.kind !== "h2"),
    },
    chapters,
  };
}
