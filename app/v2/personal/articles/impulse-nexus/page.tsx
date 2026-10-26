import { HypothesisArticle } from "@/components/v2/personal/hypotheses/hypothesis-article";
import { loadHypothesisArticle } from "@/lib/v2/personal/hypothesis-articles";

export default function ImpulseNexusPage() {
  const article = loadHypothesisArticle("impulse-nexus");
  return <HypothesisArticle title={article.title} body={article.body} />;
}
