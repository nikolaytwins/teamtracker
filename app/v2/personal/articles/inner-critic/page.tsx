import { HypothesisArticle } from "@/components/v2/personal/hypotheses/hypothesis-article";
import { loadHypothesisArticle } from "@/lib/v2/personal/hypothesis-articles";

export default function InnerCriticPage() {
  const article = loadHypothesisArticle("inner-critic");
  return (
    <HypothesisArticle
      title={article.title}
      body={article.body}
      hero="/articles/inner-critic-hero.jpg"
    />
  );
}
