'use strict';

/**
 * MODULO: Acceso a datos - Sesion
 * Oculta el formato del token y la tabla donde se guardan las sesiones.
 */

const crypto = require('crypto');
const db = require('../../db/conexion');
const { ahora } = require('../../db/tiempo');

/** Genera un token aleatorio e irrepetible. */
function generarToken() {
  return `${crypto.randomUUID()}.${crypto.randomBytes(32).toString('hex')}`;
}

/** Crea la sesion de un usuario en un equipo. */
async function crear(idUsuario) {
  const token = generarToken();
  const fechaInicio = ahora();

  const resultado = await db.ejecutar(
    'INSERT INTO Sesion (id_usuario, token, fecha_inicio) VALUES (?, ?, ?)',
    [idUsuario, token, fechaInicio]
  );

  return {
    id_sesion: resultado.id,
    id_usuario: idUsuario,
    token,
    fecha_inicio: fechaInicio,
  };
}

/** Busca la sesion activa de un token. */
async function leerPorToken(token) {
  const filas = await db.consultar(
    `SELECT s.id_sesion, s.id_usuario, s.token, s.fecha_inicio,
            u.nombre, u.correo
       FROM Sesion s
       JOIN Usuario u ON u.id_usuario = s.id_usuario
      WHERE s.token = ?`,
    [token]
  );
  return filas[0] || null;
}

/** Cierra una sesion (RF-04). */
async function cerrar(token) {
  const resultado = await db.ejecutar('DELETE FROM Sesion WHERE token = ?', [token]);
  return resultado.cambios > 0;
}

/** Cierra todas las sesiones de un usuario. */
async function cerrarTodas(idUsuario) {
  await db.ejecutar('DELETE FROM Sesion WHERE id_usuario = ?', [idUsuario]);
}

module.exports = { crear, leerPorToken, cerrar, cerrarTodas };
