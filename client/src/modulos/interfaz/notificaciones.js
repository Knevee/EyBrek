'use strict';

/**
 * MODULO: Interfaz de usuario (cliente) - Avisos
 * Responsabilidad: mostrar los avisos del sistema al usuario.
 * Operacion que ofrece: mostrarAviso(mensaje).
 */

const { Notification } = require('electron');

/**
 * Muestra una notificacion del sistema.
 * @param {string} mensaje  Texto del aviso.
 * @param {string} titulo   Titulo de la notificacion.
 */
function mostrarAviso(mensaje, titulo = 'EyBrek') {
  if (!Notification.isSupported()) {
    console.log(`[aviso] ${titulo}: ${mensaje}`);
    return false;
  }

  new Notification({ title: titulo, body: mensaje }).show();
  return true;
}

module.exports = { mostrarAviso };
