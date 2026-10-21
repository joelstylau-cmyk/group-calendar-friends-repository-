-- 009: Keep-alive für die GitHub Action (.github/workflows/supabase-keepalive.yml)
--
-- Supabase pausiert Projekte im Free-Plan nach einer Woche ohne Aktivität.
-- Die Action ruft alle 3 Tage diese Funktion über die REST-API mit dem
-- anon-Key auf (POST /rest/v1/rpc/keepalive).
--
-- Warum eine eigene Funktion: anon hat bewusst auf keine Tabelle Rechte
-- (001: revoke all ... from anon), ein normales Select würde abgelehnt.
-- Daran ändert sich nichts. keepalive() liest keine Tabelle, schreibt nichts
-- und gibt nur die Zahl 1 zurück; sie läuft mit den Rechten des Aufrufers
-- (security invoker), nicht erhöht.

begin;

create or replace function public.keepalive() returns integer
language sql stable security invoker set search_path = public as $$
  select 1
$$;

revoke execute on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;

commit;
