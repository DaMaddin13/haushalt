import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { name?: string };
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
  const db = await getDb();
  await db.execute({
    sql: "UPDATE budget_categories SET name = ? WHERE id = ?",
    args: [name, id],
  });
  return NextResponse.json({ category: { id, name } });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM budget_categories WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
