import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { name?: string };
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
  const db = await getDb();
  await db.execute({ sql: "UPDATE shopping_lists SET name = ? WHERE id = ?", args: [name, id] });
  return NextResponse.json({ list: { id, name } });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const db = await getDb();
  const count = await db.execute("SELECT COUNT(*) AS c FROM shopping_lists");
  if (Number(count.rows[0]?.c ?? 0) <= 1) {
    return NextResponse.json({ error: "Mindestens eine Liste behalten" }, { status: 400 });
  }
  await db.execute({ sql: "DELETE FROM shopping_items WHERE list_id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM shopping_lists WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
