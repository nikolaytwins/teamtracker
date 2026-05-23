export const V2_SIDEBAR_COLLAPSED_KEY = "v2-sidebar-collapsed";
export const V2_NAV_PROJECTS_EXPANDED_KEY = "v2-nav-projects-expanded";
export const V2_NAV_PINNED_PROJECTS_KEY = "v2-nav-pinned-projects";

export function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(V2_SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(V2_SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function readNavProjectsExpanded(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = localStorage.getItem(V2_NAV_PROJECTS_EXPANDED_KEY);
    if (v === null) return true;
    return v === "1";
  } catch {
    return true;
  }
}

export function writeNavProjectsExpanded(expanded: boolean): void {
  try {
    localStorage.setItem(V2_NAV_PROJECTS_EXPANDED_KEY, expanded ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function readNavPinnedProjects(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(V2_NAV_PINNED_PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function writeNavPinnedProjects(ids: string[]): void {
  try {
    localStorage.setItem(V2_NAV_PINNED_PROJECTS_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}
