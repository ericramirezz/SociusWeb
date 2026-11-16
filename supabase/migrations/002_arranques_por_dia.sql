
-- El sistema propone fechas respetando el máximo de arranques por día
-- (config.arranquesPorDia). Para eso necesita contar los arranques de TODOS
-- los clientes, pero la seguridad por fila solo deja ver las órdenes propias.
-- Esta función devuelve únicamente fecha y cantidad, sin datos de nadie.

create or replace function public.arranques_por_dia(desde date)
returns table (fecha date, arranques int)
language sql
stable
security definer
set search_path = ''
as $$
  select o.fecha_arranque, count(*)::int
  from public.ordenes o
  where o.estado in ('agendada', 'en_curso')
    and o.fecha_arranque >= desde
  group by o.fecha_arranque;
$$;

revoke execute on function public.arranques_por_dia(date) from public;
-- anon también: el cotizador propone fechas a visitantes sin cuenta.
grant execute on function public.arranques_por_dia(date) to anon, authenticated;
