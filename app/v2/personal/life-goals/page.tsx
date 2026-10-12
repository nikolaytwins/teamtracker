import { LifeMapArticle } from "@/components/v2/personal/life-map/life-map-article";
import { LIFE_GOALS_DOC } from "@/lib/v2/personal/seeds/life-map-seed";

export default function PersonalLifeGoalsPage() {
  return <LifeMapArticle doc={LIFE_GOALS_DOC} />;
}
