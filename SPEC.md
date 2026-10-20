# Gruppenkalender, Build-Spec

Technische Spec für Claude Code. Der Produkt-Kontext (Ziel, Prinzipien, Feature-Begründungen) steht im Konzept-Doc, hier nur das Baubare. Bau in der Milestone-Reihenfolge, ein Milestone pro Schritt, Commit dazwischen.

## Ziel

Mobile-first Web-App, mit der Freundesgruppen pro Event einen Termin finden. Login mit Google. Jede Gruppe ist ein geheimer Link. Mehrere Gruppen laufen nebeneinander, das Tool ist auf andere Freundeskreise übertragbar. Bewusst nicht auf Viralität oder Skalierung ausgelegt.

## Stack (fix)

- Frontend: Vite + React + TypeScript + Tailwind CSS
- Backend: Supabase (Postgres + Realtime + Auth)
- Hosting: Vercel (Frontend), Supabase (DB), alles Free-Tier
- Login: Supabase Auth mit Google als einziger Login-Methode. Keine weitere Auth-Library.

## Identität & Login (zuerst lesen, das ist der Kern)

- Identität = Supabase-User-ID (`auth.users.id`) des eingeloggten Google-Kontos. Dieselbe Person ist auf allen Geräten dieselbe Identität.
- Ohne Login ist nichts erreichbar außer dem Login-Screen ("Mit Google anmelden"). Nach dem Login landet man wieder auf der Seite, von der man kam (OAuth `redirectTo` = aktuelle URL).
- Gruppe = Zeile in `groups` mit unratbarem `slug` (nanoid, 12 Zeichen). URL-Form: `/g/<slug>`. Wer eingeloggt ist und den Link hat, kann beitreten.
- Profil global: Name, Emoji und Farbe einmal pro Nutzer in `profiles`, gelten in allen Gruppen gleich. Beim ersten Login legt ein Datenbank-Trigger das Profil an, Name aus dem Google-Konto. Änderbar unter Settings (`/settings`, oben rechts).
- Beitreten: ein Klick, Zeile in `members` (ohne eigene Namensangabe, es gilt das Profil).
- Beitritts-Code: jede Gruppe hat zusätzlich einen 8-stelligen Code (`groups.join_code`, Anzeige `XXXX-XXXX`), den Mitglieder in der Gruppenansicht sehen und kopieren. Alphabet `34679AFHKRTXY`: ohne optisch oder akustisch verwechselbare Zeichen (0/O, 1/I/L, B/8, S/5, Z/2, die "-e"-Reimgruppe B C D E G P W usw.), damit er sich zurufen und abtippen lässt. Eingabe auf der Startseite (Groß-/Kleinschreibung, Bindestriche und Leerzeichen egal) über `join_group_by_code(code)`. Wer schon Mitglied ist, landet einfach in der Gruppe, ohne Fehler und ohne doppeltes Mitglied.
- Passwort pro Gruppe: Feld `password_hash` vorsehen, Logik erst später.
- Historie: Bis Etappe 1 des Identitäts-Umbaus war die Identität eine zufällige `clientId` in localStorage (kein Login). Diese Logik ist vollständig entfernt.

## Security

- Row Level Security ist aktiv und echt; Schema und Policies stehen in `supabase/migrations/` (in Reihenfolge ausführen; `001_schema.sql` setzt alles zurück).
  - `anon` (nicht eingeloggt) darf nichts.
  - `profiles`: sehen das eigene Profil und Profile von Leuten aus gemeinsamen Gruppen. Ändern nur das eigene, nur `name`, `emoji`, `color`. Anlegen nur per Trigger.
  - `groups`: lesen nur Mitglieder und Ersteller; Lookup per Link über die Funktion `get_group(slug)` (gibt nur Slug und Name preis, nicht den Code). Anlegen darf jeder Eingeloggte; den Beitritts-Code vergibt immer die Datenbank (Trigger).
  - `members`: Mitglieder sehen einander. Beitreten nur als man selbst und nur mit Rolle `member` (auch `join_group_by_code` trägt nur den Aufrufer als `member` ein). Keine Änderungen per Client. Austreten selbst oder durch Admin.
  - `rounds`: Mitglieder sehen und legen an. Ändern und Löschen: Ersteller ODER Admin.
  - `availability`: Mitglieder der Runde sehen alles, schreiben nur die eigene Zeile.
- Admin: Rolle `members.role = 'admin'`, ausgewertet ausschließlich in der Funktion `is_group_admin(group_slug)`. Ändert sich später, was Admin bedeutet, wird nur diese Funktion angepasst, die Policies bleiben. Aktuell gibt es keinen Weg, Admin zu werden.
- Der Supabase anon-Key ist öffentlich by design und darf ins Frontend. Der service-role-Key NIEMALS.

## Datenmodell (Supabase)

Vollständig mit Funktionen, Rechten und Policies in `supabase/migrations/`. Kurzfassung (Stand nach 004):

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,                  -- 1 bis 30 Zeichen
  emoji text,
  color text,                          -- null = automatisch aus der User-ID
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table groups (
  slug text primary key,
  name text not null,
  password_hash text,
  join_code text not null unique,      -- 8 Zeichen aus 34679AFHKRTXY, per Trigger vergeben
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create table members (
  id uuid primary key default gen_random_uuid(),
  group_slug text not null references groups(slug) on delete cascade,
  user_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  role text not null default 'member',   -- 'member' | 'admin'
  created_at timestamptz default now(),
  unique (group_slug, user_id)
);

create table rounds (
  id uuid primary key default gen_random_uuid(),
  group_slug text not null references groups(slug) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  excluded_dates jsonb default '[]',   -- ["2026-12-24", ...]
  headcount int,                       -- optional
  status text default 'open',          -- 'open' | 'decided' | 'archived'
  decided_dates jsonb,                 -- ["2026-12-27", ...] wenn status = 'decided'
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create table availability (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  days jsonb not null default '{}',    -- {"2026-12-27":"yes","2026-12-28":"maybe"}
  updated_at timestamptz default now(),
  unique (round_id, user_id)
);
```

- Status-Werte: `yes` | `maybe` | `no`. Ein fehlender Tag heißt keine Antwort.
- `availability.user_id` matcht `members.user_id` und `profiles.id` (Join-Key, so kommt der Name an die Verfügbarkeit). Mitglieder werden mit eingebettetem Profil geladen; Profiländerungen lösen per Realtime ein Neuladen aus.
- Realtime: Client abonniert `members`, `rounds` und `availability` gefiltert auf die aktuelle Gruppe/Runde über Supabase Realtime (postgres_changes). DELETE-Events lassen sich nicht filtern, daher ein zusätzliches ungefiltertes DELETE-Abo, das nur auf bekannte IDs reagiert.

## Build-Reihenfolge (Milestones)

### M0, Scaffold
- Vite + React + TS + Tailwind aufsetzen, `@supabase/supabase-js`, `.env` mit `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`.
- Routing: `/` (Start) und `/g/:slug` (Gruppenansicht).
- Fertig wenn: App startet, Supabase verbindet, Routen wechseln.

### M1, Gruppen & Identität
- Startseite: "Neue Gruppe anlegen" (Name eingeben, Zeile in `groups` mit generiertem slug, redirect auf `/g/<slug>`).
- Gruppenansicht lädt die Gruppe per slug, unbekannter slug = freundliche Fehlseite.
- Beim ersten Öffnen einer Gruppe: Name und optional Emoji abfragen, in `members` schreiben. Wiederkehrend ohne Nachfrage.
- Teilen-Button kopiert den Link.
- Fertig wenn: zwei Geräte öffnen denselben Link und sehen beide ihre Namen in einer Mitglieder-Leiste, live.

### M2, Runden
- Aktive Runde anzeigen, Runden-Auswahl wenn mehrere.
- "Neue Runde": Titel, Zeitfenster von/bis, optional Gruppengröße, gesperrte Tage (im Kalender antippbar).
- Jeder darf Runden anlegen, Löschen nur Ersteller oder Admin.
- Fertig wenn: Runde angelegt, Fenster und gesperrte Tage korrekt gerendert, live bei allen.

### M3, Verfügbarkeit eintragen
- Kalender-Grid (Monate des Fensters, Montag-Start), gesperrte und außerhalb des Fensters liegende Tage markiert.
- Edit-Modus mit Pinsel: verfügbar / vielleicht / keine Zeit / leeren. Tippen und Ziehen (Pointer-Events, `touch-action: none` nur im Edit-Modus, damit Scrollen und Malen sich nicht beißen).
- Speichern debounced in `availability.days`, mit sichtbarem Status "speichert... / gespeichert".
- Realtime: Änderungen anderer erscheinen live.
- Fertig wenn: ich male meine Tage, lade neu, Daten sind da, zweites Gerät sieht die Verteilung.

### M4, Übersicht & Dashboard
- Pro Tag im Kalender die Verteilung (Mini-Balken yes/maybe/no, Count der verfügbaren).
- Dashboard: einstellbare Spanne der Blocklänge (von–bis, 1 bis Fensterlänge). Eine Rangliste aller zusammenhängenden Blöcke innerhalb der Spanne, strikt nach echter Schnittmenge (nur wer an allen Tagen des Blocks "kann" zählt, "vielleicht" nie). Sortierung: mehr Personen zuerst, bei Gleichstand der längere Block, dann der frühere. Teilblöcke eines besser platzierten Blocks werden ausgeblendet. Längen der Spanne ohne passenden Block werden klar benannt. Hero zeigt Platz 1.
- Tag oder Block antippen: Sheet zeigt wer verfügbar / vielleicht / keine Zeit / keine Antwort ist.
- Mitglieder-Leiste zeigt wer geantwortet hat (x von headcount).
- Fertig wenn: Dashboard rankt korrekt, Detail-Sheets stimmen.

### M5, Sollte-Features (erst nach echtem Test der Basis)
- Schnellaktionen: alle Wochenenden auf verfügbar, ganzes Fenster setzen und dann einzeln anpassen.
- Swing-Person-Hinweis: "mit X wären es N+1, X kann an Tag Y nicht".
- Termin festlegen: `status = 'decided'`, `decided_dates`, oben angepinnt. WhatsApp-Zusammenfassung zum Kopieren plus .ics-Export.
- Wer fehlt noch: Liste der Nicht-Antworter zum Nachhaken.

### Identitäts-Umbau (in Etappen)
- Etappe 1 (erledigt): Login-Unterbau. Google-Login über Supabase Auth, Identität = Auth-User-ID, Login-Screen vor allem anderen, Rückkehr zur Ausgangsseite, echte RLS (siehe Security).
- Etappe 2 (erledigt): globales Profil (`profiles`), Settings mit Name, Emoji, Farbe (oder automatisch), Abmelden.
- Etappe 3 (erledigt): Startseite = Übersicht der eigenen Gruppen (mit Leerzustand) plus Anlegen. Gruppe verlassen mit Sicherheitsabfrage über `leave_group` (löscht Mitgliedschaft und eigene Verfügbarkeiten der Gruppe in einer Transaktion).
- Etappe 4 (erledigt): Beitreten per Code (siehe Identität & Login). Code anzeigen und kopieren in der Gruppenansicht, Eingabe auf der Startseite über `join_group_by_code`.
- Spätere Etappen: Admin.

### Offen (gewünscht, Zeitpunkt entscheidet der User)
- Runden nachträglich bearbeiten (Titel, Fenster, gesperrte Tage). RLS dafür steht bereits (`rounds_update`: Ersteller oder Admin).

## Design-Richtung

- Mobile-first, sauber, bewusst nicht wie when2meet.
- Akzent Periwinkle (#5b6cff), Zustandsfarben grün / amber / rose, jeweils mit Glyph (✓ ~ ✗), nie nur über Farbe.
- Fonts: Bricolage Grotesque (Display) und Hanken Grotesque (Body) via Google Fonts.
- Hell/Dunkel automatisch plus Toggle (Hell / Dunkel / Automatisch in den Settings, pro Person im Profil gespeichert): bewusst erst nach dem Design-Feinschliff, damit er nicht auf einem UI entsteht, das noch umgeworfen wird.
- Safe-Area auf Mobile beachten.
- Eine mutige Stelle (der Kalender), der Rest ruhig.

## Explizit NICHT jetzt

- Virales Onboarding, Entdeckbarkeit, Fremden-Flows.
- Push-Benachrichtigungen.
- Weitere Login-Methoden neben Google.
- Keep-alive-Ping gegen die Supabase-Pause: später, ein kurzer GitHub-Action-Cron, bevor der Link breit geteilt wird.
- Historie, Countdown, Reaktionen, Emoji-Feinschliff: Kür nach M5.

## Env & Secrets

- `.env` (nicht committen, in `.gitignore`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Auf Vercel dieselben zwei Variablen als Environment Variables setzen.
- Supabase Auth → URL Configuration: Redirect URLs mit Platzhalter für jede Herkunft, z.B. `http://localhost:5173/**`, `http://<LAN-IP>:5173/**` und später die Vercel-Domain mit `/**`.
- Google OAuth: Client ID und Secret im Supabase-Provider; im Google-Zustimmungsbildschirm im Modus "Testing" müssen alle Nutzer als Testnutzer eingetragen sein.
