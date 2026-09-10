import { ManifestClient } from "@/components/v2/personal/manifest/manifest-client";
import { loadManifestSource } from "@/lib/v2/personal/manifest";

export default function PersonalManifestPage() {
  const { title, body, toc } = loadManifestSource();
  return <ManifestClient title={title} body={body} toc={toc} />;
}
