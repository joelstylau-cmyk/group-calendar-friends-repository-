# Gruppenkalender

Termine für Freundesgruppen finden, ohne Login. Build-Spec: siehe `SPEC.md`.

## Setup

```sh
npm install
cp .env.example .env   # dann VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY eintragen
npm run dev
```

## Hinweise

- Identität pro Gerät über eine zufällige `clientId` in localStorage. Wer das Gerät oder den Browser wechselt, ist eine neue Person.
- Nur der Supabase anon-Key gehört in `.env`, niemals der service-role-Key.
