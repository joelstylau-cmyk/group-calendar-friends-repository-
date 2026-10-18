-- Identitäts-Umbau Etappe 2: globales Profil pro Nutzer.
-- Name, Emoji und Farbe ziehen von members nach profiles.
-- KEIN Reset: bestehende Daten bleiben erhalten. Setzt 001_schema.sql voraus.
-- Im Supabase SQL-Editor komplett ausführen (läuft als eine Transaktion).

begin;

-- ============ Tabelle ============

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  emoji text,
  color text, -- null = automatisch (aus der User-ID berechnet)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============ Profil automatisch beim ersten Login ============

-- Name aus dem Google-Konto, sonst Mail-Präfix, auf 30 Zeichen gekürzt.
create function public.profile_name_from(meta jsonb, email text) returns text
language sql immutable as $$
  select left(btrim(coalesce(
    nullif(btrim(meta->>'full_name'), ''),
    nullif(btrim(meta->>'name'), ''),
    nullif(split_part(email, '@', 1), ''),
    'Ohne Namen'
  )), 30)
$$;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, public.profile_name_from(new.raw_user_meta_data, new.email))
  on conflict (id) do nothing;
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ Bestehende Nutzer übernehmen ============

-- Wer schon Mitglied ist: Name und Emoji aus der jüngsten Mitgliedschaft.
-- Farbe wird "automatisch" (null); bisher war sie ohnehin die automatisch berechnete.
insert into profiles (id, name, emoji, color)
select distinct on (m.user_id) m.user_id, left(btrim(m.name), 30), m.emoji, null
from members m
order by m.user_id, m.created_at desc
on conflict (id) do nothing;

-- Alle übrigen bereits eingeloggten Nutzer: Name aus dem Google-Konto.
insert into profiles (id, name)
select u.id, public.profile_name_from(u.raw_user_meta_data, u.email)
from auth.users u
on conflict (id) do nothing;

-- ============ members entschlacken ============

-- Verknüpfung members -> profiles, damit der Client Name/Emoji/Farbe direkt mitladen kann.
alter table members
  add constraint members_user_id_profile_fkey foreign key (user_id) references profiles(id) on delete cascade;

revoke update on members from authenticated;
drop policy if exists members_update on members;
alter table members drop column name, drop column emoji, drop column color;

-- ============ Hilfsfunktion ============

-- Teilen der aufrufende Nutzer und p_user mindestens eine Gruppe?
create function public.shares_group(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members me join members other on other.group_slug = me.group_slug
    where me.user_id = auth.uid() and other.user_id = p_user
  )
$$;

revoke execute on function public.shares_group(uuid) from public, anon;
grant execute on function public.shares_group(uuid) to authenticated;
revoke execute on function public.profile_name_from(jsonb, text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ============ Rechte & RLS ============

revoke all on profiles from anon;
grant select on profiles to authenticated;
-- Nur diese Spalten sind änderbar; angelegt wird ausschließlich per Trigger.
grant update (name, emoji, color, updated_at) on profiles to authenticated;

alter table profiles enable row level security;

-- Sehen: das eigene Profil und Profile von Leuten aus gemeinsamen Gruppen.
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or public.shares_group(id));
-- Ändern: nur das eigene.
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ============ Realtime ============

alter publication supabase_realtime add table profiles;

commit;

-- API-Schema neu laden, damit die neue Verknüpfung members -> profiles sofort nutzbar ist.
notify pgrst, 'reload schema';
