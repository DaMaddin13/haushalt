import { NextRequest, NextResponse } from "next/server";
import { getDb, newId } from "@/lib/db";
import { monthKeyVienna } from "@/lib/dates";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    date?: string;
    amount_cents?: number;
    category_id?: string | null;
    note?: string | null;
    month_key?: string;
  };
  if (body.amount_cents == null || !Number.isFinite(body.amount_cents)) {
    return NextResponse.json({ error: "Betrag fehlt" }, { status: 400 });
  }
  const date = body.date || `${monthKeyVienna()}-01`;
  const month_key = body.month_key || date.slice(0, 7);
  const id = newId();
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO expenses (id, date, amount_cents, category_id, note, is_fixed_override, fixed_cost_id, month_key)
          VALUES (?, ?, ?, ?, ?, 0, NULL, ?)`,
    args: [id, date, body.amount_cents, body.category_id || null, body.note?.trim() || null, month_key],
  });
  const row = await db.execute({
    sql: `SELECT e.*, c.name AS category_name FROM expenses e LEFT JOIN budget_categories c ON c.id = e.category_id WHERE e.id = ?`,
    args: [id],
  });
  return NextResponse.json({ expense: row.rows[0] }, { status: 201 });
}
