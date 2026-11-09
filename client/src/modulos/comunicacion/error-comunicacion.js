'use strict';

/**
 * Error de comunicacion: el servidor no respondio o no esta disponible.
 * Con sinConexion = true el cliente sigue con la copia local (RNF-05).
 */
class ErrorComunicacion extends Error {
  constructor(mensaje, sinConexion = false) {
    super(mensaje);
    this.name = 'ErrorComunicacion';
    this.codigo = sinConexion ? 0 : 500;
    this.sinConexion = sinConexion;
  }
}

module.exports = ErrorComunicacion;
