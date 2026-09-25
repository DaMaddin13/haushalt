import type { Client } from "@libsql/client";
import { todayVienna } from "./dates";
import { parseRecurrence, nextDueDate } from "./recurrence";
import { newId, nowIso } from "./db";
import type { Task } from "./types";

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: String(row.id),
    title: String(row.title),
    note: row.note != null ? String(row.note) : null,
    area_id: row.area_id != null ? String(row.area_id) : null,
    area_name: row.area_name != null ? String(row.area_name) : null,
    priority: row.priority as Task["priority"],
    due_date: row.due_date != null ? String(row.due_date) : null,
    status: row.status as Task["status"],
    recurrence_json: row.recurrence_json != null ? String(row.recurrence_json) : null,
    series_id: row.series_id != null ? String(row.series_id) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/**
 * Ensure open instances exist for recurring series that are due today (Vienna).
 * For each series: find latest task by due_date; if no open task with due_date <= today
 * and the next due after last completed/anchor is today or past, create open instance(s)
 * up to today.
 */
export async function ensureRecurringInstances(db: Client, now: Date = new Date()) {
  const today = todayVienna(now);

  // Find distinct series that have recurrence
  const seriesRows = await db.execute(`
    SELECT series_id, recurrence_json, title, note, area_id, priority
    FROM tasks
    WHERE series_id IS NOT NULL AND recurrence_json IS NOT NULL
    GROUP BY series_id
  `);

  for (const row of seriesRows.rows) {
    const seriesId = String(row.series_id);
    const recurrence = parseRecurrence(row.recurrence_json as string);
    if (!recurrence) continue;

    // Latest due date in series
    const latest = await db.execute({
      sql: `SELECT due_date, status FROM tasks WHERE series_id = ? AND due_date IS NOT NULL ORDER BY due_date DESC LIMIT 1`,
      args: [seriesId],
    });
    const latestRow = latest.rows[0];
    if (!latestRow?.due_date) continue;

    const latestDue = String(latestRow.due_date);
    const latestStatus = String(latestRow.status);

    // Any open instance already?
    const open = await db.execute({
      sql: `SELECT id, due_date FROM tasks WHERE series_id = ? AND status = 'offen' ORDER BY due_date ASC LIMIT 1`,
      args: [seriesId],
    });
    if (open.rows.length > 0) {
      // If open due is in the future beyond today, fine; if overdue, leave it
      continue;
    }

    // No open instance — compute next due after latest (if completed) or use latest if still somehow missing open
    let next: string;
    if (latestStatus === "erledigt") {
      next = nextDueDate(recurrence, latestDue);
    } else {
      // Shouldn't happen often (we continue if open exists), but if latest is open we already continued
      next = latestDue;
    }

    // Create instances from next up to and including today
    const stamped = nowIso();
    let guard = 0;
    while (next <= today && guard < 400) {
      // Avoid duplicates
      const exists = await db.execute({
        sql: `SELECT id FROM tasks WHERE series_id = ? AND due_date = ? LIMIT 1`,
        args: [seriesId, next],
      });
      if (exists.rows.length === 0) {
        await db.execute({
          sql: `INSERT INTO tasks (id, title, note, area_id, priority, due_date, status, recurrence_json, series_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 'offen', ?, ?, ?, ?)`,
          args: [
            newId(),
            String(row.title),
            row.note ?? null,
            row.area_id ?? null,
            String(row.priority ?? "mittel"),
            next,
            row.recurrence_json as string,
            seriesId,
            stamped,
            stamped,
          ],
        });
      }
      next = nextDueDate(recurrence, next);
      guard++;
    }
  }
}

export async function listTasks(
  db: Client,
  opts: {
    view?: "heute" | "woche" | "alle";
    area_id?: string | null;
    status?: string | null;
    priority?: string | null;
    weekStart?: string;
    weekEnd?: string;
    today?: string;
  } = {}
): Promise<Task[]> {
  await ensureRecurringInstances(db);

  const today = opts.today ?? todayVienna();
  const clauses: string[] = [];
  const args: (string | number | null)[] = [];

  if (opts.area_id) {
    clauses.push("t.area_id = ?");
    args.push(opts.area_id);
  }
  if (opts.status) {
    clauses.push("t.status = ?");
    args.push(opts.status);
  }
  if (opts.priority) {
    clauses.push("t.priority = ?");
    args.push(opts.priority);
  }

  if (opts.view === "heute") {
    // today + overdue open + due today
    clauses.push(`(
      (t.status = 'offen' AND t.due_date IS NOT NULL AND t.due_date <= ?)
      OR (t.due_date = ?)
    )`);
    args.push(today, today);
  } else if (opts.view === "woche" && opts.weekStart && opts.weekEnd) {
    clauses.push(`(
      (t.status = 'offen' AND t.due_date IS NOT NULL AND t.due_date < ?)
      OR (t.due_date IS NOT NULL AND t.due_date >= ? AND t.due_date <= ?)
    )`);
    args.push(opts.weekStart, opts.weekStart, opts.weekEnd);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const result = await db.execute({
    sql: `
      SELECT t.*, a.name AS area_name
      FROM tasks t
      LEFT JOIN areas a ON a.id = t.area_id
      ${where}
      ORDER BY
        CASE t.status WHEN 'offen' THEN 0 ELSE 1 END,
        CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END,
        t.due_date ASC,
        CASE t.priority WHEN 'hoch' THEN 0 WHEN 'mittel' THEN 1 ELSE 2 END,
        t.created_at DESC
    `,
    args,
  });

  return result.rows.map((r) => rowToTask(r as Record<string, unknown>));
}

export { rowToTask };
