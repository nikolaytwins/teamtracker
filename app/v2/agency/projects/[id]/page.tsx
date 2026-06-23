import { AgencyProjectDetailClient } from "@/components/agency/agency-project-detail-client";
import { AGENCY_V2_PATHS } from "@/lib/agency/finance-paths";

export default function V2AgencyProjectDetailPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <AgencyProjectDetailClient paths={AGENCY_V2_PATHS} />
    </div>
  );
}
