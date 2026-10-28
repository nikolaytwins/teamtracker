import fs from "fs";
import path from "path";

const FILES = {
  "rostov-content-plan": "rostov-content-plan.md",
  "rostov-ugc": "rostov-ugc.md",
  "impulse-nexus": "impulse-nexus.md",
  "inner-critic": "inner-critic.md",
} as const;

export type HypothesisArticleSlug = keyof typeof FILES;

export function loadHypothesisArticle(slug: HypothesisArticleSlug): { title: string; body: string } {
  const file = path.join(process.cwd(), "content/personal/hypotheses", FILES[slug]);
  const raw = fs.readFileSync(file, "utf8");
  const title = raw.match(/^#\s+(.+)/m)?.[1]?.trim() ?? "Статья";
  const body = raw.replace(/^#\s+.+\n+/, "");
  return { title, body };
}
