import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    name?: string;
    amount_cents?: number;
    category_id?: string | null;
    booking_day?: number;
  };
  const db = await getDb();
  const cur = await db.execute({ sql: "SELECT * FROM fixed_costs WHERE id = ?", args: [id] });
  if (!cur.rows.length) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  const row = cur.rows[0] as Record<string, unknown>;
  const name = body.name !== undefined ? body.name.trim() : (row.name as string);
  const amount = body.amount_cents ?? (row.amount_cents as number);
  const cat = body.category_id !== undefined ? body.category_id || null : ((row.category_id as string) ?? null);
  const day = body.booking_day !== undefined
    ? Math.min(Math.max(body.booking_day, 1), 28)
    : (row.booking_day as number);

  await db.execute({
    sql: `UPDATE fixed_costs SET name=?, amount_cents=?, category_id=?, booking_day=? WHERE id=?`,
    args: [name, amount, cat, day, id],
  });
  return NextResponse.json({ fixedCost: { id, name, amount_cents: amount, category_id: cat, booking_day: day } });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM fixed_costs WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
