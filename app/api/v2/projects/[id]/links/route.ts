import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { addProjectLink, listProjectLinks } from "@/lib/v2/projects/project-assets-repo";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const links = await listProjectLinks(id);
  return NextResponse.json({ links });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    const body = await request.json();
    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
    const link = await addProjectLink(auth.ctx, id, {
      url,
      title: typeof body.title === "string" ? body.title : undefined,
      isPrimary: body.isPrimary === true,
    });
    return NextResponse.json({ link });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
