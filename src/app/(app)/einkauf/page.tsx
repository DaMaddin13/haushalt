"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { usePoll } from "@/lib/hooks";
import type { ShoppingItem, ShoppingList } from "@/lib/types";

type ListsResponse = { lists: ShoppingList[] };
type ItemsResponse = { items: ShoppingItem[] };
type SuggestionsResponse = { suggestions: { name: string; section: string | null; unit: string | null; uses: number }[] };

export default function EinkaufPage() {
  const { data: listsData, mutate: mutateLists } = usePoll<ListsResponse>("/api/shopping/lists");
  const lists = useMemo(() => listsData?.lists ?? [], [listsData]);
  const [listId, setListId] = useState<string>("");

  useEffect(() => {
    if (!listId && lists.length) setListId(lists[0]!.id);
  }, [lists, listId]);

  const { data, error, isLoading, isValidating, mutate } = usePoll<ItemsResponse>(
    listId ? `/api/shopping/items?list_id=${listId}` : null
  );

  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [section, setSection] = useState("");
  const [hint, setHint] = useState("");
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState("");

  const { data: suggestions } = usePoll<SuggestionsResponse>(
    name.trim().length >= 1 ? `/api/shopping/suggestions?q=${encodeURIComponent(name.trim())}` : "/api/shopping/suggestions"
  );

  const items = useMemo(() => data?.items ?? [], [data]);
  const open = useMemo(() => items.filter((i) => !i.checked), [items]);
  const checked = useMemo(() => items.filter((i) => i.checked), [items]);

  async function addItem(e?: FormEvent, override?: Partial<{ name: string; qty: string; unit: string; section: string }>) {
    e?.preventDefault();
    const n = (override?.name ?? name).trim();
    if (!n || !listId) return;
    setHint("");
    const qRaw = override?.qty ?? qty;
    const payload: Record<string, unknown> = {
      list_id: listId,
      name: n,
      unit: (override?.unit ?? unit).trim() || null,
      section: (override?.section ?? section).trim() || null,
    };
    if (qRaw.trim()) {
      const q = Number(qRaw.replace(",", "."));
      if (Number.isFinite(q)) payload.qty = q;
    }
    const res = await fetch("/api/shopping/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.duplicated) {
      setHint(`„${n}" war schon auf der Liste — Menge erhöht.`);
    }
    setName("");
    setQty("");
    // keep unit/section as convenience
    mutate();
  }

  async function toggle(item: ShoppingItem) {
    await fetch(`/api/shopping/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked: !item.checked }),
    });
    mutate();
  }

  async function removeItem(item: ShoppingItem) {
    await fetch(`/api/shopping/items/${item.id}`, { method: "DELETE" });
    mutate();
  }

  async function clearChecked() {
    if (!listId) return;
    if (!checked.length) return;
    if (!confirm("Erledigte Einträge entfernen?")) return;
    await fetch(`/api/shopping/items?list_id=${listId}&checked=1`, { method: "DELETE" });
    mutate();
  }

  async function createList(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/shopping/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newListName.trim() }),
    });
    const data = await res.json();
    await mutateLists();
    if (data.list?.id) setListId(data.list.id);
    setNewListName("");
    setShowNewList(false);
  }

  return (
    <>
      <Header title="Einkauf" onRefresh={() => mutate()} refreshing={isValidating} />
      <div className="space-y-4 px-4 py-4">
        <div className="flex gap-2">
          <select
            className="input"
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            aria-label="Liste"
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-ghost shrink-0" onClick={() => setShowNewList(true)}>
            + Liste
          </button>
        </div>

        <form onSubmit={(e) => addItem(e)} className="card space-y-2">
          <input
            className="input"
            placeholder="Artikel hinzufügen…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            list="suggestions"
            autoComplete="off"
          />
          <datalist id="suggestions">
            {(suggestions?.suggestions ?? []).map((s) => (
              <option key={s.name} value={s.name} />
            ))}
          </datalist>
          <div className="grid grid-cols-3 gap-2">
            <input className="input" placeholder="Menge" value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" />
            <input className="input" placeholder="Einheit" value={unit} onChange={(e) => setUnit(e.target.value)} />
            <input className="input" placeholder="Abteilung" value={section} onChange={(e) => setSection(e.target.value)} />
          </div>
          {name.trim() && (suggestions?.suggestions ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(suggestions?.suggestions ?? []).slice(0, 6).map((s) => (
                <button
                  key={s.name}
                  type="button"
                  className="chip text-xs"
                  onClick={() =>
                    addItem(undefined, {
                      name: s.name,
                      section: s.section ?? "",
                      unit: s.unit ?? "",
                      qty: qty || "1",
                    })
                  }
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
          <button type="submit" className="btn btn-primary w-full">
            Hinzufügen
          </button>
          {hint && <p className="text-sm text-accent">{hint}</p>}
        </form>

        {error && <p className="text-sm text-danger">{error.message}</p>}
        {isLoading && !data && <p className="text-sm text-muted">Lade…</p>}

        {!isLoading && open.length === 0 && checked.length === 0 && (
          <div className="empty card">
            <strong>Die Liste ist leer</strong>
            Tippe einen Artikel ein und drücke Enter — beide Geräte sehen dieselbe Liste.
          </div>
        )}

        <ItemGroup title="Zu kaufen" items={open} onToggle={toggle} onRemove={removeItem} />

        {checked.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Im Wagen</h2>
              <button type="button" className="text-sm text-accent underline" onClick={clearChecked}>
                Erledigte entfernen
              </button>
            </div>
            <ItemGroup title="" items={checked} onToggle={toggle} onRemove={removeItem} muted />
          </>
        )}
      </div>

      {showNewList && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
          <form onSubmit={createList} className="w-full max-w-lg rounded-t-2xl bg-card p-4 sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Neue Liste</h2>
              <button type="button" className="btn btn-ghost px-3" onClick={() => setShowNewList(false)}>
                Schließen
              </button>
            </div>
            <input
              className="input mb-3"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="z. B. Baumarkt"
              required
              autoFocus
            />
            <button type="submit" className="btn btn-primary w-full">
              Anlegen
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function ItemGroup({
  title,
  items,
  onToggle,
  onRemove,
  muted,
}: {
  title: string;
  items: ShoppingItem[];
  onToggle: (i: ShoppingItem) => void;
  onRemove: (i: ShoppingItem) => void;
  muted?: boolean;
}) {
  if (!items.length) return null;
  return (
    <section className="space-y-2">
      {title && (
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      )}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className={`card flex items-center gap-3 ${muted ? "opacity-70" : ""}`}>
            <button
              type="button"
              onClick={() => onToggle(item)}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                item.checked ? "border-accent bg-accent text-white" : "border-border"
              }`}
              aria-label={item.checked ? "Zurück auf die Liste" : "Abhaken"}
            >
              {item.checked ? "✓" : ""}
            </button>
            <div className="min-w-0 flex-1">
              <p className={`font-medium ${item.checked ? "line-through text-muted" : ""}`}>
                {item.name}
                {(item.qty != null || item.unit) && (
                  <span className="ml-1 font-normal text-muted">
                    · {[item.qty, item.unit].filter(Boolean).join(" ")}
                  </span>
                )}
              </p>
              {item.section && <p className="text-xs text-muted">{item.section}</p>}
            </div>
            <button type="button" className="text-xs text-danger underline" onClick={() => onRemove(item)}>
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
