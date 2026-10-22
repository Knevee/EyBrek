'use strict';

/**
 * Error de autorizacion: no hay sesion valida o el token no corresponde.
 * Se responde con codigo 401.
 */
class ErrorNoAutorizado extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorNoAutorizado';
    this.codigo = 401;
  }
}

module.exports = ErrorNoAutorizado;
