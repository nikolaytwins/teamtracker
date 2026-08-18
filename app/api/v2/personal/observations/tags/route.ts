import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import {
  deletePersonalObservationTag,
  PersonalObservationsValidationError,
} from "@/lib/v2/personal/personal-observations-repo";

export async function DELETE(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const name = String(body.name ?? body.tag ?? "").trim();
    await deletePersonalObservationTag(auth.ctx, name);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PersonalObservationsValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("personal observation tag delete:", e);
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  }
}
