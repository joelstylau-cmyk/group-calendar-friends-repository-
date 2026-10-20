-- Design Phase 1: Hell/Dunkel/Automatisch pro Person im Profil (gilt auf allen Geräten).
-- KEIN Reset. Setzt 001 bis 006 voraus.
-- Im Supabase SQL-Editor komplett ausführen (läuft als eine Transaktion).

begin;

-- 'system' = dem Betriebssystem folgen (prefers-color-scheme)
alter table profiles
  add column theme text not null default 'system'
  check (theme in ('light', 'dark', 'system'));

-- Nur diese Spalte zusätzlich änderbar machen; die bestehende Policy
-- profiles_update (nur das eigene Profil) gilt unverändert.
grant update (theme) on profiles to authenticated;

commit;

-- API-Schema neu laden, damit die neue Spalte sofort lesbar ist.
notify pgrst, 'reload schema';
