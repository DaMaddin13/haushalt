import { NextRequest, NextResponse } from "next/server";
import { getDb, newId } from "@/lib/db";

export async function GET() {
  const db = await getDb();
  const res = await db.execute("SELECT * FROM areas ORDER BY sort ASC, name ASC");
  return NextResponse.json({ areas: res.rows });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { name?: string };
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
  const db = await getDb();
  const existing = await db.execute({
    sql: "SELECT id FROM areas WHERE lower(name) = lower(?)",
    args: [name],
  });
  if (existing.rows.length) {
    return NextResponse.json({ area: existing.rows[0], existing: true });
  }
  const max = await db.execute("SELECT COALESCE(MAX(sort), -1) AS m FROM areas");
  const sort = Number(max.rows[0]?.m ?? -1) + 1;
  const id = newId();
  await db.execute({
    sql: "INSERT INTO areas (id, name, sort) VALUES (?, ?, ?)",
    args: [id, name, sort],
  });
  return NextResponse.json({ area: { id, name, sort } }, { status: 201 });
}
