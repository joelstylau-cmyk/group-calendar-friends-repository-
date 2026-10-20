-- Identitäts-Umbau Etappe 4: Beitreten per Code.
-- KEIN Reset: bestehende Daten bleiben erhalten. Setzt 001 bis 003 voraus.
-- Im Supabase SQL-Editor komplett ausführen (läuft als eine Transaktion).

begin;

-- ============ Code erzeugen ============

-- 8 Zeichen aus 13 zuruf- und abtippsicheren Zeichen (ca. 30 Bit Zufall).
-- Bewusst weggelassen (von einem Paar bleibt höchstens ein Zeichen):
--   optisch:   0/O/Q/D, 1/I/L/J, B/8, S/5, Z/2, G/6/C, U/V, E/F, M/N
--   akustisch: die "-e"-Reimgruppe B C D E G P T W (nur T bleibt), M/N, zwei/drei
-- Übrig: 3 4 6 7 9 A F H K R T X Y. Muss zu JOIN_CODE_ALPHABET in src/lib/joinCode.ts passen.
-- Zufall aus gen_random_uuid() (kryptografisch stark); nur die Bytes ohne
-- Versions-/Varianten-Bits. Die Modulo-Verzerrung (256 mod 13) ist vernachlässigbar.
create function public.new_join_code() returns text
language plpgsql volatile set search_path = public as $$
declare
  alphabet constant text := '34679AFHKRTXY';
  bytes bytea := uuid_send(gen_random_uuid());
  positions constant int[] := array[0, 1, 2, 3, 4, 5, 10, 11];
  code text := '';
  pos int;
begin
  foreach pos in array positions loop
    code := code || substr(alphabet, get_byte(bytes, pos) % length(alphabet) + 1, 1);
  end loop;
  return code;
end
$$;

-- Vergibt beim Anlegen immer einen freien Code; ein vom Client gesetzter Wert wird überschrieben.
-- security definer: muss alle Gruppen sehen, nicht nur die eigenen (RLS).
create function public.set_join_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  loop
    new.join_code := public.new_join_code();
    exit when not exists (select 1 from groups where join_code = new.join_code);
  end loop;
  return new;
end
$$;

-- ============ Spalte ============

alter table groups add column join_code text;

-- Bestehende Gruppen bekommen einen Code.
do $$
declare
  g record;
  code text;
begin
  for g in select slug from groups where join_code is null loop
    loop
      code := public.new_join_code();
      exit when not exists (select 1 from groups where join_code = code);
    end loop;
    update groups set join_code = code where slug = g.slug;
  end loop;
end
$$;

alter table groups
  alter column join_code set not null,
  add constraint groups_join_code_key unique (join_code),
  add constraint groups_join_code_format check (join_code ~ '^[34679AFHKRTXY]{8}$');

create trigger groups_set_join_code
  before insert on groups
  for each row execute function public.set_join_code();

-- ============ Beitreten per Code ============

-- Gibt den Slug der Gruppe zurück, oder null, wenn es den Code nicht gibt.
-- Wer schon Mitglied ist, bleibt es (kein Fehler, kein doppeltes Mitglied).
-- Bindestriche, Leerzeichen und Kleinschreibung in der Eingabe sind egal.
-- security definer: Nicht-Mitglieder dürfen groups nicht lesen; eingetragen
-- wird trotzdem nur der Aufrufer selbst und nur als 'member'.
create function public.join_group_by_code(p_code text) returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  v_slug text;
begin
  if auth.uid() is null then
    raise exception 'Nicht eingeloggt';
  end if;

  select slug into v_slug from groups
  where join_code = upper(regexp_replace(coalesce(p_code, ''), '[^0-9A-Za-z]', '', 'g'));

  if v_slug is null then
    return null;
  end if;

  insert into members (group_slug, user_id, role)
  values (v_slug, auth.uid(), 'member')
  on conflict (group_slug, user_id) do nothing;

  return v_slug;
end
$$;

-- ============ Rechte ============

revoke execute on function public.new_join_code() from public, anon, authenticated;
revoke execute on function public.set_join_code() from public, anon, authenticated;
revoke execute on function public.join_group_by_code(text) from public, anon;
grant execute on function public.join_group_by_code(text) to authenticated;

-- Den Code sehen nur Mitglieder (bestehende Policy groups_select); get_group gibt ihn nicht preis.

commit;

-- API-Schema neu laden, damit Spalte und Funktion sofort nutzbar sind.
notify pgrst, 'reload schema';
