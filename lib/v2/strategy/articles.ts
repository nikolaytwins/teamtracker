import fs from "fs";
import path from "path";
import {
  isStrategyArticleTag,
  type StrategyArticle,
  type StrategyArticleMeta,
  type StrategyArticleTag,
} from "@/lib/v2/strategy/types";

const ARTICLES_DIR = path.join(process.cwd(), "content/strategy/articles");

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  if (!raw.startsWith("---")) {
    return { meta: {}, body: raw };
  }
  const end = raw.indexOf("\n---", 3);
  if (end < 0) return { meta: {}, body: raw };
  const fm = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\n/, "");
  const meta: Record<string, string> = {};
  for (const line of fm.split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1).replace(/\\"/g, '"');
    }
    meta[key] = value;
  }
  return { meta, body };
}

function fileToArticle(filePath: string): StrategyArticle | null {
  const raw = fs.readFileSync(filePath, "utf8");
  const { meta, body } = parseFrontmatter(raw);
  const slug = meta.slug || path.basename(filePath, ".md");
  const title = meta.title || slug;
  const tag: StrategyArticleTag = isStrategyArticleTag(meta.tag) ? meta.tag : "work";
  const excerpt = meta.excerpt || body.replace(/[#>*_`]/g, "").slice(0, 160);
  const cover = meta.cover || `/strategy/covers/${slug}.png`;
  return {
    slug,
    title,
    tag,
    excerpt,
    cover,
    source: meta.source,
    body,
  };
}

export function listStrategyArticles(tag?: StrategyArticleTag | "all"): StrategyArticleMeta[] {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  const files = fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();
  const articles = files
    .map((f) => fileToArticle(path.join(ARTICLES_DIR, f)))
    .filter((a): a is StrategyArticle => Boolean(a));
  const filtered =
    !tag || tag === "all" ? articles : articles.filter((a) => a.tag === tag);
  return filtered.map(({ body: _b, ...meta }) => meta);
}

export function getStrategyArticle(slug: string): StrategyArticle | null {
  const filePath = path.join(ARTICLES_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  return fileToArticle(filePath);
}
