import { MoscowPage } from "@/components/v2/personal/moscow/moscow-page";
import { loadMoscowArticle } from "@/lib/v2/personal/moscow-article";

export default function PersonalMoscowPage() {
  const article = loadMoscowArticle();
  return <MoscowPage title={article.title} body={article.body} />;
}
