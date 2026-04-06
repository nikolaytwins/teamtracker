import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { getAgencySqlitePath } from "@/lib/agency-sqlite";
import { getOutreachListJson, insertOutreachResponse } from "@/lib/outreach-api";

const dbPath = getAgencySqlitePath();

function getDb() {
  return new Database(dbPath);
}

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const withStats = searchParams.get("stats") === "1";
    const payload = getOutreachListJson(db, "threads", withStats);
    db.close();
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error fetching threads responses:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cost = 0, notes } = body;
    const c = Number(cost);
    if (Number.isNaN(c) || c < 0) {
      return NextResponse.json({ error: "cost must be >= 0" }, { status: 400 });
    }

    const db = getDb();
    const row = insertOutreachResponse(db, "threads", { cost: c, notes: notes || null });
    db.close();

    return NextResponse.json({ success: true, item: row });
  } catch (error) {
    console.error("Error creating threads response:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
