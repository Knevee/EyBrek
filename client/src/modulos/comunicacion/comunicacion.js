'use strict';

/**
 * MODULO: Comunicacion y copia local (cliente)
 * Unico punto del cliente que habla con el servidor.
 *
 * Elige el servidor segun "modo" en config.json:
 *   "supabase" -> servidor en la nube (supabase.js)
 *   "local"    -> servidor propio en la red local (servidor-local.js)
 *
 * Los dos ofrecen las mismas operaciones: registrar, iniciarSesion,
 * cerrarSesion, obtenerConfiguracion, guardarConfiguracion,
 * obtenerSiguienteEjercicio, obtenerCatalogo, verificarServidor,
 * verificarSesion y sincronizarCambiosPendientes.
 */

const config = require('../../config.json');

module.exports =
  config.modo === 'supabase' ? require('./supabase') : require('./servidor-local');
