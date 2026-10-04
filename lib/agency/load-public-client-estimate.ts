import type { AgencyRepo } from "@/lib/agency-store";
import {
  buildPublicClientEstimate,
  isClientShareToken,
  type ClientShareDetailInput,
  type ClientShareProjectInput,
  type PublicClientEstimate,
} from "@/lib/agency/client-share";

export async function loadPublicClientEstimate(
  repo: AgencyRepo,
  token: string
): Promise<PublicClientEstimate | null> {
  const clean = token.trim();
  if (!isClientShareToken(clean)) return null;
  const projects = await repo.listProjectsByClientShareToken(clean);
  if (!projects.length) return null;

  const detailsByProjectId: Record<string, ClientShareDetailInput[]> = {};
  for (const project of projects) {
    const id = String(project.id);
    const rows = await repo.listProjectDetails(id);
    detailsByProjectId[id] = rows.map((row) => ({
      title: String(row.title ?? ""),
      quantity: Number(row.quantity) || 0,
      unitPrice: Number(row.unitPrice) || 0,
      billingType: row.billingType ? String(row.billingType) : "fixed",
      trackedSeconds: Number(row.trackedSeconds) || 0,
      timerStartedAt: row.timerStartedAt ? String(row.timerStartedAt) : null,
      order: Number(row.order) || 0,
    }));
  }

  const mapped: ClientShareProjectInput[] = projects.map((project) => ({
    id: String(project.id),
    name: String(project.name ?? ""),
    paidAmount: Number(project.paidAmount) || 0,
    status: String(project.status ?? "not_paid"),
    createdAt: project.createdAt ? String(project.createdAt) : null,
    hourlyRateRub: Number(project.hourlyRateRub) || 0,
  }));

  return buildPublicClientEstimate(mapped, detailsByProjectId);
}
