import { NextRequest, NextResponse } from "next/server";
import { getDb, nowIso } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as { month_income_cents?: number | null };
  if (body.month_income_cents === undefined) {
    return NextResponse.json({ error: "month_income_cents fehlt" }, { status: 400 });
  }
  const db = await getDb();
  await db.execute({
    sql: `UPDATE budget_settings SET month_income_cents = ?, updated_at = ? WHERE id = 1`,
    args: [body.month_income_cents, nowIso()],
  });
  const row = await db.execute("SELECT * FROM budget_settings WHERE id = 1");
  return NextResponse.json({ settings: row.rows[0] });
}
