import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { uploadAttachmentBuffers, uploadAttachmentFiles } from "@/lib/v2/files/attachment-upload";
import {
  addPersonalWishImages,
  deletePersonalWishImage,
  PersonalWishesValidationError,
} from "@/lib/v2/personal/personal-wishes-repo";

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 60;

function blobsFromFormData(formData: FormData): Blob[] {
  const out: Blob[] = [];
  for (const value of formData.getAll("files")) {
    if (typeof value === "string" || value.size <= 0) continue;
    out.push(value);
  }
  return out;
}

function buffersFromJson(body: unknown): { name: string; contentType: string; buffer: Buffer }[] {
  if (!body || typeof body !== "object") return [];
  const rec = body as Record<string, unknown>;
  const items = Array.isArray(rec.files) ? rec.files : [rec];
  const out: { name: string; contentType: string; buffer: Buffer }[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const data = typeof row.data === "string" ? row.data : "";
    if (!data) continue;
    const name = typeof row.name === "string" && row.name.trim() ? row.name.trim() : "photo.jpg";
    const contentType =
      typeof row.type === "string" && row.type.trim() ? row.type.trim() : "image/jpeg";
    out.push({ name, contentType, buffer: Buffer.from(data, "base64") });
  }
  return out;
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const contentType = request.headers.get("content-type") || "";
    const upload = contentType.includes("application/json")
      ? await uploadAttachmentBuffers("wishes", id, buffersFromJson(await request.json()), { imagesOnly: true })
      : await uploadAttachmentFiles("wishes", id, blobsFromFormData(await request.formData()), { imagesOnly: true });
    if (!upload.ok) return NextResponse.json({ error: upload.error }, { status: 400 });

    const images = await addPersonalWishImages(
      auth.ctx,
      id,
      upload.uploaded.map((u) => ({ url: u.url, name: u.name }))
    );
    return NextResponse.json({ images });
  } catch (e) {
    if (e instanceof PersonalWishesValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("personal wish images upload:", e);
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
    await deletePersonalWishImage(auth.ctx, id, imageId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PersonalWishesValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("personal wish image delete:", e);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
