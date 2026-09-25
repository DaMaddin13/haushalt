# Haushalt

Gemeinsame Haushalts-App für zwei Personen: **Aufgaben**, **Budget** und **Einkauf**.
Deutsch (du), Mobile first, eine Freischaltung per Passwort, geteilte LibSQL-Datenbank.

## Voraussetzungen

- Node.js 20+
- npm

## Lokal starten

```bash
cd haushalt
cp .env.example .env.local
# HOUSEHOLD_PASSWORD und SESSION_SECRET setzen
npm install
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) und logge dich mit dem Passwort ein.

Ohne `TURSO_*` legt die App automatisch `./data/haushalt.db` an (wird bei erstem API-Zugriff geseedet).

### Scripts

| Script | Beschreibung |
|--------|----------------|
| `npm run dev` | Entwicklungsserver |
| `npm run build` | Produktions-Build |
| `npm start` | Build starten |
| `node scripts/test-recurrence.mjs` | Wiederholungs-Logik testen |

## Umgebungsvariablen

Siehe `.env.example`:

| Variable | Pflicht | Beschreibung |
|----------|---------|--------------|
| `HOUSEHOLD_PASSWORD` | ja | Gemeinsames Passwort |
| `SESSION_SECRET` | ja | Langer Zufallsstring für Session-Cookie |
| `TURSO_DATABASE_URL` | nein | LibSQL/Turso URL (Prod) |
| `TURSO_AUTH_TOKEN` | nein | Turso Auth Token |

Secrets nie committen. `.env.local` und `data/*.db` sind in `.gitignore`.

## Deploy (Vercel + Turso)

1. Turso-Datenbank anlegen, URL + Token notieren.
2. Projekt auf Vercel verbinden.
3. Env setzen: `HOUSEHOLD_PASSWORD`, `SESSION_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`.
4. Deployen. Schema + Seed laufen beim ersten DB-Zugriff.

Fallback ohne Karte: siehe `PLAN.md` (Cloudflare D1 o. ä.).

## Features (v1)

- **Auth** — Passwort-Gate, httpOnly Session (~7 Tage), Logout
- **Aufgaben** — CRUD, Bereiche, Priorität, Fälligkeit, Heute / Woche / Alle, Wiederholung (täglich/wöchentlich/monatlich/jährlich), Zeitzone Europe/Vienna
- **Budget** — Einkommen, Fixkosten, Extra-Ausgaben, Monats-Dashboard, Kategorien (Beträge in Cents)
- **Einkauf** — Listen, Mengen, Abteilungen, Duplikat→Menge+, Abhaken, Vorschläge, Polling ~4 s

## Technik

- Next.js 15 (App Router), TypeScript, Tailwind
- `@libsql/client` (lokal file / Turso)
- SWR mit `refreshInterval: 4000` + manueller Refresh
