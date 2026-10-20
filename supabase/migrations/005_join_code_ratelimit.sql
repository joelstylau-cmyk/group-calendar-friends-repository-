-- Nachtrag zu Etappe 4: Sperre gegen Code-Raten.
-- Setzt den schon ausgeführten Stand von 004_join_code.sql voraus und ersetzt
-- join_group_by_code (gleiche Signatur, create or replace). KEIN Reset.
-- Im Supabase SQL-Editor komplett ausführen (läuft als eine Transaktion).
--
-- Regel: Nach 10 falschen Codes innerhalb von 15 Minuten lehnt
-- join_group_by_code weitere Versuche dieses Kontos ab, bis der älteste der
-- 10 Fehlversuche aus dem Fenster fällt. Erfolgreiche Beitritte (auch "schon
-- Mitglied") zählen nicht. Abgelehnte Versuche während der Sperre zählen
-- ebenfalls nicht, die Sperre verlängert sich also nicht durch Weiterprobieren.

begin;

-- ============ Tabelle ============

-- Ein Eintrag pro falschem Code. Nur die Funktion schreibt und liest hier.
create table if not exists join_code_failures (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists join_code_failures_user_time
  on join_code_failures (user_id, created_at desc);

-- Kein Zugriff per Client: RLS an, keine Policies, keine Rechte.
alter table join_code_failures enable row level security;
revoke all on join_code_failures from public, anon, authenticated;

-- ============ Funktion ersetzen ============

-- Gibt den Slug der Gruppe zurück, oder null, wenn es den Code nicht gibt.
-- Wer schon Mitglied ist, bleibt es (kein Fehler, kein doppeltes Mitglied).
-- Bindestriche, Leerzeichen und Kleinschreibung in der Eingabe sind egal.
-- Zu viele Fehlversuche: Fehler mit SQLSTATE PT429 (PostgREST antwortet mit HTTP 429).
-- security definer: Nicht-Mitglieder dürfen groups nicht lesen; eingetragen
-- wird trotzdem nur der Aufrufer selbst und nur als 'member'.
create or replace function public.join_group_by_code(p_code text) returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  max_failures constant int := 10;
  failure_window constant interval := interval '15 minutes';
  v_uid uuid := auth.uid();
  v_slug text;
  v_oldest timestamptz;
  v_minutes int;
begin
  if v_uid is null then
    raise exception 'Nicht eingeloggt';
  end if;

  -- Gleichzeitige Aufrufe desselben Kontos nacheinander abarbeiten,
  -- damit parallele Versuche die Grenze nicht überholen.
  perform pg_advisory_xact_lock(hashtextextended('join_group_by_code:' || v_uid::text, 0));

  -- Abgelaufene Einträge des Kontos aufräumen, hält die Tabelle klein.
  delete from join_code_failures
  where user_id = v_uid and created_at < now() - failure_window;

  -- Gesperrt, wenn schon max_failures Fehlversuche im Fenster liegen.
  -- v_oldest = ältester der letzten max_failures; fällt er heraus, ist wieder frei.
  select min(created_at) into v_oldest
  from (
    select created_at from join_code_failures
    where user_id = v_uid
    order by created_at desc
    limit max_failures
  ) recent
  having count(*) >= max_failures;

  if v_oldest is not null then
    v_minutes := greatest(1, ceil(extract(epoch from (v_oldest + failure_window - now())) / 60)::int);
    raise exception using
      errcode = 'PT429',
      message = format(
        'Zu viele falsche Codes. Bitte in %s %s nochmal versuchen.',
        v_minutes, case when v_minutes = 1 then 'Minute' else 'Minuten' end
      );
  end if;

  select slug into v_slug from groups
  where join_code = upper(regexp_replace(coalesce(p_code, ''), '[^0-9A-Za-z]', '', 'g'));

  if v_slug is null then
    -- Kein raise hier, sonst würde der Eintrag mit zurückgerollt.
    insert into join_code_failures (user_id) values (v_uid);
    return null;
  end if;

  insert into members (group_slug, user_id, role)
  values (v_slug, v_uid, 'member')
  on conflict (group_slug, user_id) do nothing;

  return v_slug;
end
$$;

-- create or replace behält die Rechte; hier trotzdem explizit wie in 004.
revoke execute on function public.join_group_by_code(text) from public, anon;
grant execute on function public.join_group_by_code(text) to authenticated;

commit;

-- API-Schema neu laden, damit die neue Fassung sofort per RPC greift.
notify pgrst, 'reload schema';
