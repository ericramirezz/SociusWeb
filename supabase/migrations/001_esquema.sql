-- ============================================================================
-- Socius Web · Migración 001 · Esquema inicial
-- Cómo se usa: Supabase → SQL Editor → New query → pegar TODO → Run.
-- Se puede volver a correr sin romper nada (if not exists / drop ... if exists).
-- ============================================================================


-- 1. PERFILES ---------------------------------------------------------------
-- Un perfil por cliente con cuenta. Se crea solo cuando alguien entra por
-- primera vez (trigger sobre auth.users, la tabla de usuarios de Supabase).
create table if not exists public.perfiles (
  id        uuid primary key references auth.users (id) on delete cascade,
  email     text,
  nombre    text,
  empresa   text,
  telefono  text,
  creado_en timestamptz not null default now()
);

create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Nadie la llama desde la API; solo el trigger.
revoke execute on function public.crear_perfil() from public, anon, authenticated;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();


-- 2. ÓRDENES ----------------------------------------------------------------
-- Mismos campos que la orden de core/servicioPedidos.js.
-- El número de orden lo da la base (SOC-100001, SOC-100002…): el actual, hecho
-- con la hora, puede repetirse.
create sequence if not exists public.orden_numero start 100001;

create table if not exists public.ordenes (
  id              text primary key default ('SOC-' || nextval('public.orden_numero')::text),
  cliente_id      uuid references auth.users (id) on delete set null,
  cliente         jsonb not null,          -- nombre, empresa, email, teléfono capturados en el checkout
  estado          text not null default 'cotizada'
                  check (estado in ('cotizada', 'pagada', 'agendada', 'en_curso',
                                    'completada', 'cancelada', 'reembolsada')),
  historial       jsonb not null default '[]'::jsonb,
  moneda          text not null default 'MXN',
  total_hoy       numeric(12, 2) not null check (total_hoy >= 0),
  total_contrato  numeric(12, 2) not null check (total_contrato >= 0),
  requiere_agenda boolean not null default false,
  fecha_arranque  date,
  fecha_entrega   date,
  fecha_fin       date,
  fecha_ajustada  boolean not null default false,
  reembolso       jsonb,
  fecha_orden     timestamptz not null default now()
);
create index if not exists ordenes_cliente_idx on public.ordenes (cliente_id);


-- 3. PARTIDAS ---------------------------------------------------------------
-- Un renglón por programa comprado dentro de una orden.
create table if not exists public.partidas (
  id             bigint generated always as identity primary key,
  orden_id       text not null references public.ordenes (id) on delete cascade,
  programa_id    text not null,
  nombre         text not null,
  tipo           text not null check (tipo in ('servicio', 'digital')),
  precio         numeric(12, 2) not null,
  cobro_hoy      numeric(12, 2) not null,
  total_contrato numeric(12, 2) not null
);
create index if not exists partidas_orden_idx on public.partidas (orden_id);


-- 4. PAGOS ------------------------------------------------------------------
-- Un cobro aprobado por la pasarela. Sirve para reembolsos y conciliación.
create table if not exists public.pagos (
  id             bigint generated always as identity primary key,
  orden_id       text not null references public.ordenes (id) on delete cascade,
  pasarela       text not null,            -- stripe | mercadopago | paypal
  id_transaccion text not null,
  monto          numeric(12, 2) not null check (monto > 0),
  creado_en      timestamptz not null default now(),
  unique (pasarela, id_transaccion)
);
create index if not exists pagos_orden_idx on public.pagos (orden_id);


-- 5. LLAMADAS ---------------------------------------------------------------
-- Llamadas estratégicas. Las agenda cualquier visitante, con o sin cuenta.
-- El "unique" impide que dos personas tomen el mismo horario.
create table if not exists public.llamadas (
  id        bigint generated always as identity primary key,
  fecha     date not null,
  hora      text not null check (hora ~ '^[0-2][0-9]:[0-5][0-9]$'),
  nombre    text not null check (char_length(nombre) between 1 and 120),
  empresa   text not null check (char_length(empresa) between 1 and 120),
  email     text not null check (char_length(email) between 3 and 200),
  telefono  text not null check (char_length(telefono) between 5 and 40),
  mensaje   text check (char_length(mensaje) <= 1000),
  creado_en timestamptz not null default now(),
  unique (fecha, hora)
);

-- Horarios ocupados SIN datos personales: es lo único que el navegador
-- puede leer de esta tabla.
create or replace function public.horarios_ocupados(desde date, hasta date)
returns table (fecha date, hora text)
language sql
stable
security definer
set search_path = ''
as $$
  select l.fecha, l.hora
  from public.llamadas l
  where l.fecha between desde and hasta;
$$;

revoke execute on function public.horarios_ocupados(date, date) from public;
grant execute on function public.horarios_ocupados(date, date) to anon, authenticated;


-- 6. EVENTOS DE PAGO (webhooks, función 2) ----------------------------------
-- Cola de avisos de las pasarelas. Solo la usa el servidor (service_role);
-- el navegador no tiene ningún permiso sobre ella.
create table if not exists public.eventos_pago (
  id           bigint generated always as identity primary key,
  evento_id    text not null,
  pasarela     text not null,
  tipo         text not null,
  contenido    jsonb not null,
  estado       text not null default 'pendiente'
               check (estado in ('pendiente', 'procesado', 'error')),
  intentos     int not null default 0,
  recibido_en  timestamptz not null default now(),
  procesado_en timestamptz,
  unique (pasarela, evento_id)             -- el mismo aviso dos veces no se duplica
);


-- 7. SEGURIDAD POR FILA (RLS) -----------------------------------------------
alter table public.perfiles     enable row level security;
alter table public.ordenes      enable row level security;
alter table public.partidas     enable row level security;
alter table public.pagos        enable row level security;
alter table public.llamadas     enable row level security;
alter table public.eventos_pago enable row level security;

-- Perfiles: cada quien ve y edita solo el suyo.
drop policy if exists "perfil propio: leer" on public.perfiles;
create policy "perfil propio: leer" on public.perfiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists "perfil propio: editar" on public.perfiles;
create policy "perfil propio: editar" on public.perfiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Órdenes: cada cliente ve solo las suyas y solo puede crearlas como "cotizada".
drop policy if exists "orden propia: leer" on public.ordenes;
create policy "orden propia: leer" on public.ordenes
  for select to authenticated using (cliente_id = (select auth.uid()));

drop policy if exists "orden propia: crear" on public.ordenes;
create policy "orden propia: crear" on public.ordenes
  for insert to authenticated
  with check (cliente_id = (select auth.uid()) and estado = 'cotizada');

-- TEMPORAL mientras el pago es simulado: el navegador avanza el estado.
-- En el Sprint 7 esto se quita y solo el servidor (webhook) cambia el estado.
drop policy if exists "orden propia: actualizar (temporal)" on public.ordenes;
create policy "orden propia: actualizar (temporal)" on public.ordenes
  for update to authenticated
  using (cliente_id = (select auth.uid()))
  with check (cliente_id = (select auth.uid()));

-- Partidas: se leen si la orden es tuya; se crean o reemplazan solo mientras
-- la orden sigue cotizada (después de pagar quedan congeladas).
drop policy if exists "partidas de orden propia: leer" on public.partidas;
create policy "partidas de orden propia: leer" on public.partidas
  for select to authenticated using (exists (
    select 1 from public.ordenes o
    where o.id = orden_id and o.cliente_id = (select auth.uid())));

drop policy if exists "partidas de orden cotizada: crear" on public.partidas;
create policy "partidas de orden cotizada: crear" on public.partidas
  for insert to authenticated with check (exists (
    select 1 from public.ordenes o
    where o.id = orden_id and o.cliente_id = (select auth.uid()) and o.estado = 'cotizada'));

drop policy if exists "partidas de orden cotizada: borrar" on public.partidas;
create policy "partidas de orden cotizada: borrar" on public.partidas
  for delete to authenticated using (exists (
    select 1 from public.ordenes o
    where o.id = orden_id and o.cliente_id = (select auth.uid()) and o.estado = 'cotizada'));

-- Pagos: se leen si la orden es tuya.
drop policy if exists "pagos de orden propia: leer" on public.pagos;
create policy "pagos de orden propia: leer" on public.pagos
  for select to authenticated using (exists (
    select 1 from public.ordenes o
    where o.id = orden_id and o.cliente_id = (select auth.uid())));

-- TEMPORAL mientras el pago es simulado; en el Sprint 7 solo el servidor los crea.
drop policy if exists "pagos de orden propia: crear (temporal)" on public.pagos;
create policy "pagos de orden propia: crear (temporal)" on public.pagos
  for insert to authenticated with check (exists (
    select 1 from public.ordenes o
    where o.id = orden_id and o.cliente_id = (select auth.uid())));

-- Llamadas: cualquiera agenda (fecha de hoy en adelante); nadie lee las de otros.
drop policy if exists "llamadas: agendar" on public.llamadas;
create policy "llamadas: agendar" on public.llamadas
  for insert to anon, authenticated with check (fecha >= current_date);

-- eventos_pago: sin políticas a propósito = cerrada para el navegador.


-- 8. PERMISOS PARA LA API ---------------------------------------------------
-- El proyecto se creó sin exponer tablas automáticamente, así que cada
-- permiso se da aquí, explícito. RLS decide además QUÉ filas.
grant select on public.perfiles to authenticated;
grant update (nombre, empresa, telefono) on public.perfiles to authenticated;

grant select, insert on public.ordenes to authenticated;
grant update (cliente, estado, historial, total_hoy, total_contrato, requiere_agenda,
              fecha_arranque, fecha_entrega, fecha_fin, fecha_ajustada, reembolso)
  on public.ordenes to authenticated;
grant usage on sequence public.orden_numero to authenticated;

grant select, insert, delete on public.partidas to authenticated;
grant select, insert on public.pagos to authenticated;
grant insert on public.llamadas to anon, authenticated;
-- eventos_pago: ningún permiso para anon ni authenticated.
