'use strict';

/**
 * Middleware: limita los intentos fallidos de inicio de sesion.
 * Evita que alguien pruebe contrasenas sin parar contra una cuenta.
 *
 * Cuenta los fallos por equipo (IP) y correo dentro de una ventana de
 * tiempo. Un inicio de sesion correcto borra el conteo. Los datos viven
 * en memoria: el servidor atiende a pocos usuarios de la red local.
 */

const entorno = require('../config/entorno');

const fallos = new Map();

function clave(peticion) {
  const correo = String((peticion.body && peticion.body.correo) || '').trim().toLowerCase();
  return `${peticion.ip}|${correo}`;
}

function limitarIntentos(peticion, respuesta, siguiente) {
  const ahora = Date.now();
  const ventanaMs = entorno.intentos.ventanaMinutos * 60 * 1000;
  const llave = clave(peticion);

  let registro = fallos.get(llave);
  if (registro && ahora - registro.desde > ventanaMs) {
    fallos.delete(llave);
    registro = null;
  }

  if (registro && registro.cantidad >= entorno.intentos.maximo) {
    const minutos = Math.ceil((registro.desde + ventanaMs - ahora) / 60000);
    respuesta.status(429).json({
      ok: false,
      error: `Demasiados intentos fallidos. Vuelve a intentarlo en ${minutos} min.`,
    });
    return;
  }

  respuesta.on('finish', () => {
    if (respuesta.statusCode < 400) {
      fallos.delete(llave);
      return;
    }
    const actual = fallos.get(llave) || { cantidad: 0, desde: Date.now() };
    actual.cantidad += 1;
    fallos.set(llave, actual);
  });

  siguiente();
}

/** Borra todos los conteos (se usa en las pruebas). */
limitarIntentos.reiniciar = () => fallos.clear();

module.exports = limitarIntentos;
