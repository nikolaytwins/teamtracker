import { cookies } from "next/headers";
import { getAuthSecret, verifySession, type SessionPayload } from "@/lib/session-token";

export async function getServerSession(): Promise<SessionPayload | null> {
  const secret = getAuthSecret();
  if (!secret) return null;
  const c = await cookies();
  const tok = c.get("tt_session")?.value;
  if (!tok) return null;
  return verifySession(tok, secret);
}
