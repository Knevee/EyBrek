-- =====================================================================
-- EyBrek - Quitar las tablas del esquema anterior (estilo MySQL)
--
-- Usalo solo si en el proyecto de Supabase ya existen las tablas
-- usuario, sesion, configuracion, ejercicio y progreso_rotacion creadas
-- con otro script. Esas tablas usan ids numericos y Supabase Auth usa
-- uuid, por eso esquema.sql no puede trabajar con ellas.
--
-- PASO 1: ejecuta solo esta consulta y revisa que no haya datos que
--         quieras conservar.
-- =====================================================================

select 'usuario' as tabla, count(*) as filas from public.usuario
union all select 'sesion', count(*) from public.sesion
union all select 'configuracion', count(*) from public.configuracion
union all select 'ejercicio', count(*) from public.ejercicio
union all select 'progreso_rotacion', count(*) from public.progreso_rotacion;

-- =====================================================================
-- PASO 2: si estas de acuerdo, selecciona desde aqui hasta el final y
--         ejecutalo. BORRA esas tablas y sus datos; no se puede deshacer.
--         Despues ejecuta esquema.sql.
-- =====================================================================

-- drop table if exists public.progreso_rotacion cascade;
-- drop table if exists public.configuracion     cascade;
-- drop table if exists public.sesion            cascade;
-- drop table if exists public.ejercicio         cascade;
-- drop table if exists public.usuario           cascade;
