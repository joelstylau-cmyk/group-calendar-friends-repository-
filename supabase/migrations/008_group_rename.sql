-- 008: Gruppenname ändern (nur Admins)
--
-- Der Client bekommt KEIN Update-Recht auf groups (seit 006 entzogen, bleibt so).
-- Umbenennen geht nur über rename_group, die serverseitig per auth.uid()
-- prüft, ob der Aufrufer Admin der Gruppe ist (gleiches Muster wie
-- set_member_role und delete_group in 006).
--
-- Außerdem:
-- - Längenprüfung für groups.name in der Datenbank (bisher nur im Formular).
--   Als NOT VALID: gilt für alle neuen und geänderten Namen, bestehende Zeilen
--   werden nicht geprüft, falls eine alte zufällig nicht passt.
-- - groups in die Realtime-Publication, damit andere Mitglieder den neuen
--   Namen live sehen. RLS (groups_select: nur Mitglieder) gilt auch für
--   Realtime, Fremde bekommen nichts.

begin;

-- ============ Länge des Namens ============

alter table groups drop constraint if exists groups_name_length;
alter table groups
  add constraint groups_name_length check (char_length(btrim(name)) between 1 and 60) not valid;

-- ============ Umbenennen ============

create or replace function public.rename_group(p_group_slug text, p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
begin
  if auth.uid() is null then
    raise exception 'Nicht eingeloggt';
  end if;
  if not public.is_group_admin(p_group_slug) then
    raise exception using errcode = '42501', message = 'Nur Admins dürfen den Gruppennamen ändern.';
  end if;
  if char_length(v_name) not between 1 and 60 then
    raise exception 'Der Gruppenname muss 1 bis 60 Zeichen lang sein.';
  end if;

  update groups set name = v_name where slug = p_group_slug;
  if not found then
    raise exception 'Gruppe nicht gefunden';
  end if;
  return v_name;
end
$$;

revoke execute on function public.rename_group(text, text) from public, anon;
grant execute on function public.rename_group(text, text) to authenticated;

-- ============ Realtime ============

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'groups'
  ) then
    alter publication supabase_realtime add table groups;
  end if;
end
$$;

commit;
