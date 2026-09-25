import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const db = await getDb();
  if (!q) {
    const res = await db.execute(`
      SELECT name, section, unit, COUNT(*) AS uses
      FROM shopping_items
      GROUP BY lower(name)
      ORDER BY uses DESC, name COLLATE NOCASE ASC
      LIMIT 20
    `);
    return NextResponse.json({ suggestions: res.rows });
  }
  const res = await db.execute({
    sql: `
      SELECT name, section, unit, COUNT(*) AS uses
      FROM shopping_items
      WHERE lower(name) LIKE ?
      GROUP BY lower(name)
      ORDER BY uses DESC, name COLLATE NOCASE ASC
      LIMIT 15
    `,
    args: [`%${q}%`],
  });
  return NextResponse.json({ suggestions: res.rows });
}
