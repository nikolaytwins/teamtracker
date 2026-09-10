import fs from "fs";
import path from "path";
import {
  shortManifestLabel,
  slugifyManifestHeading,
  type ManifestTocItem,
} from "@/lib/v2/personal/manifest-shared";

export type { ManifestTocItem } from "@/lib/v2/personal/manifest-shared";
export { slugifyManifestHeading } from "@/lib/v2/personal/manifest-shared";

const MANIFEST_PATH = path.join(process.cwd(), "content/manifest/novoi-zhizni.md");

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
        short: shortManifestLabel(text),
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
