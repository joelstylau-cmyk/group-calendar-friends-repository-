-- Identitäts-Umbau Etappe 3: Gruppe verlassen.
-- KEIN Reset: bestehende Daten bleiben erhalten. Setzt 001 und 002 voraus.
-- Im Supabase SQL-Editor komplett ausführen.

-- Entfernt die eigene Mitgliedschaft und die eigenen Verfügbarkeiten in allen
-- Runden der Gruppe, in einem Schritt (eine Transaktion, ganz oder gar nicht).
-- security invoker: läuft mit den Rechten des Aufrufers, die bestehenden
-- Policies (availability_delete, members_delete) erlauben genau das.
create function public.leave_group(p_group_slug text) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Nicht eingeloggt';
  end if;

  delete from availability a
  using rounds r
  where a.round_id = r.id and r.group_slug = p_group_slug and a.user_id = auth.uid();

  delete from members
  where group_slug = p_group_slug and user_id = auth.uid();
end
$$;

revoke execute on function public.leave_group(text) from public, anon;
grant execute on function public.leave_group(text) to authenticated;

-- API-Schema neu laden, damit die Funktion sofort per RPC aufrufbar ist.
notify pgrst, 'reload schema';
