'use strict';

/**
 * Middleware: exige una sesion valida.
 * Lee el token de la cabecera Authorization y lo resuelve contra la base.
 * Deja en peticion.idUsuario el usuario de la sesion.
 */

const manejador = require('./manejador');
const sesiones = require('../modulos/acceso-a-datos/sesiones');
const ErrorNoAutorizado = require('../errores/ErrorNoAutorizado');

/**
 * El token solo se acepta en la cabecera: en la URL quedaria escrito en
 * los registros del servidor.
 */
function leerToken(peticion) {
  const cabecera = peticion.headers.authorization || '';
  if (cabecera.startsWith('Bearer ')) {
    return cabecera.slice(7).trim() || null;
  }
  return null;
}

const requiereSesion = manejador(async (peticion, _respuesta, siguiente) => {
  const token = leerToken(peticion);

  if (!token) {
    throw new ErrorNoAutorizado('No hay una sesion iniciada.');
  }

  const sesion = await sesiones.leerPorToken(token);

  if (!sesion) {
    throw new ErrorNoAutorizado('La sesion no es valida o ya se cerro.');
  }

  peticion.sesion = sesion;
  peticion.idUsuario = sesion.id_usuario;
  siguiente();
});

module.exports = requiereSesion;
module.exports.leerToken = leerToken;
