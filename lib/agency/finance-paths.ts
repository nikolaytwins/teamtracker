export type AgencyFinanceVariant = "v1" | "v2";

export type AgencyFinancePaths = {
  apiBase: string;
  projectsBase: string;
  newProjectHref: string;
  listHref: string;
};

export const AGENCY_FINANCE_PATHS: Record<AgencyFinanceVariant, AgencyFinancePaths> = {
  v1: {
    apiBase: "/api/agency",
    projectsBase: "/agency/projects",
    newProjectHref: "/agency/projects/new",
    listHref: "/agency",
  },
  v2: {
    apiBase: "/api/v2/agency",
    projectsBase: "/v2/agency/projects",
    newProjectHref: "/v2/agency/projects/new",
    listHref: "/v2/agency",
  },
};

/** @deprecated use AGENCY_FINANCE_PATHS.v1 */
export const AGENCY_V1_PATHS = AGENCY_FINANCE_PATHS.v1;

/** @deprecated use AGENCY_FINANCE_PATHS.v2 */
export const AGENCY_V2_PATHS = AGENCY_FINANCE_PATHS.v2;

export function agencyProjectHref(paths: AgencyFinancePaths, id: string): string {
  return `${paths.projectsBase}/${id}`;
}
