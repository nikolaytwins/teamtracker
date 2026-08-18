import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { createSignedAttachmentUploads } from "@/lib/v2/files/attachment-upload";
import { ownWish, PersonalWishesValidationError } from "@/lib/v2/personal/personal-wishes-repo";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    if (!(await ownWish(auth.ctx.userId, id))) {
      return NextResponse.json({ error: "Желание не найдено" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const raw = Array.isArray(body.files) ? body.files : [];
    const files = raw
      .map((item: unknown) => {
        const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        return {
          name: typeof row.name === "string" ? row.name : "photo.jpg",
          contentType: typeof row.type === "string" ? row.type : "image/jpeg",
        };
      })
      .filter((f: { name: string }) => f.name);
    const signed = await createSignedAttachmentUploads("wishes", id, files, { imagesOnly: true });
    if (!signed.ok) return NextResponse.json({ error: signed.error }, { status: 400 });
    return NextResponse.json({ uploads: signed.uploads });
  } catch (e) {
    if (e instanceof PersonalWishesValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("personal wish images sign:", e);
    return NextResponse.json({ error: "Failed to sign upload" }, { status: 500 });
  }
}
