import { ManifestClient } from "@/components/v2/personal/manifest/manifest-client";
import { loadManifestDoc } from "@/lib/v2/personal/manifest";

export default function PersonalManifestPage() {
  return <ManifestClient doc={loadManifestDoc()} />;
}
