import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db";
import { listTasks } from "@/lib/tasks";
import { weekRangeVienna, todayVienna, weekdayOfISO, dayOfMonthOfISO, monthDayOfISO } from "@/lib/dates";
import { serializeRecurrence } from "@/lib/recurrence";
import type { Priority, Recurrence, RecurrenceKind } from "@/lib/types";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const view = (sp.get("view") as "heute" | "woche" | "alle" | null) ?? "alle";
  const area_id = sp.get("area_id");
  const status = sp.get("status");
  const priority = sp.get("priority");
  const week = weekRangeVienna();
  const db = await getDb();
  const tasks = await listTasks(db, {
    view: view === "alle" ? "alle" : view,
    area_id,
    status,
    priority,
    weekStart: week.start,
    weekEnd: week.end,
    today: todayVienna(),
  });
  return NextResponse.json({ tasks, today: todayVienna(), week });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    title?: string;
    note?: string;
    area_id?: string | null;
    priority?: Priority;
    due_date?: string | null;
    recurrence?: Recurrence | null;
    recurrence_kind?: RecurrenceKind | null;
    weekday?: number;
    dayOfMonth?: number;
    monthDay?: string;
  };

  const title = (body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Titel fehlt" }, { status: 400 });

  let recurrence: Recurrence | null = body.recurrence ?? null;
  if (!recurrence && body.recurrence_kind) {
    recurrence = { kind: body.recurrence_kind };
    if (body.recurrence_kind === "woechentlich") {
      recurrence.weekday = body.weekday ?? (body.due_date ? weekdayOfISO(body.due_date) : 1);
    }
    if (body.recurrence_kind === "monatlich") {
      recurrence.dayOfMonth = body.dayOfMonth ?? (body.due_date ? dayOfMonthOfISO(body.due_date) : 1);
    }
    if (body.recurrence_kind === "jaehrlich") {
      recurrence.monthDay = body.monthDay ?? (body.due_date ? monthDayOfISO(body.due_date) : "01-01");
    }
  }

  // If recurring but no due date, set due to today
  let due = body.due_date ?? null;
  if (recurrence && !due) due = todayVienna();

  const id = newId();
  const seriesId = recurrence ? newId() : null;
  const stamped = nowIso();
  const db = await getDb();

  await db.execute({
    sql: `INSERT INTO tasks (id, title, note, area_id, priority, due_date, status, recurrence_json, series_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 'offen', ?, ?, ?, ?)`,
    args: [
      id,
      title,
      body.note?.trim() || null,
      body.area_id || null,
      body.priority ?? "mittel",
      due,
      serializeRecurrence(recurrence),
      seriesId,
      stamped,
      stamped,
    ],
  });

  const row = await db.execute({
    sql: `SELECT t.*, a.name AS area_name FROM tasks t LEFT JOIN areas a ON a.id = t.area_id WHERE t.id = ?`,
    args: [id],
  });

  return NextResponse.json({ task: row.rows[0] }, { status: 201 });
}
