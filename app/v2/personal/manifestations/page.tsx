import { LifeMapArticle } from "@/components/v2/personal/life-map/life-map-article";
import { LIFE_MF_DOC } from "@/lib/v2/personal/seeds/life-map-seed";

export default function PersonalManifestationsPage() {
  return <LifeMapArticle doc={LIFE_MF_DOC} />;
}
