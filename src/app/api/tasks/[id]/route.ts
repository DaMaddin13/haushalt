import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db";
import { parseRecurrence, nextDueDate, serializeRecurrence } from "@/lib/recurrence";
import { todayVienna, weekdayOfISO, dayOfMonthOfISO, monthDayOfISO } from "@/lib/dates";
import type { Priority, Recurrence, RecurrenceKind, TaskStatus } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    title?: string;
    note?: string | null;
    area_id?: string | null;
    priority?: Priority;
    due_date?: string | null;
    status?: TaskStatus;
    recurrence?: Recurrence | null;
    recurrence_kind?: RecurrenceKind | "" | null;
    weekday?: number;
    dayOfMonth?: number;
    monthDay?: string;
  };

  const db = await getDb();
  const existing = await db.execute({
    sql: "SELECT * FROM tasks WHERE id = ?",
    args: [id],
  });
  if (!existing.rows.length) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }
  const task = existing.rows[0] as Record<string, unknown>;
  const stamped = nowIso();

  // Completing a recurring task → keep series, spawn next
  if (body.status === "erledigt" && task.status === "offen") {
    const recurrence = parseRecurrence(task.recurrence_json as string | null);
    await db.execute({
      sql: `UPDATE tasks SET status = 'erledigt', updated_at = ? WHERE id = ?`,
      args: [stamped, id],
    });

    if (recurrence && task.series_id) {
      const fromDue = (task.due_date as string) || todayVienna();
      const next = nextDueDate(recurrence, fromDue);
      // Only create if no open/existing for that date
      const exists = await db.execute({
        sql: `SELECT id FROM tasks WHERE series_id = ? AND due_date = ? LIMIT 1`,
        args: [task.series_id as string, next],
      });
      if (!exists.rows.length) {
        await db.execute({
          sql: `INSERT INTO tasks (id, title, note, area_id, priority, due_date, status, recurrence_json, series_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 'offen', ?, ?, ?, ?)`,
          args: [
            newId(),
            task.title as string,
            (task.note as string) ?? null,
            (task.area_id as string) ?? null,
            (task.priority as string) ?? "mittel",
            next,
            task.recurrence_json as string,
            task.series_id as string,
            stamped,
            stamped,
          ],
        });
      }
    }

    const row = await db.execute({
      sql: `SELECT t.*, a.name AS area_name FROM tasks t LEFT JOIN areas a ON a.id = t.area_id WHERE t.id = ?`,
      args: [id],
    });
    return NextResponse.json({ task: row.rows[0] });
  }

  // Reopen
  if (body.status === "offen" && task.status === "erledigt") {
    await db.execute({
      sql: `UPDATE tasks SET status = 'offen', updated_at = ? WHERE id = ?`,
      args: [stamped, id],
    });
  }

  let recurrenceJson = task.recurrence_json as string | null;
  let seriesId = task.series_id as string | null;

  if (body.recurrence !== undefined) {
    recurrenceJson = serializeRecurrence(body.recurrence);
    if (body.recurrence && !seriesId) seriesId = newId();
    if (!body.recurrence) {
      // clearing recurrence on this instance only — keep series_id historical or clear
      recurrenceJson = null;
    }
  } else if (body.recurrence_kind !== undefined) {
    if (!body.recurrence_kind) {
      recurrenceJson = null;
    } else {
      const due = (body.due_date !== undefined ? body.due_date : (task.due_date as string | null)) || todayVienna();
      const r: Recurrence = { kind: body.recurrence_kind };
      if (r.kind === "woechentlich") r.weekday = body.weekday ?? weekdayOfISO(due);
      if (r.kind === "monatlich") r.dayOfMonth = body.dayOfMonth ?? dayOfMonthOfISO(due);
      if (r.kind === "jaehrlich") r.monthDay = body.monthDay ?? monthDayOfISO(due);
      recurrenceJson = serializeRecurrence(r);
      if (!seriesId) seriesId = newId();
    }
  }

  const title = body.title !== undefined ? body.title.trim() : (task.title as string);
  const note = body.note !== undefined ? (body.note?.trim() || null) : ((task.note as string) ?? null);
  const area_id = body.area_id !== undefined ? body.area_id || null : ((task.area_id as string) ?? null);
  const priority = body.priority ?? (task.priority as string);
  const due_date = body.due_date !== undefined ? body.due_date : ((task.due_date as string) ?? null);
  const status = body.status ?? (task.status as string);

  await db.execute({
    sql: `UPDATE tasks SET title=?, note=?, area_id=?, priority=?, due_date=?, status=?, recurrence_json=?, series_id=?, updated_at=? WHERE id=?`,
    args: [title, note, area_id, priority, due_date, status, recurrenceJson, seriesId, stamped, id],
  });

  const row = await db.execute({
    sql: `SELECT t.*, a.name AS area_name FROM tasks t LEFT JOIN areas a ON a.id = t.area_id WHERE t.id = ?`,
    args: [id],
  });
  return NextResponse.json({ task: row.rows[0] });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM tasks WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
