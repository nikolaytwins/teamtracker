import { NextRequest, NextResponse } from "next/server";
import { normalizeTtUserRole } from "@/lib/roles";
import { requireAgencyAccess } from "@/lib/require-role";
import { createUserByAdminEmail, listUsersPublic } from "@/lib/tt-auth-db";

export async function GET() {
  const auth = await requireAgencyAccess();
  if (!auth.ok) return auth.response;
  return NextResponse.json({ users: listUsersPublic() });
}

export async function POST(request: NextRequest) {
  const auth = await requireAgencyAccess();
  if (!auth.ok) return auth.response;
  let body: { email?: unknown; displayName?: unknown; jobTitle?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "Укажите email" }, { status: 400 });
  }
  const displayName = typeof body.displayName === "string" ? body.displayName : undefined;
  const jobTitle = typeof body.jobTitle === "string" ? body.jobTitle : undefined;
  const role = body.role != null ? normalizeTtUserRole(String(body.role)) : undefined;

  const created = createUserByAdminEmail({
    email,
    display_name: displayName,
    job_title: jobTitle,
    role,
  });
  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: 400 });
  }
  return NextResponse.json({
    user: created.user,
    temporaryPassword: created.temporaryPassword,
  });
}
