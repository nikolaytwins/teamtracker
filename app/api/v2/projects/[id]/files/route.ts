import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { addProjectFile, listProjectFiles } from "@/lib/v2/projects/project-assets-repo";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const files = await listProjectFiles(id);
  return NextResponse.json({ files });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!name || !url) return NextResponse.json({ error: "name and url required" }, { status: 400 });
    const file = await addProjectFile(auth.ctx, id, {
      name,
      url,
      sizeBytes: typeof body.sizeBytes === "number" ? body.sizeBytes : null,
      kind: typeof body.kind === "string" ? body.kind : null,
    });
    return NextResponse.json({ file });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
