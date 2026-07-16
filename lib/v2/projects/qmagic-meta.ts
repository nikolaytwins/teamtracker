/** Клиент-безопасные хелперы Qmagic (без server/DB импортов). */

export const QMAGIC_PROJECT_NAME = "Qmagic";

export function isQmagicProject(project: { name: string } | null | undefined): boolean {
  return Boolean(project?.name?.trim().toLowerCase() === QMAGIC_PROJECT_NAME.toLowerCase());
}
