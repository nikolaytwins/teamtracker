import fs from "fs";
import path from "path";

const MANIFEST_PATH = path.join(process.cwd(), "content/manifest/novoi-zhizni.md");

export type ManifestTocItem = {
  id: string;
  label: string;
  short: string;
};

export function slugifyManifestHeading(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

function shortLabel(heading: string): string {
  const cleaned = heading
    .replace(/^[ivxlc]+\.\s*/i, "")
    .replace(/^манифест\s+/i, "")
    .trim();
  if (cleaned.length <= 38) return cleaned;
  return `${cleaned.slice(0, 36).trim()}…`;
}

export function loadManifestSource(): { title: string; body: string; toc: ManifestTocItem[] } {
  const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
  const lines = raw.split("\n");
  let title = "Манифест новой жизни";
  const bodyLines: string[] = [];
  const toc: ManifestTocItem[] = [];
  let skippedTitle = false;

  for (const line of lines) {
    const h1 = /^#\s+(.+)$/.exec(line);
    if (h1) {
      const text = h1[1]!.trim();
      if (!skippedTitle && /манифест/i.test(text)) {
        title = text;
        skippedTitle = true;
        continue;
      }
      toc.push({
        id: slugifyManifestHeading(text),
        label: text,
        short: shortLabel(text),
      });
      bodyLines.push(line);
      continue;
    }
    bodyLines.push(line);
  }

  let body = bodyLines.join("\n");
  const howTo = body.search(/^##\s+Как пользоваться/m);
  if (howTo >= 0) {
    body = body.slice(howTo).trim();
  }

  return { title, body, toc };
}
