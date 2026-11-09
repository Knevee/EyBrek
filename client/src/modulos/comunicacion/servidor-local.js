'use strict';

/**
 * MODULO: Comunicacion y copia local (cliente) - Servidor local
 * Habla con el servidor propio (Node.js + Express) por HTTP y JSON.
 * Oculta: la direccion del servidor, el token de sesion y el formato
 * de las peticiones.
 *
 * Operaciones que ofrece:
 *   registrar, iniciarSesion, cerrarSesion,
 *   obtenerConfiguracion, guardarConfiguracion,
 *   obtenerSiguienteEjercicio, obtenerCatalogo, verificarServidor
 *
 * DETECCION DEL SERVIDOR
 * El cliente no sabe de entrada que servidor usar. Al arrancar prueba las
 * direcciones configuradas, se queda con la que responde y la recuerda.
 * Asi el usuario no tiene que configurar nada y la app no se queda
 * esperando cuando un servidor no existe.
 */

const config = require('../../config.json');
const copiaLocal = require('./copia-local');

let token = null;
let servidorActivo = null;

const ErrorComunicacion = require('./error-comunicacion');

/** Devuelve la lista de direcciones candidatas, en orden de preferencia. */
function candidatos() {
  const lista = [];

  // El servidor que funciono la ultima vez se prueba primero.
  const recordado = copiaLocal.leerAjuste('servidor');
  if (recordado) lista.push(recordado);

  for (const direccion of [
    config.servidorUrl,
    config.servidorUrlAlternativo,
    config.servidorUrlRespaldo,
  ]) {
    if (direccion && !lista.includes(direccion)) lista.push(direccion);
  }

  return lista;
}

/**
 * Busca un servidor que responda y lo recuerda.
 * @returns {Promise<string|null>} La direccion que respondio, o null.
 */
async function detectarServidor() {
  for (const direccion of candidatos()) {
    try {
      const respuesta = await fetch(`${direccion}/salud`, {
        signal: AbortSignal.timeout(config.tiempoEsperaDeteccionMs || 2000),
      });

      if (respuesta.ok) {
        servidorActivo = direccion;
        copiaLocal.guardarAjuste('servidor', direccion);
        return direccion;
      }
    } catch (error) {
      // Esta direccion no responde: se prueba la siguiente.
    }
  }

  servidorActivo = null;
  return null;
}

/**
 * Realiza una peticion HTTP al servidor.
 * Si el servidor activo deja de responder, se busca otro y se reintenta.
 */
async function peticion(metodo, ruta, cuerpo, reintentar = true) {
  if (!servidorActivo) {
    await detectarServidor();
  }

  if (!servidorActivo) {
    throw new ErrorComunicacion('No se pudo conectar con el servidor de EyBrek.', true);
  }

  const cabeceras = { 'Content-Type': 'application/json' };
  if (token) cabeceras.Authorization = `Bearer ${token}`;

  const opciones = {
    method: metodo,
    headers: cabeceras,
    signal: AbortSignal.timeout(config.tiempoEsperaPeticionMs || 8000),
  };
  if (cuerpo !== undefined) opciones.body = JSON.stringify(cuerpo);

  let respuesta;
  try {
    respuesta = await fetch(`${servidorActivo}${ruta}`, opciones);
  } catch (error) {
    // El servidor activo dejo de responder: se busca otro y se reintenta.
    servidorActivo = null;

    if (reintentar) {
      await detectarServidor();
      if (servidorActivo) return peticion(metodo, ruta, cuerpo, false);
    }

    throw new ErrorComunicacion('No se pudo conectar con el servidor de EyBrek.', true);
  }

  const texto = await respuesta.text();
  let datos = {};

  try {
    datos = texto ? JSON.parse(texto) : {};
  } catch (error) {
    datos = {};
  }

  if (!respuesta.ok) {
    const error = new Error(datos.error || `El servidor respondio ${respuesta.status}.`);
    error.codigo = respuesta.status;
    throw error;
  }

  return datos;
}

/** Guarda el token de la sesion activa. */
function fijarToken(nuevoToken) {
  token = nuevoToken || null;
}

function leerToken() {
  return token;
}

// ---- Operaciones ------------------------------------------------------

/** Registra una cuenta nueva (RF-01). */
async function registrar(nombre, correo, contrasena) {
  return peticion('POST', '/auth/registro', { nombre, correo, contrasena });
}

/** Inicia sesion y guarda el token (RF-03). */
async function iniciarSesion(correo, contrasena) {
  const datos = await peticion('POST', '/auth/iniciar-sesion', { correo, contrasena });
  fijarToken(datos.datos.token);
  return datos;
}

/** Cierra la sesion (RF-04). */
async function cerrarSesion() {
  try {
    return await peticion('POST', '/auth/cerrar-sesion');
  } finally {
    fijarToken(null);
  }
}

/** Descarga la configuracion del usuario (RF-13, RF-14). */
async function obtenerConfiguracion() {
  return peticion('GET', '/configuracion');
}

/** Envia la configuracion al servidor (RF-10). */
async function guardarConfiguracion(configuracion) {
  return peticion('PUT', '/configuracion', configuracion);
}

/** Pide el siguiente ejercicio de la rotacion (RF-20, RF-21). */
async function obtenerSiguienteEjercicio() {
  return peticion('GET', '/ejercicios/siguiente');
}

/** Pide el catalogo completo de ejercicios. */
async function obtenerCatalogo() {
  return peticion('GET', '/ejercicios');
}

/** Comprueba si el servidor esta disponible. */
async function verificarServidor() {
  const direccion = await detectarServidor();
  return { disponible: Boolean(direccion) };
}

/** Verifica que el token guardado siga siendo valido (RF-14). */
async function verificarSesion() {
  const datos = await peticion('GET', '/auth/sesion');
  return datos.datos.usuario;
}

/**
 * Sube al servidor los cambios que se guardaron mientras no habia
 * conexion. Se hace en silencio: el usuario no se entera.
 */
async function sincronizarCambiosPendientes() {
  const local = copiaLocal.leerConfiguracion();

  if (!local || !local.cambio_pendiente) return false;

  const { cambio_pendiente, ...configuracion } = local;
  const respuesta = await peticion('PUT', '/configuracion', configuracion);
  const guardada = respuesta.datos.configuracion;

  copiaLocal.guardarConfiguracion(guardada);
  return true;
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
