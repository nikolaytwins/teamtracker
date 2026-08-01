import { StrategyArticleClient } from "@/components/v2/personal/strategy/strategy-article-client";

type Props = { params: Promise<{ slug: string }> };

export default async function StrategyArticlePage({ params }: Props) {
  const { slug } = await params;
  return <StrategyArticleClient slug={slug} />;
}
