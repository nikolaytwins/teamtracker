import { V2PersonalHomeClient } from "@/components/v2/home/v2-personal-home-client";
import { getServerSession } from "@/lib/get-session";
import { loadHomeFinanceStrip } from "@/lib/v2/home/load-home-finance";
import { effectiveUserRole } from "@/lib/require-role";
import { withTimeout } from "@/lib/with-timeout";
import { buildV2SessionContext } from "@/lib/v2/workspace/bootstrap";

export default async function V2HomePage() {
  let initialFinance = null;

  const session = await getServerSession();
  if (session) {
    try {
      const ctx = await withTimeout(
        buildV2SessionContext(session.sub, session.name, effectiveUserRole(session)),
        8_000,
        "home bootstrap"
      );
      initialFinance = await withTimeout(loadHomeFinanceStrip(ctx), 8_000, "home finance");
    } catch {
      initialFinance = null;
    }
  }

  return <V2PersonalHomeClient initialFinance={initialFinance} />;
}
