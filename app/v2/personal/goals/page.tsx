import { Suspense } from "react";
import { GoalsPageClient } from "@/components/v2/personal/goals/goals-client";

export default function PersonalGoalsPage() {
  return (
    <Suspense fallback={null}>
      <GoalsPageClient />
    </Suspense>
  );
}
