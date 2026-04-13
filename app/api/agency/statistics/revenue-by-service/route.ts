import { NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

/** Выручка по типам услуг за ВСЕ месяцы (все проекты) */
export async function GET() {
  try {
    const { items, total } = await getAgencyRepo().revenueByService();
    return NextResponse.json({ items, total });
  } catch (error) {
    console.error("Error fetching revenue by service:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
