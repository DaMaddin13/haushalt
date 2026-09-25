import { NextRequest, NextResponse } from "next/server";
import { getDb, newId } from "@/lib/db";
import { monthKeyVienna } from "@/lib/dates";

/** Ensure planned fixed-cost expense rows exist for the month */
async function ensureFixedForMonth(db: Awaited<ReturnType<typeof getDb>>, monthKey: string) {
  const fixed = await db.execute("SELECT * FROM fixed_costs");
  for (const fc of fixed.rows) {
    const existing = await db.execute({
      sql: `SELECT id FROM expenses WHERE fixed_cost_id = ? AND month_key = ? LIMIT 1`,
      args: [fc.id as string, monthKey],
    });
    if (existing.rows.length) continue;
    const day = Math.min(Math.max(Number(fc.booking_day) || 1, 1), 28);
    const date = `${monthKey}-${day.toString().padStart(2, "0")}`;
    await db.execute({
      sql: `INSERT INTO expenses (id, date, amount_cents, category_id, note, is_fixed_override, fixed_cost_id, month_key)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      args: [
        newId(),
        date,
        fc.amount_cents as number,
        (fc.category_id as string) ?? null,
        fc.name as string,
        fc.id as string,
        monthKey,
      ],
    });
  }
}

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") || monthKeyVienna();
  const db = await getDb();
  await ensureFixedForMonth(db, month);

  const settings = await db.execute("SELECT * FROM budget_settings WHERE id = 1");
  const categories = await db.execute("SELECT * FROM budget_categories ORDER BY name");
  const fixedCosts = await db.execute(`
    SELECT f.*, c.name AS category_name
    FROM fixed_costs f
    LEFT JOIN budget_categories c ON c.id = f.category_id
    ORDER BY f.booking_day, f.name
  `);
  const expenses = await db.execute({
    sql: `
      SELECT e.*, c.name AS category_name
      FROM expenses e
      LEFT JOIN budget_categories c ON c.id = e.category_id
      WHERE e.month_key = ?
      ORDER BY e.date ASC, e.id ASC
    `,
    args: [month],
  });

  const income = settings.rows[0]?.month_income_cents != null
    ? Number(settings.rows[0].month_income_cents)
    : null;

  let fixTotal = 0;
  let extraTotal = 0;
  for (const e of expenses.rows) {
    const amt = Number(e.amount_cents);
    if (e.fixed_cost_id) fixTotal += amt;
    else extraTotal += amt;
  }
  const total = fixTotal + extraTotal;
  const rest = income != null ? income - total : null;

  return NextResponse.json({
    month,
    settings: {
      month_income_cents: income,
      updated_at: settings.rows[0]?.updated_at ?? null,
    },
    categories: categories.rows,
    fixedCosts: fixedCosts.rows,
    expenses: expenses.rows,
    summary: {
      fix_cents: fixTotal,
      extra_cents: extraTotal,
      total_cents: total,
      rest_cents: rest,
      income_cents: income,
    },
  });
}
