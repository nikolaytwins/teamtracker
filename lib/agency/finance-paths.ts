export type AgencyFinancePaths = {
  apiBase: string;
  projectHref: (id: string) => string;
  newProjectHref: string;
  listHref: string;
};

export const AGENCY_V1_PATHS: AgencyFinancePaths = {
  apiBase: "/api/agency",
  projectHref: (id) => `/agency/projects/${id}`,
  newProjectHref: "/agency/projects/new",
  listHref: "/agency",
};

export const AGENCY_V2_PATHS: AgencyFinancePaths = {
  apiBase: "/api/v2/agency",
  projectHref: (id) => `/v2/agency/projects/${id}`,
  newProjectHref: "/v2/agency/projects/new",
  listHref: "/v2/agency",
};
