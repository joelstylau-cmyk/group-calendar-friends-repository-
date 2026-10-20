-- Identitäts-Umbau Etappe 5: Admin-Rechte.
-- KEIN Reset. Setzt 001 bis 005 voraus.
-- Im Supabase SQL-Editor komplett ausführen (läuft als eine Transaktion).
--
-- Regeln:
--   - Wer eine Gruppe anlegt, ist automatisch Admin-Mitglied.
--   - Admins sind gleichberechtigt: jeder Admin darf jedes Mitglied zum Admin
--     machen und jeden Admin herabstufen, nur den letzten Admin nicht.
--   - Jeder Admin darf die Gruppe löschen (Runden, Mitgliedschaften und
--     Verfügbarkeiten gehen per on delete cascade mit).
--   - Verlässt der letzte Admin die Gruppe, wird das älteste verbliebene
--     Mitglied Admin. Verlässt das letzte Mitglied die Gruppe, wird sie gelöscht.
--
-- Schutz gegen Selbst-Ernennung: Die Rolle ändert ausschließlich
-- set_member_role (prüft serverseitig per auth.uid(), ob der Aufrufer Admin
-- ist) sowie die Trigger unten. Der Client hat kein UPDATE-Recht auf members,
-- und beim Beitreten erzwingt members_insert role = 'member'.

begin;

-- ============ Rechte festziehen ============

-- members: niemals per Client ändern (seit 002 schon so, hier ausdrücklich).
revoke update on members from public, anon, authenticated;

-- groups: ändern und löschen nie direkt, Löschen nur über delete_group.
revoke update, delete on groups from public, anon, authenticated;

-- rounds: beim Ändern nur Inhaltsfelder. group_slug, created_by usw. bleiben
-- fest, damit niemand eine Runde in eine andere Gruppe schiebt oder sich als
-- Ersteller einträgt. Wer ändern darf, regelt weiter rounds_update
-- (Ersteller ODER Admin).
revoke update on rounds from public, anon, authenticated;
grant update (title, start_date, end_date, excluded_dates, headcount, status, decided_dates)
  on rounds to authenticated;

-- ============ Ersteller wird Admin ============

-- created_by ist per groups_insert auf auth.uid() festgelegt.
create function public.add_creator_as_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into members (group_slug, user_id, role)
    values (new.slug, new.created_by, 'admin')
    on conflict (group_slug, user_id) do update set role = 'admin';
  end if;
  return null;
end
$$;

create trigger groups_add_creator_as_admin
  after insert on groups
  for each row execute function public.add_creator_as_admin();

-- ============ Nach jedem Austritt: Nachrücken oder Aufräumen ============

-- Läuft nach jedem Löschen einer Mitgliedschaft (Verlassen, Entfernen durch
-- Admin, gelöschtes Konto). Sperrt die Gruppenzeile, damit gleichzeitige
-- Austritte die Regel nicht aushebeln (der zweite wartet und sieht dann den
-- Stand nach dem ersten).
create function public.handle_member_removed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform 1 from groups where slug = old.group_slug for update;
  -- Gruppe schon weg (z.B. delete_group kaskadiert gerade): nichts zu tun.
  if not found then
    return null;
  end if;

  if not exists (select 1 from members where group_slug = old.group_slug) then
    -- Letztes Mitglied ist weg: Gruppe samt Runden und Verfügbarkeiten löschen.
    delete from groups where slug = old.group_slug;
  elsif not exists (select 1 from members where group_slug = old.group_slug and role = 'admin') then
    -- Letzter Admin ist weg: ältestes verbliebenes Mitglied rückt nach.
    update members set role = 'admin'
    where id = (
      select id from members where group_slug = old.group_slug
      order by created_at, id
      limit 1
    );
  end if;
  return null;
end
$$;

create trigger members_after_delete
  after delete on members
  for each row execute function public.handle_member_removed();

-- ============ Rolle ändern ============

create function public.set_member_role(p_group_slug text, p_user_id uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_current text;
begin
  if auth.uid() is null then
    raise exception 'Nicht eingeloggt';
  end if;
  if p_role is null or p_role not in ('member', 'admin') then
    raise exception 'Ungültige Rolle';
  end if;

  -- Gleiche Sperre wie beim Austritt: Herabstufen und Verlassen laufen nacheinander.
  perform 1 from groups where slug = p_group_slug for update;
  if not found then
    raise exception 'Gruppe nicht gefunden';
  end if;

  if not public.is_group_admin(p_group_slug) then
    raise exception using errcode = '42501', message = 'Nur Admins dürfen Rollen ändern.';
  end if;

  select role into v_current from members where group_slug = p_group_slug and user_id = p_user_id;
  if v_current is null then
    raise exception 'Diese Person ist nicht Mitglied der Gruppe.';
  end if;
  if v_current = p_role then
    return;
  end if;

  if p_role = 'member'
     and (select count(*) from members where group_slug = p_group_slug and role = 'admin') <= 1 then
    raise exception 'Der letzte Admin kann nicht herabgestuft werden.';
  end if;

  update members set role = p_role where group_slug = p_group_slug and user_id = p_user_id;
end
$$;

-- ============ Gruppe löschen ============

create function public.delete_group(p_group_slug text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Nicht eingeloggt';
  end if;
  if not public.is_group_admin(p_group_slug) then
    raise exception using errcode = '42501', message = 'Nur Admins dürfen die Gruppe löschen.';
  end if;

  -- Runden, Mitgliedschaften und Verfügbarkeiten gehen per on delete cascade mit.
  delete from groups where slug = p_group_slug;
end
$$;

-- ============ Funktionsrechte ============

revoke execute on function public.add_creator_as_admin() from public, anon, authenticated;
revoke execute on function public.handle_member_removed() from public, anon, authenticated;
revoke execute on function public.set_member_role(text, uuid, text) from public, anon;
revoke execute on function public.delete_group(text) from public, anon;
grant execute on function public.set_member_role(text, uuid, text) to authenticated;
grant execute on function public.delete_group(text) to authenticated;

-- ============ Bestehende Gruppen nachziehen ============

-- 1. Ersteller, die noch Mitglied sind, werden Admin.
update members m set role = 'admin'
from groups g
where m.group_slug = g.slug and m.user_id = g.created_by;

-- 2. Gruppen mit Mitgliedern, aber ohne Admin: ältestes Mitglied wird Admin.
update members set role = 'admin'
where id in (
  select distinct on (group_slug) id
  from members
  where group_slug in (
    select group_slug from members group by group_slug having bool_and(role <> 'admin')
  )
  order by group_slug, created_at, id
);

-- 3. Gruppen ganz ohne Mitglieder werden gelöscht (samt evtl. Runden).
--    Betrifft auch Gruppen, die angelegt, aber nie betreten wurden.
delete from groups g
where not exists (select 1 from members m where m.group_slug = g.slug);

commit;

-- API-Schema neu laden, damit die Funktionen sofort per RPC aufrufbar sind.
notify pgrst, 'reload schema';
