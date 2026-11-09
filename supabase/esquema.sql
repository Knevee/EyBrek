-- =====================================================================
-- EyBrek - Esquema para Supabase (servidor en la nube)
--
-- Como usarlo:
--   Supabase > SQL Editor > New query > pegar este archivo > Run
--
-- Se puede ejecutar varias veces: no borra datos.
--
-- Equivalencias con el servidor local (Node.js + Express):
--   Autenticacion   -> Supabase Auth (usuarios, contrasenas con hash y sesiones)
--   Configuracion   -> tabla configuracion + restricciones del RF-11
--   Ejercicios      -> tabla ejercicio + funcion siguiente_ejercicio()
--   Acceso a datos  -> Postgres con seguridad por fila (RLS)
--
-- La tabla Sesion ya no hace falta: Supabase Auth guarda las sesiones.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

-- Usuario: los datos de acceso estan en auth.users (Supabase Auth).
-- Aqui solo se guarda el nombre que se muestra en la aplicacion.
create table if not exists public.perfil (
  id_usuario     uuid primary key references auth.users (id) on delete cascade,
  nombre         text        not null,
  correo         text        not null,
  fecha_creacion timestamptz not null default now()
);

-- Configuracion: una por usuario (1 a 1). Valores por defecto del RF-12.
-- Las reglas del RF-11 las valida la propia base de datos.
create table if not exists public.configuracion (
  id_usuario             uuid    primary key references public.perfil (id_usuario) on delete cascade,
  bloqueo_activo         boolean not null default true,
  intervalo_minutos      integer not null default 120,
  duracion_minutos       integer not null default 15,
  hora_inicio            time    not null default '08:00',
  hora_fin               time    not null default '21:00',
  notificaciones_activas boolean not null default true,
  constraint intervalo_en_rango check (intervalo_minutos between 15 and 480),
  constraint duracion_en_rango  check (duracion_minutos between 1 and 30),
  constraint duracion_menor     check (duracion_minutos < intervalo_minutos),
  constraint horario_valido     check (hora_inicio <> hora_fin)
);

-- Ejercicio: catalogo compartido (RNF-07). Agregar uno es un INSERT.
create table if not exists public.ejercicio (
  id_ejercicio  integer generated always as identity primary key,
  titulo        text    not null,
  instrucciones text    not null,
  orden         integer not null unique
);

-- ProgresoRotacion: ultimo ejercicio mostrado a cada usuario (RF-21).
create table if not exists public.progreso_rotacion (
  id_usuario          uuid    primary key references public.perfil (id_usuario) on delete cascade,
  id_ultimo_ejercicio integer references public.ejercicio (id_ejercicio) on delete set null
);


-- ---------------------------------------------------------------------
-- Catalogo inicial de ejercicios
-- ---------------------------------------------------------------------

insert into public.ejercicio (titulo, instrucciones, orden) values
  ('Cerca y lejos', 'Mira tu pulgar 5 segundos y luego algo lejano, refléjalo 5 veces.', 1),
  ('Parpadeo',      'Cierra los ojos y mantenlos así por 2 segundos. Repítelo 10 veces.', 2),
  ('En círculos',   'Dibuja un círculo con la mirada, 3 veces a cada lado.', 3),
  ('Palmas',        'Cubre tus ojos con las palmas tibias por 30 segundos.', 4)
on conflict (orden) do update
  set titulo = excluded.titulo,
      instrucciones = excluded.instrucciones;


-- ---------------------------------------------------------------------
-- Registro: cada cuenta nueva recibe su perfil, su configuracion por
-- defecto (RF-12) y su progreso de rotacion, en la misma transaccion.
-- ---------------------------------------------------------------------

create or replace function public.preparar_cuenta_nueva()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfil (id_usuario, nombre, correo)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id_usuario) do nothing;

  insert into public.configuracion (id_usuario) values (new.id)
  on conflict (id_usuario) do nothing;

  insert into public.progreso_rotacion (id_usuario) values (new.id)
  on conflict (id_usuario) do nothing;

  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.preparar_cuenta_nueva();


-- ---------------------------------------------------------------------
-- Rotacion de ejercicios (RF-20, RF-21)
-- Entrega el siguiente ejercicio del usuario de la sesion y guarda el
-- avance. Al terminar la lista vuelve al primero. El bloqueo de fila
-- evita que dos equipos avancen la rotacion a la vez.
-- ---------------------------------------------------------------------

create or replace function public.siguiente_ejercicio()
returns table (
  id_ejercicio  integer,
  titulo        text,
  instrucciones text,
  orden         integer,
  posicion      integer,
  total         integer
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_usuario      uuid := auth.uid();
  v_orden_ultimo integer;
  v_total        integer;
  v_siguiente    public.ejercicio%rowtype;
begin
  if v_usuario is null then
    raise exception 'No hay una sesion iniciada.' using errcode = '28000';
  end if;

  select count(*) into v_total from public.ejercicio;
  if v_total = 0 then
    raise exception 'No hay ejercicios disponibles en el catalogo.';
  end if;

  insert into public.progreso_rotacion (id_usuario) values (v_usuario)
  on conflict (id_usuario) do nothing;

  perform 1 from public.progreso_rotacion p
   where p.id_usuario = v_usuario
     for update;

  select e.orden into v_orden_ultimo
    from public.progreso_rotacion p
    join public.ejercicio e on e.id_ejercicio = p.id_ultimo_ejercicio
   where p.id_usuario = v_usuario;

  select * into v_siguiente
    from public.ejercicio e
   where v_orden_ultimo is null or e.orden > v_orden_ultimo
   order by e.orden
   limit 1;

  if not found then
    select * into v_siguiente from public.ejercicio e order by e.orden limit 1;
  end if;

  update public.progreso_rotacion p
     set id_ultimo_ejercicio = v_siguiente.id_ejercicio
   where p.id_usuario = v_usuario;

  return query
  select v_siguiente.id_ejercicio,
         v_siguiente.titulo,
         v_siguiente.instrucciones,
         v_siguiente.orden,
         (select count(*) from public.ejercicio e where e.orden <= v_siguiente.orden)::integer,
         v_total;
end;
$$;

revoke execute on function public.siguiente_ejercicio() from public, anon;
grant execute on function public.siguiente_ejercicio() to authenticated;


-- ---------------------------------------------------------------------
-- Seguridad por fila (RLS): cada persona solo ve y cambia lo suyo.
-- ---------------------------------------------------------------------

alter table public.perfil            enable row level security;
alter table public.configuracion     enable row level security;
alter table public.ejercicio         enable row level security;
alter table public.progreso_rotacion enable row level security;

drop policy if exists "perfil propio: leer" on public.perfil;
create policy "perfil propio: leer" on public.perfil
  for select to authenticated using ((select auth.uid()) = id_usuario);

drop policy if exists "configuracion propia: leer" on public.configuracion;
create policy "configuracion propia: leer" on public.configuracion
  for select to authenticated using ((select auth.uid()) = id_usuario);

drop policy if exists "configuracion propia: crear" on public.configuracion;
create policy "configuracion propia: crear" on public.configuracion
  for insert to authenticated with check ((select auth.uid()) = id_usuario);

drop policy if exists "configuracion propia: cambiar" on public.configuracion;
create policy "configuracion propia: cambiar" on public.configuracion
  for update to authenticated
  using ((select auth.uid()) = id_usuario)
  with check ((select auth.uid()) = id_usuario);

drop policy if exists "catalogo: leer" on public.ejercicio;
create policy "catalogo: leer" on public.ejercicio
  for select to authenticated using (true);

-- progreso_rotacion no tiene politicas: solo se cambia a traves de
-- siguiente_ejercicio(), que corre con permisos del propietario.
