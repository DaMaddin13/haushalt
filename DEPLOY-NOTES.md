# Deployment-Notizen: Haushalt (Next.js 15 + LibSQL/Turso)

**Stand:** 25.09.2026, 12:18 CEST (Europe/Vienna)  
**Auftrag:** Nur recherchiert und diese Datei geschrieben. Keine Accounts angelegt, keine Karte hinterlegt, nichts deployed.

## Kurzempfehlung

**Vercel Hobby + Turso Free** ist für dieses Repository der wahrscheinlich einfachste Weg ohne Kreditkarte:

- Das Projekt ist bereits Next.js 15 und verwendet `@libsql/client` sowie genau die vier gewünschten Variablen.
- Turso bewirbt den Free-Tarif ausdrücklich mit **„no credit card required“**. Aktuelle Freigrenzen: 100 Datenbanken, 5 GB Speicher, 500 Mio. gelesene und 10 Mio. geschriebene Zeilen/Monat sowie 3 GB monatliche Syncs.
- Vercel Hobby ist offiziell kostenlos, hat keine Abrechnungsläufe und pausiert bei Limits statt automatisch Hobby-Mehrverbrauch zu berechnen. Die offizielle Dokumentation nennt eine Karte erst beim Upgrade auf Pro. Eine allgemeine Garantie für *jedes* neue Konto veröffentlicht Vercel jedoch nicht: Wenn der Anmeldevorgang eine Karte verlangt, **nicht fortfahren und keine Karte eingeben**.
- Vercel Hobby ist nur für persönliche, nicht-kommerzielle Nutzung vorgesehen.

**Fallback ohne Turso-Codeänderung:** Render Free Web Service + Turso Free. Das funktioniert mit einem normalen Next.js-Node-Server, schläft aber nach 15 Minuten Inaktivität ein und startet danach mit ungefähr einer Minute Verzögerung. Render verlangt laut Free-Deploy-Dokumentation keine Zahlung; sollte der konkrete Signup doch eine Karte verlangen, stoppen.

## Durchführbare Schritte (erst nach Martins Freigabe für die Accounts)

### 1. Turso-Konto und gemeinsame Datenbank

Die folgenden Befehle sind nur der spätere Ablauf, nicht ausgeführt:

```bash
# Linux: Turso CLI installieren
curl -sSfL https://get.tur.so/install.sh | bash

# ohne lokalen Browser/SSH/CI: öffnet einen Headless-Login-Link
# (erstellt bei neuem Konto den Account)
turso auth signup --headless

# Datenbank anlegen
turso db create haushalt

# URL anzeigen/übernehmen und Datenbank-Token erzeugen
turso db show haushalt
turso db tokens create haushalt --expiration never
```

`TURSO_DATABASE_URL` ist die `libsql://...`-URL; der ausgegebene Token wird `TURSO_AUTH_TOKEN`. Token nur als Secret verwenden und nicht committen. Die App legt Tabellen und Seed-Daten laut vorhandenem Code beim ersten DB-Zugriff an.

### 2. Vercel Hobby

1. Vercel-Konto/Projekt nur nach Freigabe anlegen bzw. das vorhandene Git-Repository importieren; Plan **Hobby**, niemals Pro-Trial/Upgrade wählen.
2. In **Project → Settings → Environment Variables** für mindestens **Production** anlegen (für Preview optional ebenfalls):

   ```text
   HOUSEHOLD_PASSWORD=<gemeinsames Passwort>
   SESSION_SECRET=<langer zufälliger Wert>
   TURSO_DATABASE_URL=libsql://...
   TURSO_AUTH_TOKEN=<Turso-Datenbanktoken>
   ```

   Beispiel für ein lokales Secret (Wert nicht in diese Datei schreiben):

   ```bash
   openssl rand -hex 32
   ```

3. `npm ci && npm run build` lokal prüfen; danach über Git-Import deployen oder, nach CLI-Login, `npx vercel@latest --prod` verwenden.
4. Nach Änderungen an Environment Variables neu deployen; Vercel übernimmt sie nicht rückwirkend in bereits laufende Deployments.

Die App sollte zunächst im normalen Node.js-Runtime-Modus bleiben; nicht auf Edge umstellen, ohne den DB-Treiber zu testen. Turso dokumentiert für Vercel außerdem `@libsql/client/web` für Edge/Serverless. Der bestehende Code nutzt aktuell `@libsql/client` und `next start`/API-Routen; deshalb zuerst den normalen Vercel-Build testen.

### CLI/Browser auf Linux

- `npx vercel@latest login` verwendet den OAuth-Device-Flow. Ein Browser kann automatisch geöffnet werden; auf einer SSH/Linux-Box kann der angezeigte Link mit einem anderen Browser bestätigt werden (aktuelle CLI: `--no-browser`). Für CI ist ein Vercel-Projekt-Token möglich.
- `turso auth signup --headless` bzw. `turso auth login --headless` ist genau für fehlenden/lokalen Browser gedacht. Es ist kein Captcha-Bypass. Ein eventuelles Captcha muss normal im Browser gelöst werden.
- Die CLIs können also von Linux aus verwendet werden; lediglich die Account-Freigabe/Browser-Bestätigung bleibt interaktiv.

## Vergleich der Alternativen (September 2026)

| Option | Kreditkarte beim Signup? | Passt zu dieser App? | Einschätzung |
|---|---|---|---|
| **Turso Free** | **Ja, offiziell ausdrücklich** | Ja, bestehende LibSQL-URL/Token | Empfohlen als DB |
| **Vercel Hobby** | **Wahrscheinlich nein**, aber keine universelle Vercel-Garantie für jedes neue Konto; Karte erst bei Pro dokumentiert | Ja, Next.js wird automatisch erkannt | Beste Hosting-Kombination; nur privat/nicht-kommerziell |
| **Render Free + Turso** | Free-Deploy-Doku sagt keine Zahlung erforderlich | Ja, Node-Server und Env Vars | Gute Ausweichlösung; Sleep/750 Stunden, kein lokales dauerhaftes Dateisystem |
| **Cloudflare Pages/Workers + D1** | Cloudflare Free/D1 bewirbt Free ohne Karte | **Nicht drop-in**: D1 ist Cloudflare-Binding, nicht Turso; DB-Zugriff und Deployment-Code müssten angepasst werden | Nur wählen, wenn Migration auf D1 gewünscht ist |
| **Cloudflare Workers + bestehendes Turso** | Free wahrscheinlich ohne Karte | Möglich, aber Next.js-15-Kompatibilität und Node-/Turso-Treiber testen | Technisch aufwendiger als Vercel/Render; aktuelle Cloudflare-Doku empfiehlt für neue Next-Projekte `vinext` (Next 16), OpenNext bleibt Fallback |
| **Railway** | Streng cardless nicht zuverlässig: anonyme Demo nur ca. 60 Minuten; für reguläre Nutzung kann eine Karte verlangt werden | Technisch ja | Für dieses Vorhaben meiden; Free-Guthaben ist kein verlässliches dauerhaftes Hosting |
| **Fly.io** | Nur Test ohne Karte: 2 Maschinenstunden oder 7 Tage; danach Karte nötig | Technisch ja | Kein dauerhafter Free-Tarif für neue Konten |
| **Neon Free + Vercel** | Neon standalone Free ohne Karte | **Nein ohne Anpassung**: Neon ist PostgreSQL, nicht LibSQL/Turso | Nur bei bewusster DB-Migration; Vercel-Karten-Caveat bleibt |

Wichtige Cloudflare-D1-Freigrenzen: 5 Mio. gelesene Zeilen/Tag, 100.000 geschriebene Zeilen/Tag und 5 GB Speicher. Bei Überschreitung stoppt Free-D1 die Abfragen, statt automatisch kostenpflichtig zu werden. Das ist nicht dasselbe wie das aktuelle gemeinsame Turso-DB-Setup.

Render Free Postgres ist hier kein sinnvoller Ersatz: Es läuft zwar kostenlos, läuft aber nach 30 Tagen ab. Deshalb bei Render weiterhin Turso verwenden.

## Was muss Martin ausdrücklich freigeben?

1. Anlegen/Verwenden eines **Turso-Kontos** (typischerweise GitHub-OAuth) und einer Datenbank.
2. Anlegen/Verwenden eines **Vercel-Hobby-Kontos/Projekts** und Zugriff auf das Git-Repository.
3. Eingabe der vier Secret-Werte in Vercel. Sie werden nicht in Git committed und nicht in diese Datei geschrieben.
4. Optional: Render-Konto als Fallback.

Keine Freigabe für eine Karte oder einen kostenpflichtigen Tarif erteilen. Bei einer Kartenaufforderung, verpflichtendem Paid-Trial oder unklarer Billing-Seite abbrechen und erneut abstimmen.

## Primärquellen

- Turso Pricing: <https://turso.tech/pricing>
- Turso CLI Signup/Auth: <https://docs.turso.tech/cli/auth/signup>, <https://docs.turso.tech/cli/authentication>
- Turso CLI Installation/DB/Token: <https://docs.turso.tech/cli/installation>, <https://docs.turso.tech/cli/db/create>, <https://docs.turso.tech/cli/db/tokens/create>
- Turso + Vercel: <https://docs.turso.tech/integrations/vercel>
- Vercel Hobby: <https://vercel.com/docs/plans/hobby>
- Vercel CLI Login/Device Flow: <https://vercel.com/docs/cli/login>, <https://vercel.com/changelog/new-vercel-cli-login-flow>
- Render Free: <https://render.com/docs/free>
- Cloudflare D1 Pricing: <https://developers.cloudflare.com/d1/platform/pricing/>
- Cloudflare Next.js/Workers: <https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/>
- Fly.io Free Trial: <https://fly.io/docs/about/free-trial/>
- Neon Plans: <https://neon.com/docs/introduction/plans>
