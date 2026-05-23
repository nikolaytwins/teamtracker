import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { uploadAttachmentFiles } from "@/lib/v2/files/attachment-upload";
import { addFile, listFiles } from "@/lib/v2/tasks/task-detail";

function filesFromFormData(formData: FormData): File[] {
  return formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const files = await listFiles(id);
  return NextResponse.json({ files });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    const formData = await request.formData();
    const picked = filesFromFormData(formData);
    if (!picked.length) {
      return NextResponse.json({ error: "Выберите один или несколько файлов" }, { status: 400 });
    }

    const upload = await uploadAttachmentFiles("tasks", id, picked);
    if (!upload.ok) return NextResponse.json({ error: upload.error }, { status: 400 });

    const files = [];
    for (const item of upload.uploaded) {
      const file = await addFile(auth.ctx, id, {
        name: item.name,
        url: item.url,
        sizeBytes: item.sizeBytes,
        kind: item.kind,
      });
      files.push(file);
    }

    return NextResponse.json({ files });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
