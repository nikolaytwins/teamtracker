export type AgencyProjectTrackedTimeRow = {
  id: string;
  projectId: string;
  userId: string;
  source: string;
  sourceEntryId: string | null;
  task: string;
  activity: string;
  durationSeconds: number;
  trackedAt: string;
  inEstimate: boolean;
  detailId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateAgencyProjectTrackedTimeInput = {
  id: string;
  projectId: string;
  userId: string;
  sourceEntryId: string;
  task: string;
  activity: string;
  durationSeconds: number;
  trackedAt: string;
};
