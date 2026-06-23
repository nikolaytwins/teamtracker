import { AgencyProjectDetailClient } from "@/components/agency/agency-project-detail-client";
import { AGENCY_V1_PATHS } from "@/lib/agency/finance-paths";

export default function ProjectPage() {
  return <AgencyProjectDetailClient paths={AGENCY_V1_PATHS} />;
}
