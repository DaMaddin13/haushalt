# Abnahme — Haushalt

Stand: 25.09.2026 (Europe/Vienna)

## URLs

| Was | URL |
|-----|-----|
| **Preview / App** | https://haushalt-nu.vercel.app |
| Deployment (direkt) | https://haushalt-2lfro4skh-hobby-team12.vercel.app |
| **Repo** | https://github.com/DaMaddin13/haushalt |

## Zugang

- Gemeinsames Passwort: `pupahome`
- Nach Login: Session-Cookie (~7 Tage)
- Falsches Passwort → „Passwort ungültig.“
- Logout über den Button in der App
- Passwort liegt nur in der Server-Env `HOUSEHOLD_PASSWORD` (Vercel), nicht im Client-Bundle und nicht im Git

## Was geht (v1)

### Aufgaben
- Anlegen, bearbeiten, erledigen, löschen
- Titel, Notiz, Bereich, Priorität, optionales Fällig-Datum, Status
- Bereiche (Seed + eigene)
- Filter/Ansichten: Heute, Diese Woche, Alle
- Wiederkehrend: täglich / wöchentlich / monatlich / jährlich (Zeitzone Europe/Vienna)

### Budget
- Monatseinkommen, Fixkosten, Extra-Ausgaben
- Kategorien (Defaults + anpassbar)
- Monats-Dashboard: Fix / Extra / Gesamt / Rest
- Beträge in Cent gespeichert, Anzeige in EUR

### Einkauf
- Gemeinsame Listen (Default „Einkauf“)
- Einträge mit Menge/Abteilung, Abhaken, Erledigte entfernen
- Duplikat erhöht Menge
- Auto-Poll ca. alle 4 Sekunden + manueller Refresh

## Sync-Verhalten

- Gemeinsame Persistenz: **Turso / LibSQL** (nicht localStorage)
- Beide Geräte: gleiche URL, gleiches Passwort → dieselbe Datenbank
- Offene Listen pollen alle ~4 s; Änderungen erscheinen ohne Hard-Reload
- Kurztest: Normal + Incognito, beide einloggen, in A abhaken → in B sichtbar

## Wie Passwort / Secrets gesetzt sind

Auf **Vercel** (Production + Preview + Development):

- `HOUSEHOLD_PASSWORD=pupahome`
- `SESSION_SECRET` (Zufallswert)
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

Lokal: `.env.local` (gitignored). Vorlage: `.env.example`.

## Stack (Kurz)

- Next.js 15 + TypeScript + Tailwind
- Auth: Server-Vergleich + httpOnly Cookie
- DB: Turso Free (eu-west-1)
- Host: Vercel Hobby (ohne Kreditkarte)

Details: `PLAN.md`, Deploy-Hinweise: `DEPLOY-NOTES.md`.

## Geprüft live (API)

- Falsches Passwort → 401
- Login mit `pupahome` → Session
- Aufgabe anlegen und listen
- Budget-Dashboard antwortet
- Einkaufsliste „Einkauf“ vorhanden

## Nächste Stufe (nicht in v1)

- Getrennte Nutzer / Rollen statt einem Haushalts-Passwort
- Echtzeit (WebSocket) statt Polling
- Bank-CSV / Kontoanbindung
- Push-Erinnerungen für fällige Aufgaben
