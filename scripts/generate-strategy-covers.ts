/**
 * Перегенерация обложек статей Стратегии через OpenRouter.
 *
 * Usage:
 *   OPENROUTER_API_KEY=sk-or-... npx tsx scripts/generate-strategy-covers.ts
 *   OPENROUTER_API_KEY=... npx tsx scripts/generate-strategy-covers.ts --only=kodex,ne-vygorat
 */
import fs from "fs";
import path from "path";
import { listStrategyArticles } from "../lib/v2/strategy/articles";
import { generateStrategyCoverViaOpenRouter } from "../lib/v2/strategy/openrouter-image";

async function main() {
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    console.error("Set OPENROUTER_API_KEY");
    process.exit(1);
  }

  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const only = onlyArg
    ? new Set(onlyArg.slice("--only=".length).split(",").map((s) => s.trim()).filter(Boolean))
    : null;

  const outDir = path.join(process.cwd(), "public/strategy/covers");
  fs.mkdirSync(outDir, { recursive: true });

  const articles = listStrategyArticles("all").filter((a) => !only || only.has(a.slug));
  console.log(`Generating ${articles.length} covers…`);

  for (const article of articles) {
    process.stdout.write(`- ${article.slug}… `);
    try {
      const result = await generateStrategyCoverViaOpenRouter({
        title: article.title,
        tag: article.tag,
      });
      if (!result) {
        console.log("no image in response");
        continue;
      }
      const ext = result.mime.includes("jpeg") || result.mime.includes("jpg") ? "jpg" : "png";
      const file = path.join(outDir, `${article.slug}.${ext}`);
      fs.writeFileSync(file, Buffer.from(result.b64, "base64"));
      // keep .png path in frontmatter — copy/rename if jpg
      if (ext === "jpg") {
        fs.copyFileSync(file, path.join(outDir, `${article.slug}.png`));
      }
      console.log("ok");
    } catch (e) {
      console.log("FAIL", e instanceof Error ? e.message : e);
    }
  }
}

main();
