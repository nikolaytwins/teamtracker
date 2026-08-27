import { V2PersonalHomeClient } from "@/components/v2/home/v2-personal-home-client";
import { getServerSession } from "@/lib/get-session";
import { isClientRole } from "@/lib/roles";
import { effectiveUserRole } from "@/lib/require-role";
import { buildV2SessionContext } from "@/lib/v2/workspace/bootstrap";
import { loadHomePersonalFinance, type HomePersonalFinancePayload } from "@/lib/v2/home/load-home-finance";
import { isV2SupabaseConfigured } from "@/lib/v2/db/client";

export default async function V2HomePage() {
  let initialFinance: HomePersonalFinancePayload | null = null;

  if (isV2SupabaseConfigured()) {
    try {
      const session = await getServerSession();
      if (session) {
        const role = effectiveUserRole(session);
        if (!isClientRole(role)) {
          const ctx = await buildV2SessionContext(session.sub, session.name, role);
          initialFinance = await loadHomePersonalFinance(ctx);
        }
      }
    } catch (e) {
      console.warn("home finance SSR:", e);
    }
  }

  return <V2PersonalHomeClient initialFinance={initialFinance} />;
}
