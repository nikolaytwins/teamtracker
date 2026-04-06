import path from "path";

/** SQLite file for agency + history APIs (separate from pm-board kanban DB). */
export function getAgencySqlitePath(): string {
  const override = process.env.AGENCY_SQLITE_PATH?.trim();
  if (override) return path.resolve(override);
  return path.join(process.cwd(), "data", "agency.db");
}
