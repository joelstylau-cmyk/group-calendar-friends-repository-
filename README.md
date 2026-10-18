# Gruppenkalender

Termine für Freundesgruppen finden. Login mit Google. Build-Spec: siehe `SPEC.md`.

## Setup

```sh
npm install
cp .env.example .env   # dann VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY eintragen
npm run dev
```

Datenbank: `supabase/schema.sql` im Supabase SQL-Editor ausführen (setzt alles zurück).

## Hinweise

- Identität ist das Google-Konto (Supabase Auth). Redirect URLs in Supabase müssen jede Herkunft mit `/**` erlauben.
- Nur der Supabase anon-Key gehört in `.env`, niemals der service-role-Key.
