# Haushalt — Plan

## Ziel
Gemeinsame Haushalts-App (Aufgaben, Budget, Einkauf) für zwei Personen/Geräte.
Eine Freischaltung (`HOUSEHOLD_PASSWORD`), geteilte Persistenz, deutsch (du), Mobile first.

## Stack
| Teil | Wahl | Begründung |
|------|------|------------|
| Framework | **Next.js 15** (App Router) + TypeScript + Tailwind | API + UI in einem Projekt, Vercel-fähig, kostenlos deploybar |
| DB | **LibSQL / Turso** (`@libsql/client`) | Eine gemeinsame DB für alle Clients. Lokal: `file:./data/haushalt.db`. Produktion: Turso Free (kein Kreditkarten-Zwang für Free-Tier). Fallback dokumentiert unten. |
| Auth | Server-Route + **httpOnly Cookie** (Session-Token, mehrere Tage) | Passwort nur serverseitig gegen `HOUSEHOLD_PASSWORD`. Kein Klartext im Bundle. |
| Sync | **Polling 4 s** auf Listen/Dashboards + manueller Refresh-Button | Beide Geräte sehen Änderungen ohne Hard-Reload. Kein Websocket nötig für v1. |
| Zeitzone | `Europe/Vienna` (date-fns-tz / Temporal wo sinnvoll) | Stichtage für wiederkehrende Aufgaben |
| Hosting | **Vercel Hobby** (Preview-URL) | Kostenlos, Next.js native. Env: `HOUSEHOLD_PASSWORD`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SESSION_SECRET` |

## Auth-Flow
1. `/login` — ein Passwortfeld. Falsch → „Passwort ungültig.“ (kein Feld-Hinweis).
2. POST `/api/auth/login` prüft `HOUSEHOLD_PASSWORD` serverseitig (timing-safe compare).
3. Bei Erfolg: Cookie `haushalt_session` = HMAC/signiertes Token (`SESSION_SECRET`), `httpOnly`, `secure` in Prod, `sameSite=lax`, Max-Age ~7 Tage.
4. Middleware schützt alle App-Routen außer `/login` und Auth-API.
5. Logout: Cookie löschen via `/api/auth/logout`.
6. Passwort und Secrets **nie** committen. Nur `.env.example`.

## Datenmodell (LibSQL)
- `areas` — id, name, sort, (Defaults: Küche, Bad, Büro, Garten, Admin, Sonstiges)
- `tasks` — id, title, note, area_id, priority, due_date, status, recurrence_json?, series_id?, created_at, updated_at
- `budget_settings` — month_income (optional), updated_at
- `budget_categories` — id, name
- `fixed_costs` — id, name, amount_cents, category_id, booking_day (1–28)
- `expenses` — id, date, amount_cents, category_id, note, is_fixed_override?, fixed_cost_id?, month_key
- `shopping_lists` — id, name
- `shopping_items` — id, list_id, name, qty, unit, section, checked, created_at
- Beträge in **Cents** speichern, Anzeige in EUR.

## Sync
- Client: `useSWR` / eigenes Hook mit `refreshInterval: 4000` auf `/api/tasks`, `/api/budget`, `/api/shopping`.
- Optimistic UI optional; nach Mutation `mutate()` + Poll.
- Refresh-Button in der Kopfzeile.

## Module (v1)
1. **Aufgaben** — CRUD, Filter/Sort, Ansichten Heute / Diese Woche / Alle, Wiederkehrend (täglich/wöchentlich/monatlich/jährlich). Am Stichtag (Europe/Vienna) offene Instanz; Erledigen erhält Serie und berechnet nächstes Datum.
2. **Budget** — Einkommen, Fixkosten, Extra-Ausgaben, Monats-Dashboard (Fix / Extra / Gesamt / Rest), Kategorien.
3. **Einkauf** — Listen, Einträge (Enter), Duplikat-Hinweis/Menge+, Abhaken, Erledigte entfernen, Sortierung Abteilung→Name, Vorschläge aus Historie.

## Design
Minimalistisch, viel Weißraum, eine Akzentfarbe (Petrol/Teal), große Touch-Ziele, Hell zuerst, freundliche Leere-Zustände. Kein Bring-Branding.

## Fallback wenn Turso/Vercel Karte verlangt
Stoppen und Nutzer holen (laut Auftrag). Alternativen ohne Karte zum Prüfen: Cloudflare Pages + D1, oder kleiner Host mit persistenter Disk + SQLite-Datei. Wahl dann in diesem File nachziehen.

## Lieferobjekte
- Preview-URL
- Repo-URL
- `ABNAHME.md`
- `README.md` (Env setzen, lokal starten)
- `.env.example` (ohne echte Secrets)


## Status (Implementierung)

v1 im Repo umgesetzt: Next.js 15 App Router, LibSQL, Auth-Cookie, Aufgaben/Budget/Einkauf, Polling 4s.
Lokal: `npm run dev` mit `.env.local`. Deploy/Preview/ABNAHME übernimmt Parent.
