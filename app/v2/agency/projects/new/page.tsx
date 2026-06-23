import { NewAgencyProjectClient } from "@/components/agency/new-project-client";
import { AGENCY_V2_PATHS } from "@/lib/agency/finance-paths";

export default function V2NewAgencyProjectPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <NewAgencyProjectClient paths={AGENCY_V2_PATHS} />
    </div>
  );
}
