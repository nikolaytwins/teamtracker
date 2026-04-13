import { NextResponse } from "next/server";
import { requireAgencyAccess } from "@/lib/require-role";
import { listUsersPublic } from "@/lib/tt-auth-db";

export async function GET() {
  const auth = await requireAgencyAccess();
  if (!auth.ok) return auth.response;
  return NextResponse.json({ users: listUsersPublic() });
}
