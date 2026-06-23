import { NewAgencyProjectClient } from "@/components/agency/new-project-client";
import { AGENCY_V1_PATHS } from "@/lib/agency/finance-paths";

export default function NewProjectPage() {
  return <NewAgencyProjectClient paths={AGENCY_V1_PATHS} />;
}
