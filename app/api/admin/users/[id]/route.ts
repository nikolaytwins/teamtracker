import { NextRequest, NextResponse } from "next/server";
import { normalizeTtUserRole } from "@/lib/roles";
import { requireAgencyAccess } from "@/lib/require-role";
import { getUserById, toTtUserPublic, updateUserAuthEmail, updateUserRole } from "@/lib/tt-auth-db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAgencyAccess();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const userId = typeof id === "string" ? id.trim() : "";
  if (!userId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  let body: { role?: unknown; auth_email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const hasRole = body.role != null && String(body.role).trim() !== "";
  const hasAuthEmail = Object.prototype.hasOwnProperty.call(body, "auth_email");
  if (!hasRole && !hasAuthEmail) {
    return NextResponse.json({ error: "Укажите role и/или auth_email" }, { status: 400 });
  }
  if (hasRole) {
    const role = normalizeTtUserRole(String(body.role));
    const result = updateUserRole(userId, role);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }
  if (hasAuthEmail) {
    let emailVal: string | null;
    if (body.auth_email === null || body.auth_email === "") {
      emailVal = null;
    } else if (typeof body.auth_email === "string") {
      emailVal = body.auth_email;
    } else {
      return NextResponse.json({ error: "auth_email: ожидается строка или null" }, { status: 400 });
    }
    const result = updateUserAuthEmail(userId, emailVal);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }
  const row = getUserById(userId);
  if (!row) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }
  return NextResponse.json({ user: toTtUserPublic(row) });
}
