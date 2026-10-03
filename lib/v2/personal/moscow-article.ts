import fs from "fs";
import path from "path";

const MOSCOW_PATH = path.join(process.cwd(), "content/personal/moscow.md");

export function loadMoscowArticle(): { title: string; body: string } {
  const raw = fs.readFileSync(MOSCOW_PATH, "utf8");
  const title = raw.match(/^#\s+(.+)/m)?.[1]?.trim() ?? "Москва";
  const body = raw.replace(/^#\s+.+\n+/, "");
  return { title, body };
}
