"use client";

import { FormEvent, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { usePoll } from "@/lib/hooks";
import { formatEur, parseEurToCentsSimple } from "@/lib/money";
import type { BudgetCategory, Expense, FixedCost } from "@/lib/types";

type BudgetResponse = {
  month: string;
  settings: { month_income_cents: number | null; updated_at: string | null };
  categories: BudgetCategory[];
  fixedCosts: FixedCost[];
  expenses: Expense[];
  summary: {
    fix_cents: number;
    extra_cents: number;
    total_cents: number;
    rest_cents: number | null;
    income_cents: number | null;
  };
};

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, "0")}`;
}

export default function BudgetPage() {
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${(n.getMonth() + 1).toString().padStart(2, "0")}`;
  });
  const { data, error, isLoading, isValidating, mutate } = usePoll<BudgetResponse>(
    `/api/budget?month=${month}`
  );

  const [showIncome, setShowIncome] = useState(false);
  const [showFixed, setShowFixed] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [showCats, setShowCats] = useState(false);
  const [editFixed, setEditFixed] = useState<FixedCost | null>(null);

  const extras = useMemo(
    () => (data?.expenses ?? []).filter((e) => !e.fixed_cost_id),
    [data]
  );
  const fixedEntries = useMemo(
    () => (data?.expenses ?? []).filter((e) => e.fixed_cost_id),
    [data]
  );

  async function deleteExpense(e: Expense) {
    if (!confirm("Eintrag löschen?")) return;
    await fetch(`/api/budget/expenses/${e.id}`, { method: "DELETE" });
    mutate();
  }

  return (
    <>
      <Header title="Budget" onRefresh={() => mutate()} refreshing={isValidating} />
      <div className="space-y-4 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="btn btn-ghost px-3" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
            ←
          </button>
          <p className="font-semibold">
            {month.split("-").reverse().join(".")}
          </p>
          <button type="button" className="btn btn-ghost px-3" onClick={() => setMonth((m) => shiftMonth(m, 1))}>
            →
          </button>
        </div>

        {error && <p className="text-sm text-danger">{error.message}</p>}
        {isLoading && !data && <p className="text-sm text-muted">Lade…</p>}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <SummaryCard label="Fix" value={formatEur(data.summary.fix_cents)} />
              <SummaryCard label="Extra" value={formatEur(data.summary.extra_cents)} />
              <SummaryCard label="Gesamt" value={formatEur(data.summary.total_cents)} />
              <SummaryCard
                label="Rest"
                value={
                  data.summary.rest_cents != null
                    ? formatEur(data.summary.rest_cents)
                    : "—"
                }
                hint={data.summary.income_cents == null ? "Einkommen setzen" : undefined}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-ghost text-sm" onClick={() => setShowIncome(true)}>
                Einkommen
              </button>
              <button type="button" className="btn btn-ghost text-sm" onClick={() => { setEditFixed(null); setShowFixed(true); }}>
                + Fixkosten
              </button>
              <button type="button" className="btn btn-primary text-sm" onClick={() => { setEditExpense(null); setShowExtra(true); }}>
                + Ausgabe
              </button>
              <button type="button" className="btn btn-ghost text-sm" onClick={() => setShowCats(true)}>
                Kategorien
              </button>
            </div>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Fixkosten (Vorlage)</h2>
              {(data.fixedCosts ?? []).length === 0 && (
                <div className="empty card py-6">
                  <strong>Noch keine Fixkosten</strong>
                  Miete, Strom & Co. einmal anlegen — dann erscheinen sie jeden Monat.
                </div>
              )}
              <ul className="space-y-2">
                {data.fixedCosts.map((fc) => (
                  <li key={fc.id} className="card flex items-center justify-between gap-2">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { setEditFixed(fc); setShowFixed(true); }}>
                      <p className="font-medium">{fc.name}</p>
                      <p className="text-xs text-muted">
                        {fc.category_name || "Ohne Kategorie"} · Tag {fc.booking_day}
                      </p>
                    </button>
                    <span className="font-medium">{formatEur(fc.amount_cents)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Diesen Monat</h2>
              {fixedEntries.length === 0 && extras.length === 0 && (
                <div className="empty card py-6">
                  <strong>Keine Buchungen</strong>
                  Fixkosten werden automatisch geplant. Extra-Ausgaben kannst du hinzufügen.
                </div>
              )}
              <ul className="space-y-2">
                {[...fixedEntries, ...extras].map((e) => (
                  <li key={e.id} className="card">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => { setEditExpense(e); setShowExtra(true); }}
                      >
                        <p className="font-medium">{e.note || e.category_name || "Ausgabe"}</p>
                        <p className="text-xs text-muted">
                          {e.date.split("-").reverse().join(".")}
                          {e.category_name ? ` · ${e.category_name}` : ""}
                          {e.fixed_cost_id ? " · Fix" : ""}
                          {e.is_fixed_override ? " · angepasst" : ""}
                        </p>
                      </button>
                      <div className="text-right">
                        <p className="font-medium">{formatEur(e.amount_cents)}</p>
                        <button
                          type="button"
                          className="text-xs text-danger underline"
                          onClick={() => deleteExpense(e)}
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>

      {showIncome && data && (
        <IncomeModal
          cents={data.settings.month_income_cents}
          onClose={() => setShowIncome(false)}
          onSaved={() => { setShowIncome(false); mutate(); }}
        />
      )}
      {showFixed && (
        <FixedModal
          fixed={editFixed}
          categories={data?.categories ?? []}
          onClose={() => { setShowFixed(false); setEditFixed(null); }}
          onSaved={() => { setShowFixed(false); setEditFixed(null); mutate(); }}
        />
      )}
      {showExtra && (
        <ExpenseModal
          expense={editExpense}
          month={month}
          categories={data?.categories ?? []}
          onClose={() => { setShowExtra(false); setEditExpense(null); }}
          onSaved={() => { setShowExtra(false); setEditExpense(null); mutate(); }}
        />
      )}
      {showCats && (
        <CategoriesModal
          categories={data?.categories ?? []}
          onClose={() => setShowCats(false)}
          onChanged={() => mutate()}
        />
      )}
    </>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

function IncomeModal({
  cents,
  onClose,
  onSaved,
}: {
  cents: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(cents != null ? (cents / 100).toFixed(2).replace(".", ",") : "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      let month_income_cents: number | null = null;
      if (value.trim()) {
        const parsed = parseEurToCentsSimple(value);
        if (parsed == null) {
          setErr("Ungültiger Betrag");
          setSaving(false);
          return;
        }
        month_income_cents = parsed;
      }
      const res = await fetch("/api/budget/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month_income_cents }),
      });
      if (!res.ok) {
        setErr("Speichern fehlgeschlagen");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Monatliches Einkommen" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Betrag (EUR), leer = keines</span>
          <input className="input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="z. B. 3200,00" inputMode="decimal" />
        </label>
        {err && <p className="text-sm text-danger">{err}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={saving}>
          Speichern
        </button>
      </form>
    </Modal>
  );
}

function FixedModal({
  fixed,
  categories,
  onClose,
  onSaved,
}: {
  fixed: FixedCost | null;
  categories: BudgetCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(fixed?.name ?? "");
  const [amount, setAmount] = useState(
    fixed ? (fixed.amount_cents / 100).toFixed(2).replace(".", ",") : ""
  );
  const [categoryId, setCategoryId] = useState(fixed?.category_id ?? "");
  const [day, setDay] = useState(fixed?.booking_day ?? 1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save(e: FormEvent) {
    e.preventDefault();
    const cents = parseEurToCentsSimple(amount);
    if (cents == null) {
      setErr("Ungültiger Betrag");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        amount_cents: cents,
        category_id: categoryId || null,
        booking_day: day,
      };
      const res = await fetch(
        fixed ? `/api/budget/fixed-costs/${fixed.id}` : "/api/budget/fixed-costs",
        {
          method: fixed ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error || "Fehler");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!fixed) return;
    if (!confirm("Fixkosten-Vorlage löschen?")) return;
    await fetch(`/api/budget/fixed-costs/${fixed.id}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <Modal title={fixed ? "Fixkosten bearbeiten" : "Fixkosten anlegen"} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Betrag (EUR)</span>
          <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} required inputMode="decimal" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Kategorie</span>
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Buchungstag (1–28)</span>
          <input className="input" type="number" min={1} max={28} value={day} onChange={(e) => setDay(Number(e.target.value))} />
        </label>
        {err && <p className="text-sm text-danger">{err}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={saving}>Speichern</button>
        {fixed && (
          <button type="button" className="btn btn-danger w-full" onClick={remove}>Löschen</button>
        )}
      </form>
    </Modal>
  );
}

function ExpenseModal({
  expense,
  month,
  categories,
  onClose,
  onSaved,
}: {
  expense: Expense | null;
  month: string;
  categories: BudgetCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(expense?.date ?? `${month}-15`);
  const [amount, setAmount] = useState(
    expense ? (expense.amount_cents / 100).toFixed(2).replace(".", ",") : ""
  );
  const [categoryId, setCategoryId] = useState(expense?.category_id ?? "");
  const [note, setNote] = useState(expense?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save(e: FormEvent) {
    e.preventDefault();
    const cents = parseEurToCentsSimple(amount);
    if (cents == null) {
      setErr("Ungültiger Betrag");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date,
        amount_cents: cents,
        category_id: categoryId || null,
        note: note || null,
        month_key: date.slice(0, 7),
      };
      const res = await fetch(
        expense ? `/api/budget/expenses/${expense.id}` : "/api/budget/expenses",
        {
          method: expense ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error || "Fehler");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={expense ? "Eintrag bearbeiten" : "Extra-Ausgabe"} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Datum</span>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Betrag (EUR)</span>
          <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} required inputMode="decimal" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Kategorie</span>
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Notiz</span>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {err && <p className="text-sm text-danger">{err}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={saving}>Speichern</button>
      </form>
    </Modal>
  );
}

function CategoriesModal({
  categories,
  onClose,
  onChanged,
}: {
  categories: BudgetCategory[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/budget/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error || "Fehler");
      return;
    }
    setName("");
    onChanged();
  }

  async function remove(id: string) {
    if (!confirm("Kategorie löschen?")) return;
    await fetch(`/api/budget/categories/${id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <Modal title="Kategorien" onClose={onClose}>
      <ul className="mb-4 space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
            <span>{c.name}</span>
            <button type="button" className="text-xs text-danger underline" onClick={() => remove(c.id)}>
              Löschen
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="flex gap-2">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Neue Kategorie" required />
        <button type="submit" className="btn btn-primary shrink-0">+</button>
      </form>
      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-4 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" className="btn btn-ghost px-3" onClick={onClose}>
            Schließen
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
