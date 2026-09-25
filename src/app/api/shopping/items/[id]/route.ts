import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    name?: string;
    qty?: number | null;
    unit?: string | null;
    section?: string | null;
    checked?: boolean | number;
  };
  const db = await getDb();
  const cur = await db.execute({ sql: "SELECT * FROM shopping_items WHERE id = ?", args: [id] });
  if (!cur.rows.length) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  const row = cur.rows[0] as Record<string, unknown>;

  const name = body.name !== undefined ? body.name.trim() : (row.name as string);
  const qty = body.qty !== undefined ? body.qty : ((row.qty as number) ?? null);
  const unit = body.unit !== undefined ? (body.unit?.trim() || null) : ((row.unit as string) ?? null);
  const section = body.section !== undefined ? (body.section?.trim() || null) : ((row.section as string) ?? null);
  let checked = row.checked as number;
  if (body.checked !== undefined) {
    checked = body.checked === true || body.checked === 1 ? 1 : 0;
  }

  await db.execute({
    sql: `UPDATE shopping_items SET name=?, qty=?, unit=?, section=?, checked=? WHERE id=?`,
    args: [name, qty, unit, section, checked, id],
  });
  const updated = await db.execute({ sql: "SELECT * FROM shopping_items WHERE id = ?", args: [id] });
  return NextResponse.json({ item: updated.rows[0] });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM shopping_items WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
