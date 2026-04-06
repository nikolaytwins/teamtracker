import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { getAgencySqlitePath } from "@/lib/agency-sqlite";
import { deleteOutreachResponse, getOutreachById, patchOutreachResponse } from "@/lib/outreach-api";

const dbPath = getAgencySqlitePath();

function getDb() {
  return new Database(dbPath);
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const db = getDb();
    const row = getOutreachById(db, id, "threads");
    db.close();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    console.error("Error fetching threads response:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { status, refundAmount, projectAmount, notes } = body;

    const db = getDb();
    const row = patchOutreachResponse(db, id, "threads", { status, refundAmount, projectAmount, notes });
    db.close();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, item: row });
  } catch (error) {
    console.error("Error updating threads response:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const db = getDb();
    const ok = deleteOutreachResponse(db, id, "threads");
    db.close();
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting threads response:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
