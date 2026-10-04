import { NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { listInboxCategories } from "@/lib/v2/personal/inbox-categories-repo";

export async function GET() {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const categories = await listInboxCategories();
    return NextResponse.json({ categories });
  } catch (e) {
    console.error("inbox categories:", e);
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
  }
}
