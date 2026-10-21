# Gruppenkalender: Design-Spec

Bauplan für die Design-Runde. Ziel: aus dem funktional fertigen, aber roh aussehenden Stand ein sauberes, warmes, mobil-first Produkt machen. Umsetzung phasenweise (siehe ganz unten), nicht alles in einem Pass.

## Grundprinzipien

- **Clean und warm.** Ruhig und fokussiert, aber freundlich. Es soll nach "Freunde planen etwas" aussehen, nicht nach Meeting-Tool und nicht nach buntem Spielzeug.
- **Mobile first.** Primärer Use-Case ist das Handy. Desktop ist eine zentrierte Spalte, nicht in die Breite gezogen.
- **Hierarchie vor Dekoration.** Das Hauptproblem des alten Looks war fehlende Hierarchie: zu viel Knallweiss, dünne graue Linien, alles gleich laut. Fix: weicher Hintergrund, klare Typo-Abstufung, bewusste Abstände, Karten mit echter dezenter Tiefe statt Hairline-Rahmen.
- **Disziplinierte Palette.** Akzent plus drei Status-Farben plus Neutrals. Sonst nichts Buntes. Das erzeugt "clean".
- **Alles aus Tokens.** Keine fest verdrahteten Farben oder Abstände in Komponenten. Nur die Variablen unten. Das ist die Voraussetzung für den Dunkelmodus und für Konsistenz.

## Design-Tokens

Als CSS-Variablen anlegen (z.B. in einer globalen CSS-Datei), Light und Dark. Dark greift per `prefers-color-scheme` und zusätzlich per manuellem `data-theme`-Attribut, damit der Toggle in den Settings funktioniert.

### Farben, Light
```
--paper:       #f4f3f7   /* App-Hintergrund, weicher warm-kühler Ton statt Knallweiss */
--surface:     #ffffff   /* Karten */
--surface-2:   #ecebf3   /* eingelassene Flächen, Kalenderzellen, Segmented Controls */
--ink:         #1e2030   /* Haupttext */
--muted:       #6b6d89   /* Sekundärtext */
--faint:       #9a9bb6   /* Labels, inaktiv */
--line:        #e4e2ee   /* Trennlinien, nur sparsam */
--accent:      #5b6cff   /* Periwinkle, Hauptakzent, Buttons, aktive Zustände */
--accent-soft: #e7e9ff   /* Akzent-Hintergrund, ausgewählt */
--on-accent:   #ffffff
--yes:   #12b886   --yes-soft:   #d6f3e8
--maybe: #e8a317   --maybe-soft: #f8ead0
--no:    #ec5a72   --no-soft:    #fbdde2
```

### Farben, Dark
```
--paper:       #141520
--surface:     #1e2030
--surface-2:   #282b3e
--ink:         #ecedf6
--muted:       #9a9cbd
--faint:       #6b6e8f
--line:        #2f3246
--accent:      #808dff
--accent-soft: #2a2f54
--on-accent:   #15161f
--yes:   #2ed6a3   --yes-soft:   rgba(46,214,163,.16)
--maybe: #f1bd58   --maybe-soft: rgba(241,189,88,.16)
--no:    #ff6f88   --no-soft:    rgba(255,111,136,.16)
```

### Typografie
Fonts via Google Fonts oder @fontsource.
- **Display/große Überschriften:** Fraunces (Serif, warm, mit SOFT-Achse 50). Gewichte 600-700. Bewusst sparsam: nur Seitentitel ("Gruppenkalender", Gruppenname, "Einstellungen"), Hero-Termin, Rundentitel, "Beste Termine" und "Kalender". Alles andere, auch Karten- und Sheet-Titel und Monatsnamen, in Hanken Grotesk. (Ersetzt Bricolage Grotesque.)
- **Body/UI:** Hanken Grotesk (sauber, gut lesbar). Gewichte 400/500/600/700.
- Immer mit System-Fallback-Stack.

Skala (Richtwerte, mobil):
```
Hero/Display   30px / 650 / Fraunces, leicht enges letter-spacing   (.text-display)
Headline       23px / 600 / Fraunces                                (.text-headline)
H2             17px / 700 / Hanken Grotesk                          (.text-h2)
Body           15-16px / 400-500
Small          13px / 500
Label          12.5px / 600, sentence case (KEINE All-Caps-Labels)
```

### Abstände, Radien, Tiefe
```
Spacing-Skala: 4 / 8 / 12 / 16 / 20 / 24 / 32 (konsequent nutzen)
Radien:  --r-sm 10px   --r-md 14px   --r-lg 20px
Tiefe:   --shadow-sm (1px Kontaktschatten) für Karten
         --shadow-md (weicher, grösserer) für Hero, Sheets, Sticky-Bar
```
Karten bekommen `--shadow-sm` plus sehr dezente Border, nicht die harte Hairline von jetzt. Elevation macht die Hierarchie, nicht Linien.

## Layout

- **Einspaltig, zentriert.** Container max-width ~480px, auf dem Desktop mittig, grosszügige Seitenränder. Nie full-width.
- **Safe-Area** auf Mobile beachten (Notch, Home-Indicator): `env(safe-area-inset-*)` für oben/unten.
- **Sticky Bottom-Action-Bar auf Mobile:** Die wichtigste Aktion des jeweiligen Screens sitzt in einer fixen Leiste unten im Daumenbereich (z.B. "Meine Tage eintragen" in der Rundenansicht), nicht irgendwo im Scroll.
- **Bottom-Sheets** für Detail- und Verwaltungs-Ansichten: fahren von unten hoch, mit Grabber, schliessbar per Wisch/Tap daneben/Esc. Gilt für Tag-Details, "Gruppe verwalten", "Teilen".

## Komponenten-Prinzipien

- **Buttons:** Pro Screen ist klar, was die Hauptaktion ist. Primär (`.btn-primary`) = gefüllt Akzent, z.B. "+ Neue Runde". Outline (`.btn-outline`) = Akzent-Kontur, Text in `--accent-ink`, für die zweitwichtigste Aktion, z.B. "Teilen". Ghost (`.btn-ghost`) = Text- oder Icon-Knopf ohne Fläche (Fläche erst beim Hover), für Nebenaktionen wie "Bearbeiten", Zahnrad, "Mehr anzeigen". Sekundär (`.btn-secondary`) = `--surface-2` mit `--ink`, für neutrale Aktionen wie "Abbrechen", "Beitreten". Destruktiv (löschen, verlassen) = dezent, nicht knallrot-fett, Text in `--no`. Grosse Touch-Fläche (min. 44px hoch).
- **Avatare/Chips:** runde Avatare mit Farbe aus der User-ID plus Initialen oder Emoji. Chips mit weichem `--surface`-Hintergrund, kein harter Rahmen.
- **Kalender-Grid:** die eine mutige Stelle. Zellen mit `--surface-2`, klare Zahlen, der Heatmap-Balken (yes/maybe/no) als dünner Streifen unten, Count der Verfügbaren oben rechts. Ausserhalb/gesperrt klar gedämpft. Im Edit-Modus Zelle kräftig in Status-Farbe plus Glyph (checkmark / tilde / x).
- **Heatmap-Balken:** die drei Status-Farben, nie nur über Farbe (immer auch Glyph/Legende), damit es auch farbfehlsichtig lesbar bleibt.
- **Dashboard "Beste Termine":** die Konsens-Karte ist der sichtbarste Block nach dem Hero. Ruhig, eine klare Zahl pro Vorschlag. Unter dem Hero erst 2 weitere Vorschläge, "Mehr anzeigen" klappt schrittweise je 3 mehr auf.
- **Legende am Kalender:** immer sichtbar (die Farben tragen Bedeutung, neue Mitglieder brauchen sie sofort), kompakt als 2-Spalten-Mini-Grid mit fester Symbolspalte. Das Symbol für "gesperrt" ist dieselbe Schraffur wie die Zellen (`--hatch-line`, im Dunkelmodus kräftiger).
- **Karten sparsam:** Karten nur, wo sie Inhalt bündeln (Gruppenliste, Hero, Kalender, Vorschlagsliste). Formulare wie "Mit Code beitreten" oder "Neue Gruppe anlegen" liegen direkt auf dem Hintergrund, Abstand trennt, nur die Felder heben sich ab.
- Alles andere bleibt leise. Nur Hero, Kalender und Dashboard dürfen Präsenz haben.

## Konkrete Umbauten (die Punkte aus dem Feedback)

1. **Gruppe verwalten raus aus dem Scroll.** Ein Zahnrad-Icon oben rechts im Gruppen-Header öffnet ein Sheet/Unterseite "Gruppe verwalten" mit: Mitglieder und Admins (ernennen/entziehen), Beitritts-Code, Gruppe löschen (Admin), Gruppe verlassen. Die Hauptansicht der Gruppe zeigt davon nichts mehr, sie bleibt auf Runde und Kalender fokussiert.
2. **Datumsauswahl direkt im Kalender.** Weg vom `tt.mm.jjjj`-Feld plus separatem Popup. Beim Runde-Anlegen/Bearbeiten tippt man Start und Ende direkt in einem Monatskalender an, der Bereich dazwischen färbt sich. Gleiche Geste wie das Verfügbarkeit-Malen, dadurch vertraut und mobil-nativ. Manuelle Eingabe optional als Fallback, aber nicht der Default.
3. **Beitritts-Code ins Teilen.** Die prominente Code-Karte verschwindet aus der Hauptansicht. Ein "Teilen"-Knopf im Header öffnet ein kleines Sheet mit Link und Code nebeneinander, je ein Kopieren-Knopf. (Alternativ liegt der Code im "Gruppe verwalten"-Sheet, aber Teilen-Sheet ist griffiger.)

## Dunkelmodus

- Von Anfang an über die Tokens mitgebaut, nicht nachträglich drangeklebt.
- Umschalter Hell / Dunkel / Automatisch in den Settings. Auswahl im Profil speichern (gilt geräteübergreifend) und lokal spiegeln, damit beim Laden nichts weiss aufblitzt.

## Umsetzungsreihenfolge (phasenweise, je ein Commit)

**Phase 1, Fundament.** Tokens als CSS-Variablen (Light und Dark), Fonts einbinden, globale Basis-Styles (Hintergrund, Typo-Skala, Spacing). Dunkelmodus-Mechanik plus Toggle in den Settings. Basis-Komponenten (Button, Karte, Chip, Avatar, Sheet) auf die Tokens heben. Noch keine grosse Screen-Umgestaltung, nur das System steht und ist sichtbar (z.B. an Settings und Startseite).

**Phase 2, Hauptscreens restylen** mit dem System: Startseite/Übersicht, Gruppenansicht, Rundenansicht mit Kalender, Dashboard. Visuelle Hierarchie, Abstände, Elevation. Sticky Bottom-Action-Bar auf Mobile.

**Phase 3, strukturelle Umbauten:** "Gruppe verwalten"-Sheet (Punkt 1), Datumsauswahl im Kalender (Punkt 2), Teilen-Sheet mit Link und Code (Punkt 3).

Nach jeder Phase testen (hell und dunkel, schmales Handy-Fenster und Desktop), dann die nächste.
