'use strict';

/**
 * Error de validacion: la peticion del usuario es incorrecta.
 * Se responde con codigo 400 y el mensaje va dirigido al usuario final.
 */
class ErrorValidacion extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorValidacion';
    this.codigo = 400;
  }
}

module.exports = ErrorValidacion;
