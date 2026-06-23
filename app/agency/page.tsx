import { AgencyFinanceClient } from "@/components/agency/agency-finance-client";
import { AGENCY_V1_PATHS } from "@/lib/agency/finance-paths";

export default function AgencyPage() {
  return <AgencyFinanceClient paths={AGENCY_V1_PATHS} />;
}
