-- Gruppenkalender: komplettes Schema mit Supabase Auth (Google) und echter RLS.
-- ACHTUNG: löscht alle bestehenden Daten (sauberer Schnitt).
-- Im Supabase SQL-Editor komplett ausführen.

-- ============ Reset ============

drop table if exists availability, rounds, members, groups cascade;
drop function if exists public.is_group_member(text);
drop function if exists public.is_group_admin(text);
drop function if exists public.is_round_member(uuid);
drop function if exists public.get_group(text);

-- ============ Tabellen ============

create table groups (
  slug text primary key,
  name text not null,
  password_hash text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Mitglieder (eine Zeile pro Google-Konto pro Gruppe)
create table members (
  id uuid primary key default gen_random_uuid(),
  group_slug text not null references groups(slug) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  emoji text,
  color text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz default now(),
  unique (group_slug, user_id)
);

-- Runden (ein Event-Fenster)
create table rounds (
  id uuid primary key default gen_random_uuid(),
  group_slug text not null references groups(slug) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  excluded_dates jsonb default '[]',
  headcount int,
  status text default 'open' check (status in ('open', 'decided', 'archived')),
  decided_dates jsonb,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Verfügbarkeit (eine Zeile pro Person pro Runde)
create table availability (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  days jsonb not null default '{}',
  updated_at timestamptz default now(),
  unique (round_id, user_id)
);

-- ============ Hilfsfunktionen ============
-- security definer: laufen ohne RLS, damit Policies sich nicht gegenseitig aufrufen.

create function public.is_group_member(p_group_slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members where group_slug = p_group_slug and user_id = auth.uid()
  )
$$;

-- Admin-Begriff an genau einer Stelle. Später nur diesen Rumpf ändern, Policies bleiben.
create function public.is_group_admin(p_group_slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members where group_slug = p_group_slug and user_id = auth.uid() and role = 'admin'
  )
$$;

create function public.is_round_member(p_round_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from rounds r join members m on m.group_slug = r.group_slug
    where r.id = p_round_id and m.user_id = auth.uid()
  )
$$;

-- Gruppe per Link nachschlagen, auch als Noch-nicht-Mitglied (zum Beitreten).
-- Gibt nur Name und Slug preis; die Gruppenliste selbst ist nicht abfragbar.
create function public.get_group(p_slug text) returns table (slug text, name text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select g.slug, g.name, g.created_at from groups g where g.slug = p_slug
$$;

revoke execute on function public.is_group_member(text), public.is_group_admin(text),
  public.is_round_member(uuid), public.get_group(text) from public, anon;
grant execute on function public.is_group_member(text), public.is_group_admin(text),
  public.is_round_member(uuid), public.get_group(text) to authenticated;

-- ============ Rechte ============
-- Nicht eingeloggt (anon): nichts. Eingeloggt (authenticated): nur was RLS erlaubt.

revoke all on groups, members, rounds, availability from anon;

grant select, insert on groups to authenticated;
grant select, insert, delete on members to authenticated;
-- Nur diese Spalten sind änderbar; role/user_id/group_slug nie per Client.
grant update (name, emoji, color) on members to authenticated;
grant select, insert, update, delete on rounds to authenticated;
grant select, insert, update, delete on availability to authenticated;

-- ============ RLS ============

alter table groups       enable row level security;
alter table members      enable row level security;
alter table rounds       enable row level security;
alter table availability enable row level security;

-- groups: sehen nur Mitglieder und Ersteller; anlegen darf jeder Eingeloggte.
create policy groups_select on groups for select to authenticated
  using (public.is_group_member(slug) or created_by = auth.uid());
create policy groups_insert on groups for insert to authenticated
  with check (created_by = auth.uid());

-- members: Mitglieder sehen einander; beitreten nur als man selbst und nie als Admin.
create policy members_select on members for select to authenticated
  using (user_id = auth.uid() or public.is_group_member(group_slug));
create policy members_insert on members for insert to authenticated
  with check (user_id = auth.uid() and role = 'member');
create policy members_update on members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy members_delete on members for delete to authenticated
  using (user_id = auth.uid() or public.is_group_admin(group_slug));

-- rounds: Mitglieder sehen und legen an; ändern/löschen nur Ersteller oder Admin.
create policy rounds_select on rounds for select to authenticated
  using (public.is_group_member(group_slug));
create policy rounds_insert on rounds for insert to authenticated
  with check (public.is_group_member(group_slug) and created_by = auth.uid());
create policy rounds_update on rounds for update to authenticated
  using (created_by = auth.uid() or public.is_group_admin(group_slug))
  with check (created_by = auth.uid() or public.is_group_admin(group_slug));
create policy rounds_delete on rounds for delete to authenticated
  using (created_by = auth.uid() or public.is_group_admin(group_slug));

-- availability: Mitglieder der Runde sehen alles; schreiben nur die eigene Zeile.
create policy availability_select on availability for select to authenticated
  using (public.is_round_member(round_id));
create policy availability_insert on availability for insert to authenticated
  with check (user_id = auth.uid() and public.is_round_member(round_id));
create policy availability_update on availability for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_round_member(round_id));
create policy availability_delete on availability for delete to authenticated
  using (user_id = auth.uid());

-- ============ Realtime ============
-- Durch das Löschen der Tabellen sind sie aus der Publication gefallen.

alter publication supabase_realtime add table members, rounds, availability;
