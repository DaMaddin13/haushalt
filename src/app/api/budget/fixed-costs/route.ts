import { NextRequest, NextResponse } from "next/server";
import { getDb, newId } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    name?: string;
    amount_cents?: number;
    category_id?: string | null;
    booking_day?: number;
  };
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
  if (body.amount_cents == null || !Number.isFinite(body.amount_cents)) {
    return NextResponse.json({ error: "Betrag fehlt" }, { status: 400 });
  }
  const day = Math.min(Math.max(body.booking_day ?? 1, 1), 28);
  const id = newId();
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO fixed_costs (id, name, amount_cents, category_id, booking_day) VALUES (?, ?, ?, ?, ?)`,
    args: [id, name, body.amount_cents, body.category_id || null, day],
  });
  return NextResponse.json(
    { fixedCost: { id, name, amount_cents: body.amount_cents, category_id: body.category_id || null, booking_day: day } },
    { status: 201 }
  );
}
