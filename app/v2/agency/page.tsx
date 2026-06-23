import { AgencyFinanceClient } from "@/components/agency/agency-finance-client";
import { AGENCY_V2_PATHS } from "@/lib/agency/finance-paths";

export default function V2AgencyPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <AgencyFinanceClient paths={AGENCY_V2_PATHS} />
    </div>
  );
}
