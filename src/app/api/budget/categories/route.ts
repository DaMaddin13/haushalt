import { NextRequest, NextResponse } from "next/server";
import { getDb, newId } from "@/lib/db";

export async function GET() {
  const db = await getDb();
  const res = await db.execute("SELECT * FROM budget_categories ORDER BY name");
  return NextResponse.json({ categories: res.rows });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { name?: string };
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
  const db = await getDb();
  const existing = await db.execute({
    sql: "SELECT * FROM budget_categories WHERE lower(name) = lower(?)",
    args: [name],
  });
  if (existing.rows.length) {
    return NextResponse.json({ category: existing.rows[0], existing: true });
  }
  const id = newId();
  await db.execute({
    sql: "INSERT INTO budget_categories (id, name) VALUES (?, ?)",
    args: [id, name],
  });
  return NextResponse.json({ category: { id, name } }, { status: 201 });
}
