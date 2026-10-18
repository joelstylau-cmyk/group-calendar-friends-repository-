# Gruppenkalender, Build-Spec

Technische Spec für Claude Code. Der Produkt-Kontext (Ziel, Prinzipien, Feature-Begründungen) steht im Konzept-Doc, hier nur das Baubare. Bau in der Milestone-Reihenfolge, ein Milestone pro Schritt, Commit dazwischen.

## Ziel

Mobile-first Web-App, mit der Freundesgruppen pro Event einen Termin finden. Kein Login. Jede Gruppe ist ein geheimer Link. Mehrere Gruppen laufen nebeneinander, das Tool ist auf andere Freundeskreise übertragbar. Bewusst nicht auf Viralität oder Skalierung ausgelegt.

## Stack (fix)

- Frontend: Vite + React + TypeScript + Tailwind CSS
- Backend: Supabase (Postgres + Realtime)
- Hosting: Vercel (Frontend), Supabase (DB), alles Free-Tier
- Keine Auth-Library. Identität pro Gerät über eine zufällige `clientId` in localStorage.

## No-Login-Modell (zuerst lesen, das ist der Kern)

- Gruppe = Zeile in `groups` mit unratbarem `slug` (z.B. nanoid, 12 Zeichen). URL-Form: `/g/<slug>`.
- Wer den Link hat, ist drin. Es gibt keine echte Zugriffssicherheit, das ist bewusst so. Für Freundeskreise ok.
- Geräte-Identität: beim ersten Besuch wird eine `clientId` (nanoid/uuid) erzeugt und in localStorage gespeichert. Sie identifiziert "mich" auf diesem Gerät. Alle meine Einträge hängen an dieser clientId.
- "Meine Einträge bearbeiten" ist client-seitig auf die eigene clientId beschränkt. Technisch könnte jeder mit DB-Zugriff alles ändern, das ist akzeptiert.
- Wer das Gerät wechselt, ist eine neue Identität (dokumentieren, kein Fix für MVP nötig).
- Passwort pro Gruppe: Feld `password_hash` vorsehen, Logik erst später.

## Security (MVP)

- Row Level Security für MVP aus bzw. permissiv: der anon-Key darf lesen und schreiben, gefiltert wird im Client über `group_slug` / `round_id`.
- Der Supabase anon-Key ist öffentlich by design und darf ins Frontend. Der service-role-Key NIEMALS.
- Vor dem Teilen des Links keinen echten Schutz erwarten.

## Datenmodell (Supabase)

```sql
-- Gruppen
create table groups (
  slug text primary key,
  name text not null,
  password_hash text,
  created_at timestamptz default now()
);

-- Mitglieder (eine Person pro Gerät pro Gruppe)
create table members (
  id uuid primary key default gen_random_uuid(),
  group_slug text references groups(slug) on delete cascade,
  client_id text not null,
  name text not null,
  emoji text,
  color text,
  created_at timestamptz default now(),
  unique (group_slug, client_id)
);

-- Runden (ein Event-Fenster)
create table rounds (
  id uuid primary key default gen_random_uuid(),
  group_slug text references groups(slug) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  excluded_dates jsonb default '[]',   -- ["2026-12-24", ...]
  headcount int,                       -- optional
  status text default 'open',          -- 'open' | 'decided' | 'archived'
  decided_dates jsonb,                 -- ["2026-12-27", ...] wenn status = 'decided'
  created_by text,                     -- client_id des Erstellers
  created_at timestamptz default now()
);

-- Verfügbarkeit (eine Zeile pro Person pro Runde)
create table availability (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references rounds(id) on delete cascade,
  client_id text not null,
  days jsonb not null default '{}',    -- {"2026-12-27":"yes","2026-12-28":"maybe"}
  updated_at timestamptz default now(),
  unique (round_id, client_id)
);
```

- Status-Werte: `yes` | `maybe` | `no`. Ein fehlender Tag heißt keine Antwort.
- `availability.client_id` matcht `members.client_id` (Join-Key, so kommt der Name an die Verfügbarkeit).
- Realtime: Client abonniert `members`, `rounds` und `availability` gefiltert auf die aktuelle Gruppe/Runde über Supabase Realtime (postgres_changes).

## Build-Reihenfolge (Milestones)

### M0, Scaffold
- Vite + React + TS + Tailwind aufsetzen, `@supabase/supabase-js`, `.env` mit `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`.
- Routing: `/` (Start) und `/g/:slug` (Gruppenansicht).
- clientId-Util: beim Start aus localStorage lesen oder erzeugen.
- Fertig wenn: App startet, Supabase verbindet, Routen wechseln.

### M1, Gruppen & Identität
- Startseite: "Neue Gruppe anlegen" (Name eingeben, Zeile in `groups` mit generiertem slug, redirect auf `/g/<slug>`).
- Gruppenansicht lädt die Gruppe per slug, unbekannter slug = freundliche Fehlseite.
- Beim ersten Öffnen einer Gruppe: Name und optional Emoji abfragen, in `members` schreiben, in localStorage merken. Wiederkehrend ohne Nachfrage.
- Teilen-Button kopiert den Link.
- Fertig wenn: zwei Geräte öffnen denselben Link und sehen beide ihre Namen in einer Mitglieder-Leiste, live.

### M2, Runden
- Aktive Runde anzeigen, Runden-Auswahl wenn mehrere.
- "Neue Runde": Titel, Zeitfenster von/bis, optional Gruppengröße, gesperrte Tage (im Kalender antippbar).
- Jeder darf Runden anlegen, Löschen nur der Ersteller (`created_by == clientId`).
- Fertig wenn: Runde angelegt, Fenster und gesperrte Tage korrekt gerendert, live bei allen.

### M3, Verfügbarkeit eintragen
- Kalender-Grid (Monate des Fensters, Montag-Start), gesperrte und außerhalb des Fensters liegende Tage markiert.
- Edit-Modus mit Pinsel: verfügbar / vielleicht / keine Zeit / leeren. Tippen und Ziehen (Pointer-Events, `touch-action: none` nur im Edit-Modus, damit Scrollen und Malen sich nicht beißen).
- Speichern debounced in `availability.days`, mit sichtbarem Status "speichert... / gespeichert".
- Realtime: Änderungen anderer erscheinen live.
- Fertig wenn: ich male meine Tage, lade neu, Daten sind da, zweites Gerät sieht die Verteilung.

### M4, Übersicht & Dashboard
- Pro Tag im Kalender die Verteilung (Mini-Balken yes/maybe/no, Count der verfügbaren).
- Dashboard: beste 1-, 2- und 3-Tage-Blöcke nach echter Schnittmenge (wer kann an allen Tagen des Blocks), umschaltbar. Hero zeigt den aktuell besten Termin.
- Tag oder Block antippen: Sheet zeigt wer verfügbar / vielleicht / keine Zeit / keine Antwort ist.
- Mitglieder-Leiste zeigt wer geantwortet hat (x von headcount).
- Fertig wenn: Dashboard rankt korrekt, Detail-Sheets stimmen.

### M5, Sollte-Features (erst nach echtem Test der Basis)
- Schnellaktionen: alle Wochenenden auf verfügbar, ganzes Fenster setzen und dann einzeln anpassen.
- Swing-Person-Hinweis: "mit X wären es N+1, X kann an Tag Y nicht".
- Termin festlegen: `status = 'decided'`, `decided_dates`, oben angepinnt. WhatsApp-Zusammenfassung zum Kopieren plus .ics-Export.
- Wer fehlt noch: Liste der Nicht-Antworter zum Nachhaken.

## Design-Richtung

- Mobile-first, sauber, bewusst nicht wie when2meet.
- Akzent Periwinkle (#5b6cff), Zustandsfarben grün / amber / rose, jeweils mit Glyph (✓ ~ ✗), nie nur über Farbe.
- Fonts: Bricolage Grotesque (Display) und Hanken Grotesque (Body) via Google Fonts.
- Hell/Dunkel automatisch plus Toggle, Safe-Area auf Mobile beachten.
- Eine mutige Stelle (der Kalender), der Rest ruhig.

## Explizit NICHT jetzt

- Virales Onboarding, Entdeckbarkeit, Fremden-Flows.
- Push-Benachrichtigungen.
- Echtes Auth bzw. Accounts.
- Keep-alive-Ping gegen die Supabase-Pause: später, ein kurzer GitHub-Action-Cron, bevor der Link breit geteilt wird.
- Historie, Countdown, Reaktionen, Emoji-Feinschliff: Kür nach M5.

## Env & Secrets

- `.env` (nicht committen, in `.gitignore`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Auf Vercel dieselben zwei Variablen als Environment Variables setzen.

## Kickoff für Claude Code

Erster Befehl, sinngemäß: "Lies SPEC.md komplett. Setz M0 um (Scaffold), zeig mir die Projektstruktur, dann gehen wir M1 an." Danach Milestone für Milestone, nie alles auf einmal.
