import fs from "fs";
import path from "path";

const RULES_PATH = path.join(process.cwd(), "content/personal/finance-distribution-rules.md");

export function loadFinanceDistributionRules(): { title: string; body: string } {
  const raw = fs.readFileSync(RULES_PATH, "utf8");
  const title = raw.match(/^#\s+(.+)/m)?.[1]?.trim() ?? "Правила распределения";
  return { title, body: raw };
}
