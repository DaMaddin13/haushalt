"use client";

import { FormEvent, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { usePoll } from "@/lib/hooks";
import { recurrenceLabel, parseRecurrence } from "@/lib/recurrence";
import type { Area, Priority, RecurrenceKind, Task } from "@/lib/types";

type TasksResponse = {
  tasks: Task[];
  today: string;
  week: { start: string; end: string };
};

const PRIORITIES: Priority[] = ["niedrig", "mittel", "hoch"];
const VIEWS = [
  { id: "heute", label: "Heute" },
  { id: "woche", label: "Diese Woche" },
  { id: "alle", label: "Alle" },
] as const;

const WEEKDAYS = [
  { v: 1, l: "Mo" },
  { v: 2, l: "Di" },
  { v: 3, l: "Mi" },
  { v: 4, l: "Do" },
  { v: 5, l: "Fr" },
  { v: 6, l: "Sa" },
  { v: 0, l: "So" },
];

function priorityClass(p: Priority) {
  if (p === "hoch") return "text-danger";
  if (p === "niedrig") return "text-muted";
  return "text-warning";
}

export default function AufgabenPage() {
  const [view, setView] = useState<"heute" | "woche" | "alle">("heute");
  const [areaId, setAreaId] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams({ view });
    if (areaId) p.set("area_id", areaId);
    if (status) p.set("status", status);
    if (priority) p.set("priority", priority);
    return p.toString();
  }, [view, areaId, status, priority]);

  const { data, error, isLoading, isValidating, mutate } = usePoll<TasksResponse>(
    `/api/tasks?${qs}`
  );
  const { data: areasData, mutate: mutateAreas } = usePoll<{ areas: Area[] }>("/api/areas");

  async function toggleDone(task: Task) {
    const next = task.status === "offen" ? "erledigt" : "offen";
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    mutate();
  }

  async function remove(task: Task) {
    if (!confirm(`„${task.title}" wirklich löschen?`)) return;
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    mutate();
  }

  return (
    <>
      <Header title="Aufgaben" onRefresh={() => mutate()} refreshing={isValidating} />
      <div className="space-y-4 px-4 py-4">
        <div className="flex flex-wrap gap-2">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              className="chip"
              data-active={view === v.id}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <select
            className="input text-sm"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            aria-label="Bereich"
          >
            <option value="">Bereich</option>
            {(areasData?.areas ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            className="input text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Status"
          >
            <option value="">Status</option>
            <option value="offen">Offen</option>
            <option value="erledigt">Erledigt</option>
          </select>
          <select
            className="input text-sm"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            aria-label="Priorität"
          >
            <option value="">Priorität</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <button type="button" className="btn btn-primary w-full" onClick={() => { setEditing(null); setShowForm(true); }}>
          + Neue Aufgabe
        </button>

        {error && <p className="text-sm text-danger">{error.message}</p>}
        {isLoading && !data && <p className="text-sm text-muted">Lade…</p>}

        {!isLoading && data && data.tasks.length === 0 && (
          <div className="empty card">
            <strong>Alles ruhig hier</strong>
            Keine Aufgaben in dieser Ansicht. Leg eine an oder wechsle den Filter.
          </div>
        )}

        <ul className="space-y-2">
          {(data?.tasks ?? []).map((task) => {
            const rec = parseRecurrence(task.recurrence_json);
            const overdue =
              task.status === "offen" &&
              task.due_date &&
              data?.today &&
              task.due_date < data.today;
            return (
              <li key={task.id} className="card flex gap-3">
                <button
                  type="button"
                  onClick={() => toggleDone(task)}
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                    task.status === "erledigt"
                      ? "border-accent bg-accent text-white"
                      : "border-border"
                  }`}
                  aria-label={task.status === "erledigt" ? "Wieder öffnen" : "Erledigen"}
                >
                  {task.status === "erledigt" ? "✓" : ""}
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => { setEditing(task); setShowForm(true); }}
                  >
                    <p
                      className={`font-medium ${
                        task.status === "erledigt" ? "text-muted line-through" : ""
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted">
                      {task.area_name && <span>{task.area_name}</span>}
                      <span className={priorityClass(task.priority)}>{task.priority}</span>
                      {task.due_date && (
                        <span className={overdue ? "font-medium text-danger" : ""}>
                          {overdue ? "Überfällig · " : ""}
                          {task.due_date.split("-").reverse().join(".")}
                        </span>
                      )}
                      {rec && <span>↻ {recurrenceLabel(rec)}</span>}
                    </div>
                    {task.note && (
                      <p className="mt-1 text-sm text-muted line-clamp-2">{task.note}</p>
                    )}
                  </button>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="text-xs text-muted underline" onClick={() => { setEditing(task); setShowForm(true); }}>
                      Bearbeiten
                    </button>
                    <button type="button" className="text-xs text-danger underline" onClick={() => remove(task)}>
                      Löschen
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {showForm && (
        <TaskForm
          task={editing}
          areas={areasData?.areas ?? []}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); mutate(); mutateAreas(); }}
          onAreaCreated={() => mutateAreas()}
        />
      )}
    </>
  );
}

function TaskForm({
  task,
  areas,
  onClose,
  onSaved,
  onAreaCreated,
}: {
  task: Task | null;
  areas: Area[];
  onClose: () => void;
  onSaved: () => void;
  onAreaCreated: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [note, setNote] = useState(task?.note ?? "");
  const [areaId, setAreaId] = useState(task?.area_id ?? "");
  const [newArea, setNewArea] = useState("");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "mittel");
  const [due, setDue] = useState(task?.due_date ?? "");
  const rec0 = parseRecurrence(task?.recurrence_json ?? null);
  const [recKind, setRecKind] = useState<RecurrenceKind | "">(rec0?.kind ?? "");
  const [weekday, setWeekday] = useState(rec0?.weekday ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState(rec0?.dayOfMonth ?? 1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function ensureArea(): Promise<string | null> {
    if (newArea.trim()) {
      const res = await fetch("/api/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newArea.trim() }),
      });
      const data = await res.json();
      onAreaCreated();
      return data.area?.id ?? null;
    }
    return areaId || null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const aid = await ensureArea();
      const payload: Record<string, unknown> = {
        title,
        note: note || null,
        area_id: aid,
        priority,
        due_date: due || null,
        recurrence_kind: recKind || null,
        weekday,
        dayOfMonth,
      };
      const res = await fetch(task ? `/api/tasks/${task.id}` : "/api/tasks", {
        method: task ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Speichern fehlgeschlagen");
        return;
      }
      onSaved();
    } catch {
      setErr("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <form
        onSubmit={onSubmit}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-4 shadow-xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{task ? "Aufgabe bearbeiten" : "Neue Aufgabe"}</h2>
          <button type="button" className="btn btn-ghost px-3" onClick={onClose}>
            Schließen
          </button>
        </div>
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Titel</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Notiz</span>
            <textarea className="input min-h-[80px]" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Bereich</span>
            <select className="input" value={areaId} onChange={(e) => { setAreaId(e.target.value); setNewArea(""); }}>
              <option value="">—</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Oder neuer Bereich</span>
            <input className="input" value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder="z. B. Keller" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Priorität</span>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Fällig</span>
            <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Wiederholung</span>
            <select className="input" value={recKind} onChange={(e) => setRecKind(e.target.value as RecurrenceKind | "")}>
              <option value="">Keine</option>
              <option value="taeglich">Täglich</option>
              <option value="woechentlich">Wöchentlich</option>
              <option value="monatlich">Monatlich</option>
              <option value="jaehrlich">Jährlich</option>
            </select>
          </label>
          {recKind === "woechentlich" && (
            <label className="block space-y-1">
              <span className="text-sm font-medium">Wochentag</span>
              <select className="input" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
                {WEEKDAYS.map((d) => (
                  <option key={d.v} value={d.v}>{d.l}</option>
                ))}
              </select>
            </label>
          )}
          {recKind === "monatlich" && (
            <label className="block space-y-1">
              <span className="text-sm font-medium">Tag im Monat (1–28)</span>
              <input
                className="input"
                type="number"
                min={1}
                max={28}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Number(e.target.value))}
              />
            </label>
          )}
          {err && <p className="text-sm text-danger">{err}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={saving}>
            {saving ? "Speichere…" : "Speichern"}
          </button>
        </div>
      </form>
    </div>
  );
}
