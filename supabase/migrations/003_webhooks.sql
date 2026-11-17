-- ============================================================================
-- Socius Web · Migración 003 · Webhooks de pago firmados (Función 2)
-- Cómo se usa: Supabase → SQL Editor → New query → pegar TODO → Run.
-- Se puede volver a correr sin romper nada.
-- Correrla ANTES de usar la versión de la app que trae este cambio: el
-- checkout ya guarda la fecha preferida del cliente (columna nueva).
-- ============================================================================


-- 1. FECHA PREFERIDA EN LA ORDEN ---------------------------------------------
-- Si el pago lo confirma después un webhook, el servidor necesita saber qué
-- fecha de arranque eligió el cliente en el checkout.
alter table public.ordenes add column if not exists fecha_preferida date;
grant update (fecha_preferida) on public.ordenes to authenticated;


-- 2. LA COLA DE AVISOS --------------------------------------------------------
-- 'procesando' = un consumidor lo tomó; ultimo_error = por qué falló el último intento.
alter table public.eventos_pago add column if not exists ultimo_error text;
alter table public.eventos_pago add column if not exists tomado_en timestamptz;
alter table public.eventos_pago drop constraint if exists eventos_pago_estado_check;
alter table public.eventos_pago add constraint eventos_pago_estado_check
  check (estado in ('pendiente', 'procesando', 'procesado', 'error'));

-- Toma hasta `limite` avisos pendientes y los marca como 'procesando' en un solo paso.
-- "for update skip locked": si dos consumidores corren a la vez, cada aviso lo toma
-- solo uno (el otro se salta las filas bloqueadas). Un aviso que se quedó en
-- 'procesando' más de 5 minutos (el proceso se cayó) se vuelve a tomar.
create or replace function public.tomar_eventos_pago(limite int default 10)
returns setof public.eventos_pago
language sql
volatile
security definer
set search_path = ''
as $$
  update public.eventos_pago e
     set estado = 'procesando', tomado_en = now()
   where e.id in (
     select p.id from public.eventos_pago p
      where p.estado = 'pendiente'
         or (p.estado = 'procesando' and p.tomado_en < now() - interval '5 minutes')
      order by p.recibido_en
      limit limite
      for update skip locked
   )
  returning e.*;
$$;

-- Solo el servidor. Ni visitantes ni clientes pueden tocar la cola.
revoke execute on function public.tomar_eventos_pago(int) from public, anon, authenticated;
grant execute on function public.tomar_eventos_pago(int) to service_role;


-- 3. PERMISOS DEL SERVIDOR (service_role) --------------------------------------
-- Como el proyecto no expone las tablas en automático, la llave de servicio
-- también necesita sus permisos. Solo la usan las Edge Functions.
grant select, insert, update on public.eventos_pago to service_role;
grant select, update on public.ordenes to service_role;
grant select, insert, delete on public.partidas to service_role;
grant select, insert on public.pagos to service_role;
grant execute on function public.arranques_por_dia(date) to service_role;
