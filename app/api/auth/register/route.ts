import { NextResponse } from "next/server";
import { isSelfRegistrationEnabled } from "@/lib/self-register";

export async function GET() {
  return NextResponse.json({ enabled: isSelfRegistrationEnabled() });
}

export async function POST() {
  return NextResponse.json({ error: "Регистрация отключена" }, { status: 403 });
}
