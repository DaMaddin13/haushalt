import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db";

export async function GET() {
  const db = await getDb();
  const res = await db.execute("SELECT * FROM shopping_lists ORDER BY created_at ASC");
  return NextResponse.json({ lists: res.rows });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { name?: string };
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
  const id = newId();
  const db = await getDb();
  await db.execute({
    sql: "INSERT INTO shopping_lists (id, name, created_at) VALUES (?, ?, ?)",
    args: [id, name, nowIso()],
  });
  return NextResponse.json({ list: { id, name, created_at: nowIso() } }, { status: 201 });
}
