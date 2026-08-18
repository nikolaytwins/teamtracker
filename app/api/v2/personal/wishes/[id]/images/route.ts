import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { uploadAttachmentFiles } from "@/lib/v2/files/attachment-upload";
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

function registeredFromJson(body: unknown): { url: string; name: string }[] {
  if (!body || typeof body !== "object") return [];
  const rec = body as Record<string, unknown>;
  const items = Array.isArray(rec.registered) ? rec.registered : rec.url ? [rec] : [];
  const out: { url: string; name: string }[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const url = typeof row.url === "string" ? row.url.trim() : "";
    if (!url) continue;
    out.push({
      url,
      name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : "photo.jpg",
    });
  }
  return out;
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const contentType = request.headers.get("content-type") || "";
    let uploaded: { url: string; name: string }[] = [];
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const registered = registeredFromJson(body);
      if (!registered.length) {
        return NextResponse.json({ error: "Выберите одно или несколько изображений" }, { status: 400 });
      }
      uploaded = registered;
    } else {
      const result = await uploadAttachmentFiles("wishes", id, blobsFromFormData(await request.formData()), {
        imagesOnly: true,
      });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      uploaded = result.uploaded.map((u) => ({ url: u.url, name: u.name }));
    }
    if (!uploaded.length) {
      return NextResponse.json({ error: "Выберите одно или несколько изображений" }, { status: 400 });
    }

    const images = await addPersonalWishImages(auth.ctx, id, uploaded);
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
