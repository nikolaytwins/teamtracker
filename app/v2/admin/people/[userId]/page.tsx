import { Suspense } from "react";
import { V2AdminPeopleDayClient } from "@/components/v2/admin/people-day-client";

type Props = { params: Promise<{ userId: string }> };

export default async function V2AdminPeopleDayPage({ params }: Props) {
  const { userId } = await params;
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>}>
      <V2AdminPeopleDayClient userId={userId} />
    </Suspense>
  );
}
