import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db";

export async function GET(req: NextRequest) {
  const listId = req.nextUrl.searchParams.get("list_id");
  if (!listId) return NextResponse.json({ error: "list_id fehlt" }, { status: 400 });
  const db = await getDb();
  const res = await db.execute({
    sql: `
      SELECT * FROM shopping_items
      WHERE list_id = ?
      ORDER BY
        CASE WHEN section IS NULL OR section = '' THEN 1 ELSE 0 END,
        section COLLATE NOCASE ASC,
        name COLLATE NOCASE ASC
    `,
    args: [listId],
  });
  return NextResponse.json({ items: res.rows });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    list_id?: string;
    name?: string;
    qty?: number | null;
    unit?: string | null;
    section?: string | null;
  };
  const listId = body.list_id;
  const name = (body.name ?? "").trim();
  if (!listId || !name) {
    return NextResponse.json({ error: "list_id und name erforderlich" }, { status: 400 });
  }
  const db = await getDb();

  // Duplicate: same list, unchecked, same name (case-insensitive)
  const dup = await db.execute({
    sql: `SELECT * FROM shopping_items WHERE list_id = ? AND checked = 0 AND lower(name) = lower(?) LIMIT 1`,
    args: [listId, name],
  });
  if (dup.rows.length) {
    const existing = dup.rows[0] as Record<string, unknown>;
    const addQty = body.qty != null && Number.isFinite(body.qty) ? Number(body.qty) : 1;
    const curQty = existing.qty != null ? Number(existing.qty) : 1;
    const newQty = curQty + addQty;
    await db.execute({
      sql: `UPDATE shopping_items SET qty = ? WHERE id = ?`,
      args: [newQty, existing.id as string],
    });
    const updated = await db.execute({
      sql: "SELECT * FROM shopping_items WHERE id = ?",
      args: [existing.id as string],
    });
    return NextResponse.json({ item: updated.rows[0], duplicated: true });
  }

  const id = newId();
  await db.execute({
    sql: `INSERT INTO shopping_items (id, list_id, name, qty, unit, section, checked, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    args: [
      id,
      listId,
      name,
      body.qty ?? null,
      body.unit?.trim() || null,
      body.section?.trim() || null,
      nowIso(),
    ],
  });
  const row = await db.execute({ sql: "SELECT * FROM shopping_items WHERE id = ?", args: [id] });
  return NextResponse.json({ item: row.rows[0] }, { status: 201 });
}

/** Bulk: clear checked items */
export async function DELETE(req: NextRequest) {
  const listId = req.nextUrl.searchParams.get("list_id");
  const clearChecked = req.nextUrl.searchParams.get("checked") === "1";
  if (!listId || !clearChecked) {
    return NextResponse.json({ error: "list_id und checked=1 erforderlich" }, { status: 400 });
  }
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM shopping_items WHERE list_id = ? AND checked = 1",
    args: [listId],
  });
  return NextResponse.json({ ok: true });
}
