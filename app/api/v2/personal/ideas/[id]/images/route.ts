import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { uploadAttachmentFiles } from "@/lib/v2/files/attachment-upload";
import {
  addPersonalIdeaImages,
  deletePersonalIdeaImage,
  PersonalIdeasValidationError,
} from "@/lib/v2/personal/personal-ideas-repo";

type Ctx = { params: Promise<{ id: string }> };

function filesFromFormData(formData: FormData): File[] {
  return formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const formData = await request.formData();
    const picked = filesFromFormData(formData);
    if (!picked.length) {
      return NextResponse.json({ error: "Выберите одно или несколько изображений" }, { status: 400 });
    }

    const upload = await uploadAttachmentFiles("ideas", id, picked, { imagesOnly: true });
    if (!upload.ok) return NextResponse.json({ error: upload.error }, { status: 400 });

    const images = await addPersonalIdeaImages(
      auth.ctx,
      id,
      upload.uploaded.map((u) => ({ url: u.url, name: u.name }))
    );
    return NextResponse.json({ images });
  } catch (e) {
    if (e instanceof PersonalIdeasValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("personal idea images upload:", e);
    return NextResponse.json({ error: "Failed to upload images" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const imageId = request.nextUrl.searchParams.get("imageId")?.trim();
    if (!imageId) {
      return NextResponse.json({ error: "imageId required" }, { status: 400 });
    }
    await deletePersonalIdeaImage(auth.ctx, id, imageId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PersonalIdeasValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("personal idea image delete:", e);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
