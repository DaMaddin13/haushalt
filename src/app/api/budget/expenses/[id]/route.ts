import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    date?: string;
    amount_cents?: number;
    category_id?: string | null;
    note?: string | null;
  };
  const db = await getDb();
  const cur = await db.execute({ sql: "SELECT * FROM expenses WHERE id = ?", args: [id] });
  if (!cur.rows.length) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  const row = cur.rows[0] as Record<string, unknown>;

  const date = body.date ?? (row.date as string);
  const amount = body.amount_cents ?? (row.amount_cents as number);
  const cat = body.category_id !== undefined ? body.category_id || null : ((row.category_id as string) ?? null);
  const note = body.note !== undefined ? (body.note?.trim() || null) : ((row.note as string) ?? null);
  const month_key = date.slice(0, 7);
  const isOverride = row.fixed_cost_id ? 1 : 0;

  await db.execute({
    sql: `UPDATE expenses SET date=?, amount_cents=?, category_id=?, note=?, month_key=?, is_fixed_override=? WHERE id=?`,
    args: [date, amount, cat, note, month_key, isOverride, id],
  });

  const updated = await db.execute({
    sql: `SELECT e.*, c.name AS category_name FROM expenses e LEFT JOIN budget_categories c ON c.id = e.category_id WHERE e.id = ?`,
    args: [id],
  });
  return NextResponse.json({ expense: updated.rows[0] });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM expenses WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
