import { AgencyFinanceClient } from "@/components/agency/agency-finance-client";

export default function V2AgencyPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <AgencyFinanceClient variant="v2" />
    </div>
  );
}
