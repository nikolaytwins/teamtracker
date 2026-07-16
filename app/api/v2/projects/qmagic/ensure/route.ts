import { NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { ensureQmagicProject } from "@/lib/v2/projects/qmagic";

export async function POST() {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;

  try {
    const project = await ensureQmagicProject(auth.ctx);
    return NextResponse.json({ project });
  } catch (e) {
    console.error("POST /api/v2/projects/qmagic/ensure", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
