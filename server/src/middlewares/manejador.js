'use strict';

/**
 * Middleware: manejador de funciones asincronas.
 * Evita repetir try/catch en cada controlador.
 */

function manejador(funcion) {
  return (peticion, respuesta, siguiente) =>
    Promise.resolve(funcion(peticion, respuesta, siguiente)).catch(siguiente);
}

module.exports = manejador;
