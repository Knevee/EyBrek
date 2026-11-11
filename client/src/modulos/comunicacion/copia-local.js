'use strict';

/**
 * MODULO: Comunicacion y copia local (cliente) - Copia local
 * Oculta: donde se guardan los archivos y con que formato.
 *
 * Guarda en el equipo del usuario:
 *  - la ultima configuracion descargada del servidor (RF-15)
 *  - la sesion activa, para poder volver a entrar sin pedir la contrasena
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const ARCHIVO_CONFIGURACION = 'config-local.json';
const ARCHIVO_SESION = 'sesion-local.json';
const ARCHIVO_EJERCICIO = 'ejercicio-local.json';
const ARCHIVO_AJUSTES = 'ajustes-local.json';
const ARCHIVO_CATALOGO = 'catalogo-local.json';
const ARCHIVO_BLOQUEO = 'bloqueo-en-curso.json';

function rutaArchivo(nombre) {
  return path.join(app.getPath('userData'), nombre);
}

function escribir(nombre, datos) {
  try {
    fs.writeFileSync(rutaArchivo(nombre), JSON.stringify(datos, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`[copia-local] No se pudo escribir ${nombre}:`, error.message);
    return false;
  }
}

function leer(nombre) {
  try {
    const ruta = rutaArchivo(nombre);
    if (!fs.existsSync(ruta)) return null;
    // Se quita el BOM por si el archivo fue escrito con PowerShell.
    const contenido = fs.readFileSync(ruta, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(contenido);
  } catch (error) {
    console.error(`[copia-local] No se pudo leer ${nombre}:`, error.message);
    return null;
  }
}

function borrar(nombre) {
  try {
    const ruta = rutaArchivo(nombre);
    if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
  } catch (error) {
    console.error(`[copia-local] No se pudo borrar ${nombre}:`, error.message);
  }
}

// ---- Configuracion (RF-15) ------------------------------------------

/** Guarda una copia local de la configuracion. */
function guardarConfiguracion(configuracion) {
  return escribir(ARCHIVO_CONFIGURACION, configuracion);
}

/** Lee la copia local de la configuracion (null si no existe). */
function leerConfiguracion() {
  return leer(ARCHIVO_CONFIGURACION);
}

// ---- Sesion ----------------------------------------------------------

/** Guarda la sesion activa (token) en el equipo. */
function guardarSesion(sesion) {
  return escribir(ARCHIVO_SESION, sesion);
}

/** Lee la sesion guardada en el equipo (null si no existe). */
function leerSesion() {
  return leer(ARCHIVO_SESION);
}

/** Borra la sesion guardada (cierre de sesion). */
function borrarSesion() {
  borrar(ARCHIVO_SESION);
}

// ---- Ultimo ejercicio mostrado ---------------------------------------

/** Guarda el ultimo ejercicio mostrado, para usarlo sin servidor. */
function guardarUltimoEjercicio(ejercicio) {
  if (!ejercicio) return false;
  return escribir(ARCHIVO_EJERCICIO, ejercicio);
}

/** Lee el ultimo ejercicio mostrado (null si no hay). */
function leerUltimoEjercicio() {
  return leer(ARCHIVO_EJERCICIO);
}

// ---- Catalogo de ejercicios -----------------------------------------

/** Guarda el catalogo, para seguir la rotacion sin servidor. */
function guardarCatalogo(catalogo) {
  if (!Array.isArray(catalogo) || catalogo.length === 0) return false;
  return escribir(ARCHIVO_CATALOGO, catalogo);
}

/** Lee el catalogo guardado (null si no hay). */
function leerCatalogo() {
  return leer(ARCHIVO_CATALOGO);
}

// ---- Bloqueo en curso ------------------------------------------------
// Si EyBrek se cierra a la fuerza durante un descanso, este archivo
// permite retomarlo al volver a abrirse (lo usa tambien el vigilante).

/** Ruta del archivo del bloqueo en curso. */
function rutaBloqueoEnCurso() {
  return rutaArchivo(ARCHIVO_BLOQUEO);
}

/** Guarda los datos del bloqueo que esta en curso. */
function guardarBloqueoEnCurso(datos) {
  return escribir(ARCHIVO_BLOQUEO, datos);
}

/** Lee el bloqueo en curso (null si no hay). */
function leerBloqueoEnCurso() {
  return leer(ARCHIVO_BLOQUEO);
}

/** Borra el bloqueo en curso: el descanso termino. */
function borrarBloqueoEnCurso() {
  borrar(ARCHIVO_BLOQUEO);
}

// ---- Ajustes locales de la pantalla ----------------------------------

/** Guarda un ajuste local (por ejemplo, mostrar consejos). */
function guardarAjuste(clave, valor) {
  const ajustes = leer(ARCHIVO_AJUSTES) || {};
  ajustes[clave] = valor;
  return escribir(ARCHIVO_AJUSTES, ajustes);
}

/** Lee un ajuste local. */
function leerAjuste(clave, valorPorDefecto = null) {
  const ajustes = leer(ARCHIVO_AJUSTES) || {};
  return ajustes[clave] === undefined ? valorPorDefecto : ajustes[clave];
}

module.exports = {
  guardarConfiguracion,
  leerConfiguracion,
  guardarSesion,
  leerSesion,
  borrarSesion,
  guardarUltimoEjercicio,
  leerUltimoEjercicio,
  guardarCatalogo,
  leerCatalogo,
  rutaBloqueoEnCurso,
  guardarBloqueoEnCurso,
  leerBloqueoEnCurso,
  borrarBloqueoEnCurso,
  guardarAjuste,
  leerAjuste,
};
