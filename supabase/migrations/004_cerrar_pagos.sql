-- Sprint 7: con Stripe, Mercado Pago y PayPal cobrando de verdad (modo prueba),
-- se quitan los permisos TEMPORALES de la migración 001.
--
-- Desde aquí, solo el servidor (webhook-pagos / procesar-eventos, con service_role)
-- marca una orden como pagada o reembolsada y registra pagos.
-- El navegador del cliente solo puede:
--   · editar su orden mientras está cotizada (reintento de pago) o cancelarla
--   · cancelar una orden pagada o agendada, dejando la solicitud de reembolso
--   · pedir la devolución de una orden en curso o completada (solicitud de reembolso)
--   · avanzar agendada → en curso → completada cuando ya llegó la fecha
-- Es la misma tabla de transiciones de src/core/estadoOrden.js (patrón State),
-- ahora también del lado de la base para que nadie se la salte con la API.
--
-- Se pega completa en el SQL Editor de Supabase; se puede correr más de una vez.


-- 1. PAGOS: el navegador ya no los crea ------------------------------------
drop policy if exists "pagos de orden propia: crear (temporal)" on public.pagos;


-- 2. ÓRDENES: el navegador actualiza solo lo que le toca --------------------
drop policy if exists "orden propia: actualizar (temporal)" on public.ordenes;
drop policy if exists "orden propia: actualizar" on public.ordenes;
create policy "orden propia: actualizar" on public.ordenes
  for update to authenticated
  using (cliente_id = (select auth.uid()))
  with check (cliente_id = (select auth.uid()));

-- La política dice QUÉ órdenes (las tuyas); el trigger dice QUÉ CAMBIOS.
create or replace function public.proteger_orden()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  rol text := coalesce(auth.role(), '');
  paso text := old.estado || '>' || new.estado;
begin
  -- El servidor (service_role) y el SQL Editor no pasan por estas reglas.
  if rol not in ('authenticated', 'anon') then
    return new;
  end if;

  if new.cliente_id is distinct from old.cliente_id then
    raise exception 'No se puede cambiar el dueño de la orden %', old.id;
  end if;

  -- Mientras está cotizada, el cliente puede rehacerla o cancelarla, nunca pagarla.
  if old.estado = 'cotizada' then
    if new.estado not in ('cotizada', 'cancelada') then
      raise exception 'Solo la pasarela de pago puede marcar la orden % como %', old.id, new.estado;
    end if;
    if new.reembolso is not null then
      raise exception 'La orden % no tiene pago que reembolsar', old.id;
    end if;
    return new;
  end if;

  -- Ya pagada: montos, datos del cliente y fechas quedan congelados.
  if (new.total_hoy, new.total_contrato, new.moneda, new.cliente, new.requiere_agenda,
      new.fecha_arranque, new.fecha_fin, new.fecha_entrega, new.fecha_ajustada, new.fecha_preferida)
     is distinct from
     (old.total_hoy, old.total_contrato, old.moneda, old.cliente, old.requiere_agenda,
      old.fecha_arranque, old.fecha_fin, old.fecha_entrega, old.fecha_ajustada, old.fecha_preferida) then
    raise exception 'La orden % ya está pagada: solo cambia su estado', old.id;
  end if;

  -- Cambios de estado que el navegador sí puede hacer.
  if new.estado <> old.estado and not (
       paso in ('pagada>cancelada', 'agendada>cancelada')
    or (paso = 'agendada>en_curso'   and old.fecha_arranque <= current_date)
    or (paso = 'en_curso>completada' and old.fecha_fin      <= current_date)
  ) then
    raise exception 'Solo la pasarela de pago puede pasar la orden % de % a %', old.id, old.estado, new.estado;
  end if;

  -- Reembolso: el cliente solo deja la solicitud; "emitido" lo pone el webhook.
  if new.reembolso is distinct from old.reembolso and not (
       old.reembolso is null and new.reembolso ->> 'estado' = 'solicitado'
  ) then
    raise exception 'Solo la pasarela de pago puede registrar el reembolso de la orden %', old.id;
  end if;

  -- El historial solo crece.
  if jsonb_array_length(new.historial) < jsonb_array_length(old.historial) then
    raise exception 'No se puede borrar el historial de la orden %', old.id;
  end if;

  return new;
end;
$$;

revoke execute on function public.proteger_orden() from public, anon, authenticated;

drop trigger if exists proteger_orden on public.ordenes;
create trigger proteger_orden
  before update on public.ordenes
  for each row execute function public.proteger_orden();
