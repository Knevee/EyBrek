'use strict';

/**
 * MODULO: Comunicacion y copia local (cliente) - Supabase (nube)
 * Habla con el servidor de EyBrek en Supabase. Ofrece exactamente las
 * mismas operaciones que servidor-local.js, asi que el resto del
 * cliente no sabe cual de los dos esta en uso.
 *
 * Oculta: la direccion del proyecto, la clave publica, como se guarda
 * la sesion y como se traducen los errores de Supabase.
 *
 * La clave "anon" es publica por diseno: la seguridad la dan las
 * politicas de seguridad por fila (RLS) de supabase/esquema.sql.
 */

const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');
const { createClient } = require('@supabase/supabase-js');

// El proceso principal de Electron 33 usa Node.js 20, que no trae
// WebSocket propio, y supabase-js lo exige al crear el cliente.
const WebSocket = globalThis.WebSocket || require('ws');

const config = require('../../config.json');
const ErrorComunicacion = require('./error-comunicacion');
const copiaLocal = require('./copia-local');
const { validarConfiguracion, normalizarHora } = require('../../compartido/validacion-configuracion');

const ARCHIVO_SESION = 'sesion-supabase.json';
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LONGITUD_MINIMA_NOMBRE = 3;
const LONGITUD_MINIMA_CONTRASENA = 8;

// El cliente guarda su sesion por su cuenta; main.js solo necesita saber
// que hay una sesion iniciada.
const MARCA_SESION = 'supabase';

const CAMPOS_CONFIGURACION =
  'bloqueo_activo, intervalo_minutos, duracion_minutos, hora_inicio, hora_fin, notificaciones_activas';

let cliente = null;

// =====================================================================
// Sesion guardada en el equipo (cifrada con el usuario de Windows)
// =====================================================================

function rutaSesion() {
  return path.join(app.getPath('userData'), ARCHIVO_SESION);
}

function leerAlmacen() {
  try {
    if (!fs.existsSync(rutaSesion())) return {};
    const contenido = fs.readFileSync(rutaSesion());
    const texto = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(contenido)
      : contenido.toString('utf8');
    return JSON.parse(texto);
  } catch (error) {
    return {};
  }
}

function escribirAlmacen(datos) {
  const texto = JSON.stringify(datos);
  const contenido = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(texto)
    : Buffer.from(texto, 'utf8');
  fs.writeFileSync(rutaSesion(), contenido);
}

const almacenamiento = {
  getItem: (clave) => {
    const valor = leerAlmacen()[clave];
    return valor === undefined ? null : valor;
  },
  setItem: (clave, valor) => {
    const datos = leerAlmacen();
    datos[clave] = valor;
    escribirAlmacen(datos);
  },
  removeItem: (clave) => {
    const datos = leerAlmacen();
    delete datos[clave];
    escribirAlmacen(datos);
  },
};

// =====================================================================
// Cliente de Supabase
// =====================================================================

/** fetch con tiempo maximo de espera, para no quedarse colgado sin red. */
function fetchConEspera(url, opciones = {}) {
  const espera = AbortSignal.timeout(config.tiempoEsperaPeticionMs || 8000);
  const signal = opciones.signal ? AbortSignal.any([opciones.signal, espera]) : espera;
  return fetch(url, { ...opciones, signal });
}

function obtenerCliente() {
  if (cliente) return cliente;

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new ErrorComunicacion(
      'Falta configurar Supabase (supabaseUrl y supabaseAnonKey en config.json).'
    );
  }

  cliente = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      storage: almacenamiento,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    global: { fetch: fetchConEspera },
    realtime: { transport: WebSocket },
  });

  return cliente;
}

// =====================================================================
// Errores
// =====================================================================

function esFallaDeRed(error) {
  if (!error) return false;
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) return true;
  const mensaje = `${error.name || ''} ${error.message || ''} ${error.details || ''}`;
  return /fetch failed|failed to fetch|network|ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|timeout|aborted/i.test(
    mensaje
  );
}

const MENSAJES_RESTRICCION = {
  intervalo_en_rango: 'El intervalo debe estar entre 15 minutos y 8 horas (480 minutos).',
  duracion_en_rango: 'La duracion del bloqueo debe estar entre 1 y 30 minutos.',
  duracion_menor: 'La duracion del bloqueo debe ser menor que el intervalo.',
  horario_valido: 'La hora de fin debe ser distinta de la hora de inicio.',
};

/** Traduce un error de Supabase a un mensaje para el usuario. */
function traducir(error) {
  if (esFallaDeRed(error)) {
    return new ErrorComunicacion('No se pudo conectar con el servidor de EyBrek.', true);
  }

  const codigo = error.code || '';
  const mensaje = error.message || '';

  if (codigo === 'invalid_credentials' || /invalid login credentials/i.test(mensaje)) {
    return new Error('Correo o contrasena incorrectos.');
  }
  if (codigo === 'email_provider_disabled' || /email logins are disabled/i.test(mensaje)) {
    return new Error(
      'El inicio de sesion con correo esta desactivado en el servidor de EyBrek (Supabase > Authentication > Email).'
    );
  }
  if (codigo === 'email_not_confirmed') {
    return new Error('Confirma tu correo antes de iniciar sesion (revisa tu bandeja de entrada).');
  }
  if (codigo === 'user_already_exists' || /already registered/i.test(mensaje)) {
    return new Error('Ese correo electronico ya esta registrado.');
  }
  if (codigo === 'weak_password' || /password should be/i.test(mensaje)) {
    return new Error(`La contrasena debe tener al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres.`);
  }
  if (error.status === 429 || /rate limit/i.test(mensaje)) {
    return new Error('Demasiados intentos. Espera unos minutos y vuelve a intentarlo.');
  }
  if (codigo === '23514') {
    const restriccion = Object.keys(MENSAJES_RESTRICCION).find((nombre) => mensaje.includes(nombre));
    return new Error(MENSAJES_RESTRICCION[restriccion] || 'La configuracion no es valida.');
  }
  if (codigo === 'PGRST301' || codigo === '28000' || error.status === 401) {
    return new Error('La sesion no es valida o ya se cerro.');
  }

  return new Error(mensaje || 'Ocurrio un error inesperado en el servidor.');
}

/** Ejecuta una operacion de Supabase y lanza el error traducido. */
async function ejecutar(operacion) {
  let resultado;
  try {
    resultado = await operacion(obtenerCliente());
  } catch (error) {
    throw error instanceof ErrorComunicacion ? error : traducir(error);
  }
  if (resultado && resultado.error) throw traducir(resultado.error);
  return resultado ? resultado.data : null;
}

/** Usuario de la sesion guardada (sin ir a la red). */
async function usuarioDeLaSesion() {
  const datos = await ejecutar((supabase) => supabase.auth.getSession());
  if (!datos || !datos.session) throw new Error('No hay una sesion iniciada.');
  return datos.session.user;
}

function aUsuario(usuario) {
  const metadatos = usuario.user_metadata || {};
  return {
    id_usuario: usuario.id,
    nombre: metadatos.nombre || String(usuario.email || '').split('@')[0],
    correo: usuario.email,
  };
}

function aConfiguracion(fila) {
  if (!fila) return null;
  return {
    bloqueo_activo: Boolean(fila.bloqueo_activo),
    intervalo_minutos: Number(fila.intervalo_minutos),
    duracion_minutos: Number(fila.duracion_minutos),
    hora_inicio: normalizarHora(fila.hora_inicio),
    hora_fin: normalizarHora(fila.hora_fin),
    notificaciones_activas: Boolean(fila.notificaciones_activas),
  };
}

// =====================================================================
// Operaciones (las mismas de servidor-local.js)
// =====================================================================

/** Registra una cuenta nueva (RF-01, RF-02). La base crea su configuracion (RF-12). */
async function registrar(nombre, correo, contrasena) {
  const nombreLimpio = String(nombre || '').trim();
  const correoLimpio = String(correo || '').trim().toLowerCase();

  if (nombreLimpio.length < LONGITUD_MINIMA_NOMBRE) {
    throw new Error(`El nombre debe tener al menos ${LONGITUD_MINIMA_NOMBRE} caracteres.`);
  }
  if (!FORMATO_CORREO.test(correoLimpio)) {
    throw new Error('El correo electronico no tiene un formato valido.');
  }
  if (String(contrasena || '').length < LONGITUD_MINIMA_CONTRASENA) {
    throw new Error(`La contrasena debe tener al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres.`);
  }

  const datos = await ejecutar((supabase) =>
    supabase.auth.signUp({
      email: correoLimpio,
      password: contrasena,
      options: { data: { nombre: nombreLimpio } },
    })
  );

  // Con la confirmacion por correo activa, Supabase no avisa que el correo
  // ya existe: devuelve un usuario sin identidades.
  if (datos.user && Array.isArray(datos.user.identities) && datos.user.identities.length === 0) {
    throw new Error('Ese correo electronico ya esta registrado.');
  }

  if (!datos.session) {
    return { ok: true, mensaje: 'Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesion.' };
  }

  // Igual que con el servidor local: tras registrarse se inicia sesion aparte.
  await ejecutar((supabase) => supabase.auth.signOut({ scope: 'local' }));
  return { ok: true, mensaje: 'Cuenta creada. Ya puedes iniciar sesion.' };
}

/** Inicia sesion y devuelve la configuracion del usuario (RF-03, RF-14). */
async function iniciarSesion(correo, contrasena) {
  const datos = await ejecutar((supabase) =>
    supabase.auth.signInWithPassword({
      email: String(correo || '').trim().toLowerCase(),
      password: String(contrasena || ''),
    })
  );

  const configuracion = await obtenerConfiguracion();

  return {
    ok: true,
    datos: {
      token: MARCA_SESION,
      usuario: aUsuario(datos.user),
      configuracion: configuracion.datos.configuracion,
    },
  };
}

/** Cierra la sesion (RF-04). Sin red, la sesion local se borra igual. */
async function cerrarSesion() {
  try {
    await ejecutar((supabase) => supabase.auth.signOut());
  } catch (error) {
    await obtenerCliente().auth.signOut({ scope: 'local' });
    throw error;
  }
  return { ok: true };
}

/** Descarga la configuracion del usuario (RF-13, RF-14). */
async function obtenerConfiguracion() {
  const usuario = await usuarioDeLaSesion();

  let fila = await ejecutar((supabase) =>
    supabase.from('configuracion').select(CAMPOS_CONFIGURACION).eq('id_usuario', usuario.id).maybeSingle()
  );

  // Por si la cuenta se creo antes de instalar el esquema: valores por defecto (RF-12).
  if (!fila) {
    fila = await ejecutar((supabase) =>
      supabase
        .from('configuracion')
        .insert({ id_usuario: usuario.id })
        .select(CAMPOS_CONFIGURACION)
        .single()
    );
  }

  return { ok: true, datos: { configuracion: aConfiguracion(fila) } };
}

/** Guarda la configuracion (RF-10, RF-11). La base vuelve a validar los rangos. */
async function guardarConfiguracion(configuracion) {
  const { errores, valores } = validarConfiguracion(configuracion);
  if (errores.length > 0) throw new Error(errores[0]);

  const usuario = await usuarioDeLaSesion();

  const fila = await ejecutar((supabase) =>
    supabase
      .from('configuracion')
      .update(valores)
      .eq('id_usuario', usuario.id)
      .select(CAMPOS_CONFIGURACION)
      .single()
  );

  return { ok: true, mensaje: 'Configuracion guardada.', datos: { configuracion: aConfiguracion(fila) } };
}

/** Pide el siguiente ejercicio de la rotacion (RF-20, RF-21). */
async function obtenerSiguienteEjercicio() {
  const filas = await ejecutar((supabase) => supabase.rpc('siguiente_ejercicio'));
  const ejercicio = Array.isArray(filas) ? filas[0] : filas;
  if (!ejercicio) throw new Error('No hay ejercicios disponibles en el catalogo.');
  return { ok: true, datos: { ejercicio } };
}

/** Pide el catalogo completo de ejercicios. */
async function obtenerCatalogo() {
  const lista = await ejecutar((supabase) =>
    supabase.from('ejercicio').select('id_ejercicio, titulo, instrucciones, orden, duracion_segundos, pasos, repeticiones').order('orden')
  );

  const ejercicios = (lista || []).map((ejercicio, indice) => ({
    ...ejercicio,
    posicion: indice + 1,
    total: lista.length,
  }));

  return { ok: true, datos: { ejercicios } };
}

/** Comprueba si Supabase responde. */
async function verificarServidor() {
  try {
    const respuesta = await fetchConEspera(`${config.supabaseUrl}/auth/v1/health`, {
      headers: { apikey: config.supabaseAnonKey },
    });
    return { disponible: respuesta.ok };
  } catch (error) {
    return { disponible: false };
  }
}

/** Verifica con el servidor que la sesion guardada siga siendo valida. */
async function verificarSesion() {
  await usuarioDeLaSesion();
  const datos = await ejecutar((supabase) => supabase.auth.getUser());
  return aUsuario(datos.user);
}

/** Sube los cambios guardados sin conexion (RNF-05), sin avisar al usuario. */
async function sincronizarCambiosPendientes() {
  const local = copiaLocal.leerConfiguracion();
  if (!local || !local.cambio_pendiente) return false;

  const { cambio_pendiente, ...configuracion } = local;
  const respuesta = await guardarConfiguracion(configuracion);
  copiaLocal.guardarConfiguracion(respuesta.datos.configuracion);
  return true;
}

// La sesion la maneja Supabase: estas operaciones no hacen nada.
function fijarToken() {}
function leerToken() {
  return MARCA_SESION;
}
async function detectarServidor() {
  return config.supabaseUrl || null;
}

module.exports = {
  ErrorComunicacion,
  registrar,
  iniciarSesion,
  cerrarSesion,
  obtenerConfiguracion,
  guardarConfiguracion,
  obtenerSiguienteEjercicio,
  obtenerCatalogo,
  verificarServidor,
  verificarSesion,
  sincronizarCambiosPendientes,
  detectarServidor,
  fijarToken,
  leerToken,
};
