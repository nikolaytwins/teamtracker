import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { getAgencySqlitePath } from "@/lib/agency-sqlite";
import { insertPlatformVisit, type VisitPlatform } from "@/lib/platform-visits";

const dbPath = getAgencySqlitePath();

function getDb() {
  return new Database(dbPath);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const platform = body?.platform as string;
    if (platform !== "profi" && platform !== "threads") {
      return NextResponse.json({ error: "platform must be profi or threads" }, { status: 400 });
    }
    const db = getDb();
    insertPlatformVisit(db, platform as VisitPlatform);
    db.close();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("platform-visits POST:", error);
    return NextResponse.json({ error: "Failed to record visit" }, { status: 500 });
  }
}
